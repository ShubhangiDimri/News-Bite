const logger = require("../utils/logging");
const UserNews = require("../models/UserNews");
const User = require("../models/User");

// User activity endpoint - kept here for user-specific activity tracking
// User activity endpoint
exports.activity = async (req, res) => {
  const username = req.user.username;

  logger.info('Fetch user activity', { username });

  try {
    const userNews = await UserNews.find({ username })
      .select("news_id comments likes bookmarked createdAt")
      .sort({ createdAt: -1 }); // Sort by newest first

    if (!userNews || userNews.length === 0) {
      logger.info('No activity found for user', { username });
      return res.status(200).json({ activity: [] });
    }

    // Fetch news details
    const News = require('../models/News');
    const newsIds = userNews.map(item => item.news_id);
    // Note: news_id in UserNews is a String (custom ID), but News._id is ObjectId. 
    // However, News model has news_id (String) and _id (ObjectId).
    // Let's check how they are linked. 
    // In commentController, we used News.findById(news_id). 
    // If news_id in UserNews matches News._id (ObjectId), then findById works.
    // If news_id in UserNews matches News.news_id (String), then we need find({ news_id: ... }).

    // Looking at News.js: news_id is String, _id is ObjectId.
    // Looking at UserNews.js: news_id is String.
    // Looking at commentController: const newsItem = await News.findById(news_id);
    // This implies 'news_id' passed around is actually the ObjectId string.

    const newsItems = await News.find({ _id: { $in: newsIds } }).select('title url publishedAt');

    const enrichedActivity = userNews.map(item => {
      const news = newsItems.find(n => n._id.toString() === item.news_id);
      return {
        ...item.toObject(),
        newsTitle: news ? news.title : 'News unavailable',
        newsUrl: news ? news.url : '#',
        newsDate: news ? news.publishedAt : null
      };
    });

    logger.info('User activity fetched successfully', {
      username,
      newsItemsWithActivity: userNews.length
    });

    res.status(200).json({ activity: enrichedActivity });
  } catch (error) {
    logger.error('Activity fetch error', {
      error: error.message,
      stack: error.stack,
      username
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update profile photo
exports.uploadPhoto = async (req, res) => {
  try {
    const username = req.user.username;  // or however you identify user

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    //save image along with data:image/png;base64
    const photoBase64 = "data:image/png;base64," + req.file.buffer.toString("base64");

    const user = await User.findOneAndUpdate(
      { username },
      { photo: photoBase64 },
      { new: true }
    );

    res.json({
      message: "Photo updated",
      profileImage: user.photo
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error uploading photo" });
  }
};
