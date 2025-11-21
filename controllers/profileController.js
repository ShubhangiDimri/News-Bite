const logger = require('../utils/logging');
const User = require('../models/User');

// View user profile by username
exports.viewProfile = async (req, res) => {
  let { username } = req.params;

  if (!username) {
    username = req.user.username; // Default to logged-in user's username
  }

  logger.info('View profile attempt', { username });

  try {
    const user = await User.findOne({ username }).select('_id username bio_data photo');

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
        bio_data: user.bio_data,
        profileImage: user.photo
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
  const username = req.user.username; // Use username from authenticated user
  const { bio_data } = req.body;

  logger.info('Edit profile attempt', { username });

  try {
    // Validate that bio_data field is provided (can be empty string)
    if (bio_data === undefined) {
      logger.error('Edit profile failed - no valid fields provided', { username });
      return res.status(400).json({ 
        message: "At least one updatable field (bio_data) must be provided" 
      });
    }

    // Find and update user by username (more secure than using ID)
    const user = await User.findOneAndUpdate(
      { username },
      { bio_data },
      { 
        new: true, // Return updated document
        select: '_id username bio_data' // Only return these fields
      }
    );

    if (!user) {
      logger.warn('Edit profile failed - user not found', { username });
      return res.status(404).json({ message: "User not found" });
    }

    logger.info('Edit profile successful', {
      username,
      updatedFields: ['bio_data']
    });

    // Return consistent minimal user structure
    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        bio_data: user.bio_data
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
    const user = await User.findById(userId).select('_id username bio_data');

    if (!user) {
      logger.warn('Current profile failed - user not found', { userId });
      return res.status(404).json({ message: "User not found" });
    }

    logger.info('Current profile fetched successfully', { userId });

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        bio_data: user.bio_data
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
