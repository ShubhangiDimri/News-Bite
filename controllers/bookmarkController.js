const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const News = require('../models/News');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Toggle bookmark
exports.toggleBookmark = async (req, res) => {
  const { news_id } = req.body;
  const userId = req.user.userId;
  const username = req.user.username;

  logger.info('Bookmark toggle attempt', { news_id, username });

  if (!news_id) {
    return res.status(400).json({ message: "news_id is required" });
  }

  try {
    // Ensure news exists
    const newsItem = await News.findById(news_id);
    if (!newsItem) {
      return res.status(404).json({ message: "News not found" });
    }

    let entry = await UserNews.findOne({ news_id, username });
    const previousState = entry?.bookmarked;

    if (!entry) {
      entry = new UserNews({
        news_id,
        username,
        bookmarked: true
      });
      logger.info('bookmark ON', { news_id, username, previousState: false });
    } else {
      entry.bookmarked = !entry.bookmarked;
      logger.info(entry.bookmarked ? 'bookmark ON' : 'bookmark OFF', { news_id, username, previousState });
    }

    await entry.save();

    await Activity.create({
      userId: userId,
      username: req.user.username,
      action: 'news.bookmark',
      news_id,
      meta: { bookmarked: entry.bookmarked }
    });

    res.status(200).json({
      message: entry.bookmarked ? "Saved" : "Removed from saved",
      bookmarked: entry.bookmarked
    });
  } catch (err) {
    logger.error('Bookmark error', {
      error: err.message,
      stack: err.stack,
      news_id,
      username
    });
    res.status(500).json({ error: err.message });
  }
};

// Get all bookmarked news
exports.getBookmarkedNews = async (req, res) => {
  const username = req.user.username;
  const { page = 1, limit = 10 } = req.query;

  logger.info('Fetching bookmarked news', { username, page, limit });

  try {
    const bookmarkedEntries = await UserNews.find({ username, bookmarked: true })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalCount = await UserNews.countDocuments({ username, bookmarked: true });

    // We might want to fetch the actual News details here if the frontend expects full news objects
    // But based on the function name 'getBookmarkedNews', it currently returns UserNews entries.
    // The viewRoutes.js handles fetching the actual News items for the /bookmarks page.
    // This API endpoint might be used for something else or just raw data.
    // If the frontend needs News items, we should fetch them. 
    // But let's stick to fixing the bugs first.

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
      username
    });
    res.status(500).json({ error: err.message });
  }
};

// Get bookmark status for a news item
exports.getBookmarkStatus = async (req, res) => {
  const { newsId } = req.params;
  const username = req.user.username;

  logger.info('Fetching bookmark status', { newsId, username });

  try {
    const entry = await UserNews.findOne({ news_id: newsId, username });
    const isBookmarked = entry?.bookmarked || false;

    res.status(200).json({
      newsId,
      isBookmarked
    });
  } catch (err) {
    logger.error('Bookmark status error', {
      error: err.message,
      stack: err.stack,
      newsId,
      username
    });
    res.status(500).json({ error: err.message });
  }
};
