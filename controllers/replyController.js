const mongoose = require("mongoose");
const { sanitizeText } = require("../utils/sanitizer");
const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const News = require('../models/News');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Add reply to comment
exports.addReply = async (req, res) => {
  const { commentId } = req.params;
  const { news_id, comment } = req.body;
  const userId = req.user.userId;
  const username = req.user.username;

  if (!comment || !news_id) {
    return res.status(400).json({ message: "Reply text and news_id are required" });
  }

  try {
    const newsItem = await News.findById(news_id);
    if (!newsItem) {
      return res.status(404).json({ message: "News not found" });
    }

    const parentComment = newsItem.comments.id(commentId);
    if (!parentComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const sanitized = sanitizeText(comment);
    const replyId = new mongoose.Types.ObjectId();

    const newReply = {
      _id: replyId,
      userId: userId,
      username: username,
      comment: sanitized.text || comment,
      originalText: comment,
      wasCensored: sanitized.wasCensored,
      censoredTerms: sanitized.censoredTerms || [],
      parentId: commentId
    };

    // Add reply to the parent comment
    if (!parentComment.replies) {
      parentComment.replies = [];
    }
    parentComment.replies.push(newReply);
    await newsItem.save();

    await Activity.create({
      userId: userId,
      username: username,
      action: 'reply.create',
      news_id,
      targetId: replyId,
      meta: { parentId: commentId, wasCensored: sanitized.wasCensored }
    });

    logger.info('Reply added successfully', {
      replyId,
      commentId,
      news_id,
      username,
      wasCensored: sanitized.wasCensored,
      parentId: commentId
    });

    res.status(201).json({
      message: "Reply added successfully",
      reply: newReply
    });
  } catch (error) {
    logger.error('Reply error', { error: error.message, stack: error.stack });
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete reply
exports.deleteReply = async (req, res) => {
  const { commentId, replyId } = req.params;
  const { news_id } = req.body;

  try {
    const newsItem = await News.findById(news_id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });

    const parentComment = newsItem.comments.id(commentId);
    if (!parentComment) return res.status(404).json({ message: "Comment not found" });

    const reply = parentComment.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (reply.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Activity.create({
      userId: req.user.userId,
      username: req.user.username,
      action: 'reply.delete',
      targetId: replyId,
      meta: { parentId: commentId }
    });

    await Activity.create({
      userId: req.user.userId,
      username: req.user.username,
      action: 'reply.delete',
      targetId: replyId,
      meta: { parentId: commentId }
    });

    parentComment.replies.pull(replyId);
    await newsItem.save();
    logger.info('Reply deleted successfully', {
      commentId,
      replyId,
      userId: req.user.userId
    });

    res.status(200).json({ message: "Reply deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all replies for a comment
exports.getReplies = async (req, res) => {
  const { commentId } = req.params;
  const { news_id } = req.query; // Assuming news_id is passed in query

  try {
    const newsItem = await News.findById(news_id);
    if (!newsItem) return res.status(404).json({ message: "News not found" });

    const parentComment = newsItem.comments.id(commentId);
    if (!parentComment) return res.status(404).json({ message: "Comment not found" });

    res.status(200).json({
      replies: parentComment.replies,
      total: parentComment.replies.length
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

