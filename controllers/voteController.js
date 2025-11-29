const News = require('../models/News');

const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Helper function to handle voting logic
// Helper function to handle voting logic
async function handleVote(type, userId, voteType, itemId, parentId = null) {
  logger.info(`Vote attempt`, {
    type,
    userId,
    voteType,
    itemId,
    parentId
  });

  try {
    let newsItem;
    let target;

    if (type === 'comment') {
      // Find news containing the comment
      newsItem = await News.findOne({ 'comments._id': itemId });
      if (!newsItem) {
        logger.warn('Vote failed - comment not found in any news', { itemId });
        throw new Error('Comment not found');
      }
      target = newsItem.comments.id(itemId);
    } else if (type === 'reply') {
      // Find news containing the parent comment
      newsItem = await News.findOne({ 'comments._id': parentId });
      if (!newsItem) {
        logger.warn('Vote failed - parent comment not found in any news', { parentId });
        throw new Error('Parent comment not found');
      }
      const parentComment = newsItem.comments.id(parentId);
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
      target = parentComment.replies.id(itemId);
    }

    if (!target) {
      logger.warn('Vote failed - target not found', { type, itemId });
      throw new Error('Target not found');
    }

    // Initialize arrays if they don't exist
    if (!target.upvotes) target.upvotes = [];
    if (!target.downvotes) target.downvotes = [];

    // Check if user already voted
    const hasUpvote = target.upvotes.some(id => id.equals(userId));
    const hasDownvote = target.downvotes.some(id => id.equals(userId));

    // Remove existing votes
    target.upvotes = target.upvotes.filter(id => !id.equals(userId));
    target.downvotes = target.downvotes.filter(id => !id.equals(userId));

    // Add new vote unless it's the same as removed (toggle off)
    if (voteType === 'up') {
      if (!hasUpvote) {
        target.upvotes.push(userId);
        logger.info('vote_added', { type, itemId, voteType: 'up', userId });
      } else {
        logger.info('vote_removed', { type, itemId, voteType: 'up', userId });
      }
    } else if (voteType === 'down') {
      if (!hasDownvote) {
        target.downvotes.push(userId);
        logger.info('vote_added', { type, itemId, voteType: 'down', userId });
      } else {
        logger.info('vote_removed', { type, itemId, voteType: 'down', userId });
      }
    }

    // Handle vote switching
    if ((hasUpvote && voteType === 'down') || (hasDownvote && voteType === 'up')) {
      const from = hasUpvote ? 'up' : 'down';
      const to = voteType;
      logger.info('vote_switched', { type, itemId, from, to, userId });
    }

    // Update score
    target.score = target.upvotes.length - target.downvotes.length;

    await newsItem.save();
    logger.info('Vote recorded successfully', {
      type,
      score: target.score,
      upvotes: target.upvotes.length,
      downvotes: target.downvotes.length
    });

    return target;
  } catch (error) {
    logger.error('Vote error', {
      error: error.message,
      stack: error.stack,
      type,
      itemId
    });
    throw error;
  }
}

// Vote on comment
exports.voteComment = async (req, res) => {
  // FIXED: Get commentId from body, not params, matching the route definition
  const { commentId, voteType } = req.body;
  const userId = req.user.userId;

  logger.info('Comment vote attempt', { commentId, voteType, userId });

  if (!voteType || !['up', 'down'].includes(voteType)) {
    logger.error('Vote validation failed - invalid voteType', { commentId, voteType });
    return res.status(400).json({ message: "voteType must be 'up' or 'down'" });
  }

  try {
    const result = await handleVote('comment', userId, voteType, commentId);

    await Activity.create({
      userId: userId,
      username: req.user.username,
      action: 'comment.vote',
      targetId: commentId,
      meta: { voteType }
    });

    logger.info('Comment vote successful', {
      commentId,
      userId,
      voteType,
      score: result.score
    });

    res.json({
      message: "Vote recorded",
      score: result.score,
      upvoted: result.upvotes.includes(userId),
      downvoted: result.downvotes.includes(userId)
    });
  } catch (error) {
    logger.error('Vote error', { error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};

exports.voteReply = async (req, res) => {
  const { news_id, commentId, replyId, voteType } = req.body;
  const userId = req.user.userId;

  logger.info('Reply vote attempt', { commentId, replyId, voteType, userId });

  if (!voteType || !['up', 'down'].includes(voteType)) {
    logger.error('Vote validation failed - invalid voteType', { replyId, voteType });
    return res.status(400).json({ message: "voteType must be 'up' or 'down'" });
  }

  try {
    const result = await handleVote('reply', userId, voteType, replyId, commentId);

    await Activity.create({
      userId: userId,
      username: req.user.username,
      action: 'reply.vote',
      targetId: replyId,
      meta: { voteType, parentId: commentId }
    });

    logger.info('Reply vote successful', {
      commentId,
      replyId,
      userId,
      voteType,
      score: result.score
    });

    res.json({
      message: "Vote recorded",
      score: result.score,
      upvoted: result.upvotes.includes(userId),
      downvoted: result.downvotes.includes(userId)
    });
  } catch (error) {
    logger.error('Vote error', { error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};
