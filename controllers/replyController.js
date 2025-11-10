const mongoose = require("mongoose");
const { sanitizeText } = require("../utils/sanitizer");
const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const User = require('../models/User');

// Add reply to comment
exports.addReply = async (req, res) => {
  const { commentId, news_id } = req.params;
  const { comment } = req.body;
  
  logger.info('Reply attempt', {
    commentId,
    news_id,
    userId: req.user.userId
  });

  if (!comment) {
    logger.error('Reply validation failed - missing comment text', {
      commentId,
      news_id,
      userId: req.user.userId
    });
    return res.status(400).json({ message: "Reply text is required" });
  }

  try {
    const user = await User.findById(req.user.userId).select("username");
    if (!user?.username) {
      logger.warn('Reply failed - user not found', {
        userId: req.user.userId,
        commentId,
        news_id
      });
      return res.status(404).json({ message: "User not found" });
    }

    // Find the parent comment
    const userNews = await UserNews.findOne({
      news_id,
      'comments._id': commentId
    });

    if (!userNews) {
      logger.warn('Reply failed - parent comment not found', {
        commentId,
        news_id,
        userId: req.user.userId
      });
      return res.status(404).json({ message: "Comment not found" });
    }

    // Sanitize the reply text
    const sanitized = sanitizeText(comment);
    if (sanitized.wasCensored) {
      logger.warn('Reply censored', {
        commentId,
        news_id,
        userId: req.user.userId,
        censoredTerms: sanitized.censoredTerms,
        originalLength: comment.length,
        sanitizedLength: sanitized.text.length
      });
    }

    const replyId = new mongoose.Types.ObjectId();
    const replyData = {
      _id: replyId,
      userId: req.user.userId,
      username: user.username,
      comment: sanitized.text || comment,
      originalText: comment,
      wasCensored: sanitized.wasCensored,
      censoredTerms: sanitized.censoredTerms || [],
      parentId: commentId
    };

    // Add reply to the comment
    const parentComment = userNews.comments.id(commentId);
    if (!parentComment.replies) {
      parentComment.replies = [];
    }
    parentComment.replies.push(replyData);
    await userNews.save();

    logger.info('Reply added successfully', {
      replyId,
      commentId,
      news_id,
      userId: req.user.userId,
      username: user.username,
      wasCensored: sanitized.wasCensored,
      parentId: commentId
    });

    res.status(201).json({
      message: "Reply added successfully",
      reply: {
        _id: replyId,
        username: user.username,
        comment: sanitized.text || comment,
        wasCensored: sanitized.wasCensored,
        parentId: commentId
      }
    });
  } catch (error) {
    logger.error('Reply error', {
      error: error.message,
      stack: error.stack,
      commentId,
      news_id,
      userId: req.user.userId
    });
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete reply
exports.deleteReply = async (req, res) => {
  const { commentId, replyId, news_id } = req.params;

  logger.info('Reply deletion attempt', {
    commentId,
    replyId,
    news_id,
    userId: req.user.userId
  });

  try {
    const result = await UserNews.updateOne(
      { news_id, 'comments._id': commentId },
      { 
        $pull: { 
          'comments.$.replies': { _id: replyId, userId: req.user.userId }
        }
      }
    );

    if (result.modifiedCount === 0) {
      logger.warn('Reply deletion failed - not found or unauthorized', {
        commentId,
        replyId,
        news_id,
        userId: req.user.userId
      });
      return res.status(404).json({ message: "Reply not found or unauthorized" });
    }

    logger.info('Reply deleted successfully', {
      commentId,
      replyId,
      news_id,
      userId: req.user.userId
    });

    res.status(200).json({ message: "Reply deleted successfully" });
  } catch (error) {
    logger.error('Reply deletion error', {
      error: error.message,
      stack: error.stack,
      commentId,
      replyId,
      news_id,
      userId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all replies for a comment
exports.getReplies = async (req, res) => {
  const { commentId, news_id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  logger.info('Fetching replies', {
    commentId,
    news_id,
    page,
    limit
  });

  try {
    const userNews = await UserNews.findOne(
      { news_id, 'comments._id': commentId },
      { 'comments.$': 1 }
    );

    if (!userNews || !userNews.comments[0]) {
  logger.warn('Replies fetch failed - comment not found', { commentId, news_id });
      return res.status(404).json({ message: "Comment not found" });
    }

    const replies = userNews.comments[0].replies || [];
    const start = (page - 1) * limit;
    const paginatedReplies = replies.slice(start, start + limit);

    logger.info('Replies fetched successfully', {
      commentId,
      news_id,
      totalReplies: replies.length,
      returnedReplies: paginatedReplies.length,
      page
    });

    res.status(200).json({
      replies: paginatedReplies,
      total: replies.length,
      page: parseInt(page),
      totalPages: Math.ceil(replies.length / limit)
    });
  } catch (error) {
    logger.error('Replies fetch error', {
      error: error.message,
      stack: error.stack,
      commentId,
      news_id
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
