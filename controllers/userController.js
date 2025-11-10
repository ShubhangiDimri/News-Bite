const logger = require("../utils/logging");
const UserNews = require("../models/UserNews");
const User = require("../models/User");

// User activity endpoint - kept here for user-specific activity tracking
exports.activity = async (req, res) => {
  const userId = req.user.userId;
  
  logger.info('Fetch user activity', { userId });

  try {
    const user = await User.findById(userId).select("username");
    if (!user?.username) {
      logger.warn('Activity fetch failed - user not found', { userId });
      return res.status(404).json({ message: "User not found" });
    }

    const userNews = await UserNews.find({ username: user.username })
      .select("news_id comments likes bookmarked createdAt");

    if (!userNews || userNews.length === 0) {
      logger.info('No activity found for user', { userId });
      return res.status(200).json({ activity: [] });
    }

    logger.info('User activity fetched successfully', {
      userId,
      newsItemsWithActivity: userNews.length
    });

    res.status(200).json({ activity: userNews });
  } catch (error) {
    logger.error('Activity fetch error', {
      error: error.message,
      stack: error.stack,
      userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};