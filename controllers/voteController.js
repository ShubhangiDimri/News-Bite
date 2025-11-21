const logger = require('../utils/logging');
const UserNews = require('../models/UserNews');
const User = require('../models/User');

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
    let userNews;
    let target;

    if (type === 'comment') {
      userNews = await UserNews.findOne({ 'comments._id': itemId });
      if (!userNews) {
        logger.warn('Vote failed - comment not found', { itemId });
        throw new Error('Comment not found');
      }
      target = userNews.comments.id(itemId);
    } else if (type === 'reply') {
      userNews = await UserNews.findOne({ 'comments._id': parentId });
      if (!userNews) {
        logger.warn('Vote failed - parent comment not found', { parentId });
        throw new Error('Parent comment not found');
      }
      const parentComment = userNews.comments.id(parentId);
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

    await userNews.save();
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
  const { commentId } = req.params;
  const { voteType } = req.body;
  const userId = req.user.userId;

  logger.info('Comment vote attempt', { commentId, voteType, userId });

  if (!voteType || !['up', 'down'].includes(voteType)) {
    logger.error('Vote validation failed - invalid voteType', { commentId, voteType });
    return res.status(400).json({ message: "voteType must be 'up' or 'down'" });
  }

  try {
    const result = await handleVote('comment', userId, voteType, commentId);

    logger.info('Comment vote successful', {
      commentId,
      userId,
      voteType,
      score: result.score
    });

    res.status(200).json({
      message: "Vote recorded",
      score: result.score,
      upvotes: result.upvotes.length,
      downvotes: result.downvotes.length
    });
  } catch (error) {
    logger.error('VoteComment endpoint error', {
      error: error.message,
      stack: error.stack,
      commentId,
      voteType,
      userId
    });
    res.status(500).json({ message: error.message });
  }
};

// Vote on reply
exports.voteReply = async (req, res) => {
  const { commentId, replyId } = req.params;
  const { voteType } = req.body;
  const userId = req.user.userId;

  logger.info('Reply vote attempt', { commentId, replyId, voteType, userId });

  if (!voteType || !['up', 'down'].includes(voteType)) {
    logger.error('Vote validation failed - invalid voteType', { replyId, voteType });
    return res.status(400).json({ message: "voteType must be 'up' or 'down'" });
  }

  try {
    const result = await handleVote('reply', userId, voteType, replyId, commentId);

    logger.info('Reply vote successful', {
      commentId,
      replyId,
      userId,
      voteType,
      score: result.score
    });

    res.status(200).json({
      message: "Vote recorded",
      score: result.score,
      upvotes: result.upvotes.length,
      downvotes: result.downvotes.length
    });
  } catch (error) {
    logger.error('VoteReply endpoint error', {
      error: error.message,
      stack: error.stack,
      commentId,
      replyId,
      voteType,
      userId
    });
    res.status(500).json({ message: error.message });
  }
};
