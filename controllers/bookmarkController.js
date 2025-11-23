const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Toggle bookmark
exports.toggleBookmark = async (req, res) => {
  const { news_id } = req.body;
  const userId = req.user.userId;

  logger.info('Bookmark toggle attempt', { news_id, userId });

  if (!news_id) {
    logger.warn('Bookmark validation failed - missing news_id', { userId });
    return res.status(400).json({ message: "news_id is required" });
  }

  try {
    let entry = await UserNews.findOne({ news_id });
    const previousState = entry?.bookmarked;

    if (!entry) {
      entry = new UserNews({ news_id, bookmarked: true });
      logger.info('bookmark ON', { news_id, userId, previousState: false });
    } else {
      entry.bookmarked = !entry.bookmarked;
      if (entry.bookmarked) {
        logger.info('bookmark ON', { news_id, userId, previousState });
      } else {
        logger.info('bookmark OFF', { news_id, userId, previousState });
      }
    }

    await entry.save();

    await Activity.create({
      userId: userId,
      username: req.user.username,
      action: 'news.bookmark',
      news_id,
      meta: { bookmarked: entry.bookmarked }
    });

    logger.info('Bookmark updated', {
      news_id,
      userId,
      bookmarkStatus: entry.bookmarked
    });

    res.status(200).json({
      message: entry.bookmarked ? "Bookmarked" : "Bookmark removed",
      bookmarked: entry.bookmarked
    });
  } catch (err) {
    logger.error('Bookmark error', {
      error: err.message,
      stack: err.stack,
      newsId,
      userId
    });
    res.status(500).json({ error: err.message });
  }
};

// Get all bookmarked news
exports.getBookmarkedNews = async (req, res) => {
  const userId = req.user.userId;
  const { page = 1, limit = 10 } = req.query;

  logger.info('Fetching bookmarked news', { userId, page, limit });

  try {
    const bookmarkedEntries = await UserNews.find({ bookmarked: true })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalCount = await UserNews.countDocuments({ bookmarked: true });

    logger.info('Bookmarked news fetched', {
      userId,
      totalBookmarked: totalCount,
      returnedCount: bookmarkedEntries.length,
      page
    });

    res.status(200).json({
      bookmarkedNews: bookmarkedEntries,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (err) {
    logger.error('Fetch bookmarks error', {
      error: err.message,
      stack: err.stack,
      userId
    });
    res.status(500).json({ error: err.message });
  }
};

// Get bookmark status for a news item
exports.getBookmarkStatus = async (req, res) => {
  const { newsId } = req.params;
  const userId = req.user.userId;

  logger.info('Fetching bookmark status', { newsId, userId });

  try {
    const entry = await UserNews.findOne({ news_id: newsId });
    const isBookmarked = entry?.bookmarked || false;

    logger.info('Bookmark status retrieved', { newsId, userId, isBookmarked });

    res.status(200).json({
      newsId,
      isBookmarked
    });
  } catch (err) {
    logger.error('Bookmark status error', {
      error: err.message,
      stack: err.stack,
      newsId,
      userId
    });
    res.status(500).json({ error: err.message });
  }
};
