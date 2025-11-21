const mongoose = require("mongoose");
const { sanitizeText } = require("../utils/sanitizer");
const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const User = require('../models/User');

// Add comment
exports.addComment = async (req, res) => {
  const { comment, news_id } = req.body;

  if (!comment || !news_id) {
    return res.status(400).json({ message: "Comment text and news_id are required" });
  }

  try {
    const user = await User.findById(req.user.userId).select("username");
    if (!user) return res.status(404).json({ message: "User not found" });

    const sanitized = sanitizeText(comment);

    let userNews = await UserNews.findOne({ news_id });

    if (!userNews) {
      userNews = new UserNews({
        news_id,
        username: user.username,  // IMPORTANT FIX
      });
    }

    const commentId = new mongoose.Types.ObjectId();

    userNews.comments.push({
      _id: commentId,
      userId: req.user.userId,
      username: user.username,
      comment: sanitized.text || comment,
      originalText: comment,
      wasCensored: sanitized.wasCensored,
      censoredTerms: sanitized.censoredTerms || []
    });

    await userNews.save();

    res.status(201).json({
      message: "Comment added successfully",
      comment: {
        _id: commentId,
        username: user.username,
        comment: sanitized.text || comment,
        wasCensored: sanitized.wasCensored
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Delete comment
exports.deleteComment = async (req, res) => {
  const commentId = req.params.commentId;
  const { news_id } = req.body;

  logger.info('Delete comment attempt', { commentId, news_id, userId: req.user.userId });

  try {
    const result = await UserNews.findOneAndUpdate(
      { news_id },
      { $pull: { comments: { _id: commentId, userId: req.user.userId } } },
      { new: true }
    );

    if (!result) {
      logger.warn('Delete comment failed - not found or unauthorized', {
        commentId,
        news_id,
        userId: req.user.userId
      });
      return res.status(404).json({ message: "Comment not found or unauthorized" });
    }

    logger.info('Comment deleted successfully', {
      commentId,
      news_id,
      userId: req.user.userId
    });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    logger.error('Delete comment error', {
      error: error.message,
      stack: error.stack,
      commentId,
      news_id,
      userId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all comments for a news
exports.getComments = async (req, res) => {
  const { news_id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  logger.info('Fetching comments', { news_id, page, limit });

  try {
    const userNews = await UserNews.findOne({ news_id });

    if (!userNews) {
      logger.warn('Comments fetch failed - news not found', { news_id });
      return res.status(404).json({ message: "News not found" });
    }

    const comments = userNews.comments || [];
    const start = (page - 1) * limit;
    const paginatedComments = comments.slice(start, start + limit);

    logger.info('Comments fetched successfully', {
      news_id,
      totalComments: comments.length,
      returnedComments: paginatedComments.length,
      page
    });

    res.status(200).json({
      comments: paginatedComments,
      total: comments.length,
      page: parseInt(page),
      totalPages: Math.ceil(comments.length / limit)
    });
  } catch (error) {
    logger.error('Comments fetch error', {
      error: error.message,
      stack: error.stack,
      news_id
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
