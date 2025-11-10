const mongoose = require("mongoose");
const { sanitizeText } = require("../utils/sanitizer");
const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const User = require('../models/User');

// Add comment
exports.addComment = async (req, res) => {
  const { comment, newsId } = req.body;
  
  logger.info('Comment attempt', { newsId, userId: req.user.userId });

  if (!comment || !newsId) {
    logger.warn('Comment validation failed - missing fields', {
      hasCommen: !!comment,
      hasNewsId: !!newsId
    });
    return res.status(400).json({ message: "Comment text and newsId are required" });
  }

  try {
    const user = await User.findById(req.user.userId).select("username");
    if (!user?.username) {
      logger.warn('Comment failed - user not found', { userId: req.user.userId });
      return res.status(404).json({ message: "User not found" });
    }

    // Sanitize the comment
    const sanitized = sanitizeText(comment);
    if (sanitized.wasCensored) {
      logger.warn('Comment censored', {
        newsId,
        userId: req.user.userId,
        censoredTerms: sanitized.censoredTerms,
        originalLength: comment.length,
        sanitizedLength: sanitized.text.length
      });
    }

    let userNews = await UserNews.findOne({ news_id: newsId });
    if (!userNews) {
      userNews = new UserNews({ news_id: newsId });
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

    logger.info('Comment added successfully', {
      newsId,
      commentId,
      username: user.username,
      wasCensored: sanitized.wasCensored
    });

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
    logger.error('Comment error', {
      error: error.message,
      stack: error.stack,
      newsId,
      userId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  const { commentId, newsId } = req.body;
  
  logger.info('Delete comment attempt', { commentId, newsId, userId: req.user.userId });

  try {
    const result = await UserNews.findOneAndUpdate(
      { news_id: newsId },
      { $pull: { comments: { _id: commentId, userId: req.user.userId } } },
      { new: true }
    );

    if (!result) {
      logger.warn('Delete comment failed - not found or unauthorized', {
        commentId,
        newsId,
        userId: req.user.userId
      });
      return res.status(404).json({ message: "Comment not found or unauthorized" });
    }

    logger.info('Comment deleted successfully', {
      commentId,
      newsId,
      userId: req.user.userId
    });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    logger.error('Delete comment error', {
      error: error.message,
      stack: error.stack,
      commentId,
      newsId,
      userId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all comments for a news
exports.getComments = async (req, res) => {
  const { newsId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  logger.info('Fetching comments', { newsId, page, limit });

  try {
    const userNews = await UserNews.findOne({ news_id: newsId });

    if (!userNews) {
      logger.warn('Comments fetch failed - news not found', { newsId });
      return res.status(404).json({ message: "News not found" });
    }

    const comments = userNews.comments || [];
    const start = (page - 1) * limit;
    const paginatedComments = comments.slice(start, start + limit);

    logger.info('Comments fetched successfully', {
      newsId,
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
      newsId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
