const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const News = require('../models/News');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Toggle like/unlike
exports.toggleLike = async (req, res) => {
  const { news_id } = req.body;
  const userId = req.user.userId;
  const username = req.user.username;

  logger.info('Like/unlike attempt', { news_id, username });

  if (!news_id) {
    return res.status(400).json({ message: "news_id is required" });
  }

  try {
    // Ensure news exists first
    const newsItem = await News.findById(news_id);
    if (!newsItem) {
      return res.status(404).json({ message: "News not found" });
    }

    let userNews = await UserNews.findOne({ news_id, username });

    // Create new UserNews record if it doesn't exist
    if (!userNews) {
      userNews = new UserNews({
        news_id,
        username
      });
    }

    // Check if already liked
    const isLiked = userNews.likes > 0 ? true : false;

    if (isLiked) {
      userNews.likes = 0;
      logger.info('Like toggled OFF', { news_id, username });
    } else {
      userNews.likes = 1;
      logger.info('Like toggled ON', { news_id, username });
    }

    await userNews.save();

    await Activity.create({
      userId: userId,
      username: username,
      action: 'news.like',
      news_id,
      meta: { liked: !isLiked }
    });

    // Update total likes in News model
    newsItem.likes = (newsItem.likes || 0) + (isLiked ? -1 : 1);
    if (newsItem.likes < 0) newsItem.likes = 0; // Prevent negative likes
    await newsItem.save();
    logger.info('Updated totalLikes', { news_id, totalLikes: newsItem.likes });

    res.status(200).json({
      message: isLiked ? "Like removed" : "News liked",
      isLiked: !isLiked,
      totalLikes: newsItem.likes
    });
  } catch (error) {
    logger.error('Like operation failed', {
      error: error.message,
      stack: error.stack,
      news_id,
      username
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get likes count for a news
exports.getLikesCount = async (req, res) => {
  const { news_id } = req.params;

  logger.info('Fetching likes count', { news_id });

  try {
    const newsItem = await News.findOne({ news_id }).select('likes');

    if (!newsItem) {
      logger.warn('Likes fetch failed - news not found', { news_id });
      return res.status(404).json({ message: "News not found" });
    }

    logger.info('Likes count fetched successfully', {
      news_id,
      totalLikes: newsItem.likes || 0
    });

    res.status(200).json({
      news_id,
      totalLikes: newsItem.likes || 0
    });
  } catch (error) {
    logger.error('Likes fetch error', {
      error: error.message,
      stack: error.stack,
      news_id
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
