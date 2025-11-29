const mongoose = require("mongoose");
const { sanitizeText } = require("../utils/sanitizer");
const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const News = require('../models/News');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Add comment
exports.addComment = async (req, res) => {
  const { comment, news_id } = req.body;

  logger.info('Comment attempt', { news_id, userId: req.user.userId });

  if (!comment || !news_id) {
    return res.status(400).json({ message: "Comment text and news_id are required" });
  }

  try {
    const user = await User.findById(req.user.userId).select("username");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the news item first to ensure it exists and to save the comment there
    const newsItem = await News.findById(news_id);
    if (!newsItem) {
      return res.status(404).json({ message: "News item not found" });
    }

    const sanitized = sanitizeText(comment);

    // Get or create UserNews for this user and news (keeping this for user history)
    let userNews = await UserNews.findOne({ news_id, username: user.username });

    if (!userNews) {
      userNews = new UserNews({
        news_id,
        username: user.username,
      });
    }

    const commentId = new mongoose.Types.ObjectId();

    const newComment = {
      _id: commentId,
      userId: req.user.userId,
      username: user.username,
      comment: sanitized.text || comment,
      timestamp: new Date(),
      replies: []
    };

    // Store comment in UserNews
    userNews.comments.push(newComment);
    await userNews.save();

    // Store comment in News (CRITICAL FIX: This was missing)
    newsItem.comments.push(newComment);
    await newsItem.save();

    await Activity.create({
      userId: req.user.userId,
      username: user.username,
      action: 'comment.create',
      news_id,
      targetId: commentId,
      meta: { wasCensored: sanitized.wasCensored }
    });

    res.status(201).json({
      message: "Comment added successfully",
      comment: newComment
    });

  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Delete comment
exports.deleteComment = async (req, res) => {
  const commentId = req.params.commentId;
  const { news_id } = req.body;

  try {
    const newsItem = await News.findById(news_id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });

    const comment = newsItem.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Activity.create({
      userId: req.user.userId,
      username: req.user.username,
      action: 'comment.delete',
      news_id,
      targetId: commentId
    });

    await Activity.create({
      userId: req.user.userId,
      username: req.user.username,
      action: 'comment.delete',
      news_id,
      targetId: commentId
    });

    newsItem.comments.pull(commentId);
    await newsItem.save();
    logger.info('Comment deleted successfully', {
      commentId,
      news_id,
      userId: req.user.userId
    });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all comments for a news
exports.getComments = async (req, res) => {
  const { news_id } = req.params;

  try {
    const newsItem = await News.findById(news_id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });

    res.status(200).json({
      comments: newsItem.comments,
      total: newsItem.comments.length
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
