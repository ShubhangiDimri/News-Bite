const logger = require('../utils/logging');
const User = require('../models/User');

// View user profile
exports.viewProfile = async (req, res) => {
  const { username } = req.params;

  logger.info('View profile attempt', { username, requestedBy: req.user.userId });

  try {
    const user = await User.findOne({ username }).select('-password');

    if (!user) {
      logger.warn('View profile failed - user not found', { username });
      return res.status(404).json({ message: "User not found" });
    }

    logger.info('View profile successful', { username });

    res.status(200).json({
      message: "Profile retrieved",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio || null,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('View profile error', {
      error: error.message,
      stack: error.stack,
      username,
      userId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Edit user profile
exports.editProfile = async (req, res) => {
  const userId = req.user.userId;
  const { bio, email } = req.body;

  logger.info('Edit profile attempt', { userId });

  try {
    const updateData = {};
    
    if (bio !== undefined) updateData.bio = bio;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      logger.warn('Edit profile failed - no valid fields to update', { userId });
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      logger.warn('Edit profile failed - user not found', { userId });
      return res.status(404).json({ message: "User not found" });
    }

    logger.info('Edit profile successful', {
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio || null
      }
    });
  } catch (error) {
    logger.error('Edit profile error', {
      error: error.message,
      stack: error.stack,
      userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get current user's profile
exports.getCurrentProfile = async (req, res) => {
  const userId = req.user.userId;

  logger.info('Fetch current profile', { userId });

  try {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      logger.warn('Current profile failed - user not found', { userId });
      return res.status(404).json({ message: "User not found" });
    }

    logger.info('Current profile fetched successfully', { userId });

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio || null,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get current profile error', {
      error: error.message,
      stack: error.stack,
      userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
