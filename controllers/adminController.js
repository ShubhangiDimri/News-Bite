const mongoose = require('mongoose');
const logger = require('../utils/logging');
const User = require('../models/User');
const Activity = require('../models/Activity');
const UserNews = require('../models/UserNews');
const News = require('../models/News');

// Get all users with pagination and filtering
exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  logger.info('getAllUsers attempt', { adminId: req.user.userId, page: pageNum, limit: limitNum, status, search });

  try {
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.username = { $regex: search, $options: 'i' };
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ lastLogin: -1 });

    logger.info('getAllUsers success', { adminId: req.user.userId, total, returned: users.length });

    res.status(200).json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      users
    });
  } catch (error) {
    logger.error('getAllUsers error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user activity history with summary
exports.getUserActivity = async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  logger.info('getUserActivity attempt', { adminId: req.user.userId, targetUsername: username, page: pageNum });

  try {
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      logger.warn('getUserActivity failed - user not found', { adminId: req.user.userId, targetUsername: username });
      return res.status(404).json({ message: "User not found" });
    }

    const total = await Activity.countDocuments({ username });
    
    const activities = await Activity.find({ username })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Get action summary (top 5 actions)
    const actionSummary = await Activity.aggregate([
      { $match: { username } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    logger.info('getUserActivity success', { adminId: req.user.userId, targetUsername: username, returned: activities.length });

    res.status(200).json({
      username,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      activities,
      actionSummary
    });
  } catch (error) {
    logger.error('getUserActivity error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Suspend user account
exports.suspendUser = async (req, res) => {
  const { id } = req.params;
  const { until, reason } = req.body;
  const adminId = req.user.userId;

  logger.info('suspendUser attempt', { adminId, targetUserId: id, reason });

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('suspendUser validation failed - invalid userId', { adminId, targetUserId: id });
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Prevent self-suspension
    if (id === adminId.toString()) {
      logger.warn('suspendUser blocked - admin attempted self-suspension', { adminId });
      return res.status(400).json({ message: "Cannot suspend yourself" });
    }

    const user = await User.findById(id);
    if (!user) {
      logger.warn('suspendUser failed - user not found', { adminId, targetUserId: id });
      return res.status(404).json({ message: "User not found" });
    }

    const suspendedUntil = until ? new Date(until) : null;
    user.status = 'suspended';
    user.suspendedUntil = suspendedUntil;
    await user.save();

    // Create activity log
    await Activity.create({
      userId: adminId,
      username: req.user.username,
      action: 'admin.suspend',
      targetId: id,
      meta: { reason: reason || null, until: suspendedUntil, targetUsername: user.username, adminId }
    });

    logger.info('suspendUser success', { adminId, targetUserId: id, targetUsername: user.username });

    res.status(200).json({
      message: "User suspended successfully",
      user: {
        _id: user._id,
        username: user.username,
        status: user.status,
        suspendedUntil: user.suspendedUntil
      }
    });
  } catch (error) {
    logger.error('suspendUser error', {
      error: error.message,
      stack: error.stack,
      adminId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Unsuspend user account
exports.unsuspendUser = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.userId;

  logger.info('unsuspendUser attempt', { adminId, targetUserId: id });

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('unsuspendUser validation failed - invalid userId', { adminId, targetUserId: id });
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      logger.warn('unsuspendUser failed - user not found', { adminId, targetUserId: id });
      return res.status(404).json({ message: "User not found" });
    }

    user.status = 'active';
    user.suspendedUntil = null;
    await user.save();

    // Create activity log
    await Activity.create({
      userId: adminId,
      username: req.user.username,
      action: 'admin.unsuspend',
      targetId: id,
      meta: { targetUsername: user.username, adminId }
    });

    logger.info('unsuspendUser success', { adminId, targetUserId: id, targetUsername: user.username });

    res.status(200).json({
      message: "User unsuspended successfully",
      user: {
        _id: user._id,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    logger.error('unsuspendUser error', {
      error: error.message,
      stack: error.stack,
      adminId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Soft delete user (mark as deleted, keep data for audit)
exports.softDeleteUser = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user.userId;

  logger.info('softDeleteUser attempt', { adminId, targetUserId: id, reason });

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('softDeleteUser validation failed - invalid userId', { adminId, targetUserId: id });
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Prevent self-deletion
    if (id === adminId.toString()) {
      logger.warn('softDeleteUser blocked - admin attempted self-deletion', { adminId });
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const user = await User.findById(id);
    if (!user) {
      logger.warn('softDeleteUser failed - user not found', { adminId, targetUserId: id });
      return res.status(404).json({ message: "User not found" });
    }

    user.status = 'deleted';
    user.deletedAt = new Date();
    await user.save();

    // Create activity log
    await Activity.create({
      userId: adminId,
      username: req.user.username,
      action: 'admin.softDelete',
      targetId: id,
      meta: { reason: reason || null, targetUsername: user.username, adminId }
    });

    logger.info('softDeleteUser success', { adminId, targetUserId: id, targetUsername: user.username });

    res.status(200).json({
      message: "User soft deleted successfully",
      userId: user._id
    });
  } catch (error) {
    logger.error('softDeleteUser error', {
      error: error.message,
      stack: error.stack,
      adminId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Permanent delete user from database
exports.permanentDeleteUser = async (req, res) => {
  const { id } = req.params;
  const { confirm } = req.body;
  const adminId = req.user.userId;

  logger.info('permanentDeleteUser attempt', { adminId, targetUserId: id });

  try {
    // Require confirmation
    if (!confirm) {
      logger.warn('permanentDeleteUser blocked - no confirmation', { adminId, targetUserId: id });
      return res.status(400).json({ message: "Permanent deletion requires confirmation. Send { confirm: true } in request body." });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('permanentDeleteUser validation failed - invalid userId', { adminId, targetUserId: id });
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Prevent self-deletion
    if (id === adminId.toString()) {
      logger.warn('permanentDeleteUser blocked - admin attempted self-deletion', { adminId });
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const user = await User.findById(id);
    if (!user) {
      logger.warn('permanentDeleteUser failed - user not found', { adminId, targetUserId: id });
      return res.status(404).json({ message: "User not found" });
    }

    const targetUsername = user.username;
    const userId = user._id;

    // Anonymize comments in UserNews
    await UserNews.updateMany(
      { 'comments.userId': userId },
      {
        $set: {
          'comments.$[elem].userId': null,
          'comments.$[elem].username': 'deleted_user'
        }
      },
      { arrayFilters: [{ 'elem.userId': userId }] }
    );

    // Anonymize replies in UserNews
    await UserNews.updateMany(
      { 'comments.replies.userId': userId },
      {
        $set: {
          'comments.$[].replies.$[reply].userId': null,
          'comments.$[].replies.$[reply].username': 'deleted_user'
        }
      },
      { arrayFilters: [{ 'reply.userId': userId }] }
    );

    // Create activity log before deletion
    await Activity.create({
      userId: adminId,
      username: req.user.username,
      action: 'admin.permanentDelete',
      targetId: id,
      meta: { confirm: true, targetUsername, adminId }
    });

    // Delete user
    await User.findByIdAndDelete(id);

    logger.info('permanentDeleteUser success', { adminId, targetUserId: id, targetUsername });

    res.status(200).json({
      message: "User permanently deleted successfully",
      userId: id
    });
  } catch (error) {
    logger.error('permanentDeleteUser error', {
      error: error.message,
      stack: error.stack,
      adminId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get registration statistics
exports.registrationStats = async (req, res) => {
  const { days = 30 } = req.query;
  const daysNum = parseInt(days);
  const adminId = req.user.userId;

  logger.info('registrationStats attempt', { adminId, days: daysNum });

  try {
    // Get ALL users (not filtered by date range yet)
    const users = await User.find({
      createdAt: { $exists: true }
    }).select('createdAt');

    // Group by date in JavaScript (using LOCAL date, not UTC)
    const dateMap = {};
    users.forEach(user => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        // Convert to local date string (YYYY-MM-DD)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
      }
    });

    // Fill in the last N days with counts (from oldest to newest)
    const result = [];
    const today = new Date();
    // Don't set hours - keep the local time to get correct local date

    // Start from N days ago
    for (let i = daysNum - 1; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      result.push({
        date: dateStr,
        count: dateMap[dateStr] || 0
      });
    }

    const totalRegistrations = await User.countDocuments();
    const periodRegistrations = Object.values(dateMap).reduce((acc, count) => acc + count, 0);

    logger.info('registrationStats success', { adminId, days: daysNum, totalRegistrations });

    res.status(200).json({
      days: daysNum,
      registrationStats: result,
      totalRegistrations,
      periodRegistrations
    });
  } catch (error) {
    logger.error('registrationStats error', {
      error: error.message,
      stack: error.stack,
      adminId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllUsers: exports.getAllUsers,
  getUserActivity: exports.getUserActivity,
  suspendUser: exports.suspendUser,
  unsuspendUser: exports.unsuspendUser,
  softDeleteUser: exports.softDeleteUser,
  permanentDeleteUser: exports.permanentDeleteUser,
  registrationStats: exports.registrationStats
};
