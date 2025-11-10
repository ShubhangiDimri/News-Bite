const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const News = require('../models/News');
const User = require('../models/User');

// Toggle like/unlike
exports.toggleLike = async (req, res) => {
  const { newsId } = req.body;
  const userId = req.user.userId;

  logger.info('Like/unlike attempt', { newsId, userId });

  if (!newsId) {
    logger.warn('Like validation failed - missing newsId', { userId });
    return res.status(400).json({ message: "newsId is required" });
  }

  try {
    const user = await User.findById(userId).select("username");
    if (!user) {
      logger.warn('Like failed - user not found', { userId, newsId });
      return res.status(404).json({ message: "User not found" });
    }

    let userNews = await UserNews.findOne({ news_id: newsId });
    if (!userNews) {
      userNews = new UserNews({ news_id: newsId });
    }

    const isLiked = userNews.likes ? true : false;

    if (isLiked) {
      userNews.likes = false;
      logger.info('Like toggled OFF', { newsId, userId, username: user.username });
    } else {
      userNews.likes = true;
      logger.info('Like toggled ON', { newsId, userId, username: user.username });
    }

    await userNews.save();

    // Update total likes in News model
    const newsItem = await News.findOne({ news_id: newsId });
    if (newsItem) {
      newsItem.likes = (newsItem.likes || 0) + (isLiked ? -1 : 1);
      await newsItem.save();
      logger.info('Updated totalLikes', { newsId, totalLikes: newsItem.likes });
    }

    res.status(200).json({
      message: isLiked ? "Like removed" : "News liked",
      isLiked: !isLiked,
      totalLikes: newsItem?.likes || 0
    });
  } catch (error) {
    logger.error('Like operation failed', {
      error: error.message,
      stack: error.stack,
      newsId,
      userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get likes count for a news
exports.getLikesCount = async (req, res) => {
  const { newsId } = req.params;

  logger.info('Fetching likes count', { newsId });

  try {
    const newsItem = await News.findOne({ news_id: newsId }).select('likes');

    if (!newsItem) {
      logger.warn('Likes fetch failed - news not found', { newsId });
      return res.status(404).json({ message: "News not found" });
    }

    logger.info('Likes count fetched successfully', {
      newsId,
      totalLikes: newsItem.likes || 0
    });

    res.status(200).json({
      newsId,
      totalLikes: newsItem.likes || 0
    });
  } catch (error) {
    logger.error('Likes fetch error', {
      error: error.message,
      stack: error.stack,
      newsId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
