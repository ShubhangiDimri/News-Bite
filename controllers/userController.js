const mongoose = require("mongoose");
const { sanitizeText } = require("../utils/sanitizer");
const logger = require("../utils/logging"); // Assuming logger is set up in utils/logger.js

const News = require("../models/News");
const UserNews = require("../models/UserNews");
const User = require("../models/User");

exports.comment = async (req, res) => {
  const { comment, newsId } = req.body;
  
  logger.info('Comment attempt', {
    newsId,
    username: req.user?.username,
    commentText: comment?.substring(0, 50) + (comment?.length > 50 ? '...' : '')
  });

  if (!comment || !newsId) {
    logger.warn('Comment validation failed', {
      missing: {
        comment: !comment,
        newsId: !newsId
      }
    });
    return res.status(400).json({ 
      message: "Validation failed", 
      error: {
        comment: !comment ? "Comment is required" : undefined,
        newsId: !newsId ? "NewsId is required" : undefined
      }
    });
  }

  // Sanitize the comment
  const sanitized = sanitizeText(comment || "");
  if (sanitized.wasCensored) {
    logger.warn('Comment censored', {
      newsId,
      censoredTerms: sanitized.censoredTerms,
      originalLength: comment.length,
      sanitizedLength: sanitized.text.length
    });
  }

  // Get username from database using req.user info from authMiddleware
  let username = "";
  try {
    const user = await User.findById(req.user.userId).select("username");
    username = user.username;
    if (!username) {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }

  // Logic: save comment to db with username and newsId in UserNews. Update comment in News model as well
  //Check if username, newsId exists in UserNews
  try {
    let userNews = await UserNews.findOne({ username, news_id: newsId });
    const commentId = new mongoose.Types.ObjectId(); // 🔹 same ID for both comments

    const commentData = {
      _id: commentId,
      comment: sanitized.text || comment,     // ensure comment field is always set
      originalText: comment,                  // store original comment
      wasCensored: sanitized.wasCensored,
      censoredTerms: sanitized.censoredTerms || [],
      status: sanitized.status || 'visible'
    };

    if (!userNews) {
      userNews = new UserNews({
        username,
        news_id: newsId,
        comments: [commentData],
      });
    } else {
      userNews.comments.push(commentData);
    }
    await userNews.save();

    // Update News model
    const newsItem = await News.findOne({ news_id: newsId });
    if (newsItem) {
      // For News model, always use the sanitized comment
      newsItem.comments.push({ _id: commentId, username, comment: sanitized.text });
      await newsItem.save();
    }

    logger.info('Comment added successfully', {
      newsId,
      commentId,
      username,
      wasCensored: sanitized.wasCensored
    });
    
    // Prepare response based on whether the comment was censored
    if (sanitized.wasCensored) {
      return res.status(200).json({
        message: `Posted (masked ${sanitized.censoredTerms.length} term${sanitized.censoredTerms.length === 1 ? '' : 's'}).`,
        comment: sanitized.text
      });
    } else {
      // For clean comments, maintain the exact same response format as before
      return res.status(200).json({ 
        message: "Comment added successfully", 
        commentId 
      });
    }
  } catch (error) {
    logger.error('Error adding comment', {
      error: error.message,
      stack: error.stack,
      newsId,
      username
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  const { commentId, newsId } = req.body;

  try {
    // Remove from News collection
    const newsResult = await News.updateOne(
      { news_id: newsId },
      { $pull: { comments: { _id: commentId } } }
    );

    // Remove from UserNews collection
    const userNewsResult = await UserNews.updateOne(
      { news_id: newsId },
      { $pull: { comments: { _id: commentId } } }
    );

    // Check if comment existed in at least one place
    if (newsResult.modifiedCount === 0 && userNewsResult.modifiedCount === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Handle voting on comments or replies
async function handleVote(type, userId, voteType, itemId, replyId = null) {
  logger.info(`Vote attempt`, {
    type,
    userId,
    voteType,
    itemId,
    replyId
  });

  try {
    const userNews = await UserNews.findOne({
      'comments._id': itemId
    });

    if (!userNews) {
      logger.warn('Vote failed - item not found', { itemId });
      throw new Error('Comment not found');
    }

    let target = userNews.comments.id(itemId);
    if (replyId) {
      target = target.replies.id(replyId);
      if (!target) {
        throw new Error('Reply not found');
      }
    }

    // Remove any existing votes by this user
    target.upvotes = target.upvotes.filter(id => !id.equals(userId));
    target.downvotes = target.downvotes.filter(id => !id.equals(userId));

    // Add new vote unless it's the same as removed (toggle off)
    if (voteType === 'up') {
      target.upvotes.push(userId);
    } else if (voteType === 'down') {
      target.downvotes.push(userId);
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

exports.addReply = async (req, res) => {
  const { commentId } = req.params;
  const { comment } = req.body;
  
  logger.info(`Reply attempt`, {
    commentId,
    userId: req.user.userId
  });

  if (!comment) {
    logger.warn('Reply validation failed - missing comment text', {
      commentId,
      userId: req.user.userId
    });
    return res.status(400).json({ 
      message: "Reply text is required"
    });
  }

  try {
    const user = await User.findById(req.user.userId).select("username");
    if (!user?.username) {
      logger.warn('Reply failed - user not found', {
        userId: req.user.userId,
        commentId
      });
      return res.status(404).json({ message: "User not found" });
    }

    // Find the parent comment
    const userNews = await UserNews.findOne({
      'comments._id': commentId
    });

    if (!userNews) {
      logger.warn('Reply failed - parent comment not found', {
        commentId,
        userId: req.user.userId
      });
      return res.status(404).json({ message: "Comment not found" });
    }

    // Sanitize the reply text
    const sanitized = sanitizeText(comment);
    if (sanitized.wasCensored) {
      logger.warn('Reply censored', {
        commentId,
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
      status: sanitized.status || 'visible'
    };

    // Add reply to the comment
    const parentComment = userNews.comments.id(commentId);
    parentComment.replies.push(replyData);
    await userNews.save();

    logger.info('Reply added successfully', {
      replyId,
      commentId,
      userId: req.user.userId,
      username: user.username,
      wasCensored: sanitized.wasCensored
    });
    
    // Prepare response based on whether the reply was censored
    if (sanitized.wasCensored) {
      return res.status(200).json({
        message: `Reply posted (masked ${sanitized.censoredTerms.length} term${sanitized.censoredTerms.length === 1 ? '' : 's'}).`,
        reply: sanitized.text
      });
    } else {
      return res.status(200).json({ 
        message: "Reply added successfully",
        replyId: replyData._id 
      });
    }
  } catch (error) {
    logger.error('Reply error', {
      error: error.message,
      stack: error.stack,
      commentId,
      userId: req.user.userId
    });
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteReply = async (req, res) => {
  const { commentId, replyId } = req.params;

  logger.info('Reply deletion attempt', {
    commentId,
    replyId,
    userId: req.user.userId
  });

  try {
    const result = await UserNews.updateOne(
      { 'comments._id': commentId },
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
        userId: req.user.userId
      });
      return res.status(404).json({ message: "Reply not found or unauthorized" });
    }

    logger.info('Reply deleted successfully', {
      commentId,
      replyId,
      userId: req.user.userId
    });

    res.status(200).json({ message: "Reply deleted successfully" });
  } catch (error) {
    logger.error('Reply deletion error', {
      error: error.message,
      stack: error.stack,
      commentId,
      replyId,
      userId: req.user.userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getReplies = async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  logger.info('Fetching replies', {
    commentId,
    page,
    limit
  });

  try {
    const userNews = await UserNews.findOne(
      { 'comments._id': commentId },
      { 'comments.$': 1 }
    );

    if (!userNews || !userNews.comments[0]) {
      logger.warn('Replies fetch failed - comment not found', { commentId });
      return res.status(404).json({ message: "Comment not found" });
    }

    const replies = userNews.comments[0].replies;
    const start = (page - 1) * limit;
    const paginatedReplies = replies.slice(start, start + limit);

    logger.info('Replies fetched successfully', {
      commentId,
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
      commentId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.voteComment = async (req, res) => {
  const { commentId } = req.params;
  const { voteType } = req.body;

  if (!['up', 'down'].includes(voteType)) {
    return res.status(400).json({ message: "Invalid vote type" });
  }

  try {
    const result = await handleVote('comment', req.user.userId, voteType, commentId);
    res.status(200).json({ 
      message: "Vote recorded",
      score: result.score,
      upvotes: result.upvotes.length,
      downvotes: result.downvotes.length
    });
  } catch (error) {
    // Add logging to the catch block
    logger.error('VoteComment endpoint error', { error: error.message, stack: error.stack, commentId, voteType });
    res.status(500).json({ message: error.message });
  }
};

exports.voteReply = async (req, res) => {
  const { commentId, replyId } = req.params;
  const { voteType } = req.body;

  if (!['up', 'down'].includes(voteType)) {
    return res.status(400).json({ message: "Invalid vote type" });
  }

  try {
    const result = await handleVote('reply', req.user.userId, voteType, commentId, replyId);
    res.status(200).json({ 
      message: "Vote recorded",
      score: result.score,
      upvotes: result.upvotes.length,
      downvotes: result.downvotes.length
    });
  } catch (error) {
    // Add logging to the catch block
    logger.error('VoteReply endpoint error', { error: error.message, stack: error.stack, commentId, replyId, voteType });
    res.status(500).json({ message: error.message });
  }
};

exports.like = async (req, res) => {
  const { newsId } = req.body;
  const userId = req.user.userId;

  logger.info('Like/unlike attempt', { newsId, userId });

  try {
    // 1️⃣ Get username from logged-in user
    const user = await User.findById(req.user.userId).select("username");
    if (!user) {
      logger.warn('Like failed - user not found', { userId, newsId });
      return res.status(404).json({ message: "User not found" });
    }
    const username = user.username;

    // 2️⃣ Find or create UserNews entry for this user and news
    let userNews = await UserNews.findOne({ username, news_id: newsId });
    let isLiked = false;

    if (!userNews) {
      // Create new entry with like = 1
      userNews = new UserNews({
        username,
        news_id: newsId,
        likes: 1,
      });
      isLiked = true;
    } else {
      // Toggle like/unlike
      if (userNews.likes === 0) {
        userNews.likes = 1;
        isLiked = true;
      } else {
        userNews.likes = 0;
        isLiked = false;
      }
    }

    await userNews.save();

    // 3️⃣ Update total likes count in News model
    const newsItem = await News.findOne({ news_id: newsId });
    if (!newsItem) {
      logger.warn('Like failed - news item not found', { newsId, userId });
      return res.status(404).json({ message: "News item not found" });
    }

    // Ensure likes is numeric
    if (typeof newsItem.likes !== "number") {
      newsItem.likes = Number(newsItem.likes) || 0;
    }

    // If user liked → +1, if unliked → -1 (prevent negative)
    newsItem.likes = isLiked
      ? newsItem.likes + 1
      : Math.max(0, newsItem.likes - 1);

    await newsItem.save();

    logger.info(`News ${isLiked ? "liked" : "unliked"} successfully`, {
        newsId,
        userId,
        totalLikes: newsItem.likes,
        userLikeStatus: userNews.likes
    });

    // 4️⃣ Respond with updated info
    res.status(200).json({
      message: `News ${isLiked ? "liked" : "unliked"} successfully`,
      totalLikes: newsItem.likes,
      userLikeStatus: userNews.likes,
    });
  } catch (error) {
    logger.error('Like operation failed', {
        error: error.message,
        stack: error.stack,
        newsId,
        userId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.activity = async (req, res) => {
  // Input : none (get from req.user)
  const user = req.user;

  //get username from db
  let username = "";
  try {
    const userData = await User.findById(user.userId).select("username");
    username = userData.username;
    if (!username) {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }

  // Logic: fetch comments and liked news from UserNews
  try {
    const userNews = await UserNews.find({ username });

    if (!userNews || userNews.length === 0) {
      return res.status(404).json({ message: "No activity found for user" });
    }

    res.status(200).json({ activity: userNews });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//View user profile
exports.viewProfile = async (req, res) => {
    const {username} = req.body;

    try {
        const user = await User.findOne({username}).select('-password');

        res.status(200).json({ user });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//Modify user profile
exports.editProfile = async (req, res) => {
    const {username, bio_data} = req.body;
    
    try {
        const user = await User.findOneAndUpdate(
            {username},
            {bio_data},
            {new: true}
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//Search & filter

exports.searchNews = async (req, res) => {
  const startTime = Date.now();
  logger.info('Search request', { query: req.query });

  try {
    const {
      query,
      category,
      source,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "publishedAt",
      order = "desc",
    } = req.query;

    const filter = {};

    // Keyword search in title, description, or content
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
      ];
    }

    // Category filter
    if (category) filter.category = category;

    // Source filter
    if (source) filter.source = source;

    // Date range filter
    if (startDate || endDate) {
      filter.publishedAt = {};
      if (startDate) filter.publishedAt.$gte = new Date(startDate);
      if (endDate) filter.publishedAt.$lte = new Date(endDate);
    }

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // Pagination
    const skip = (page - 1) * limit;

    // Query execution
    const news = await News.find(filter)
      .sort(sortOptions)
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // Total count for pagination metadata
    const total = await News.countDocuments(filter);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      logger.warn('Slow search detected', {
        duration,
        query: req.query
      });
    }

    logger.info('Search completed', {
      duration,
      totalResults: total,
      returnedResults: news.length
    });

    res.status(200).json({
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      results: news,
    });
  } catch (error) {
    logger.error('Search error', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ message: "Server error" });
  }
};



//BOOKMARK
// Toggle bookmark
exports.toggleBookmark = async (req, res) => {
  const { username, news_id } = req.body;
  
  logger.info(`Bookmark toggle attempt`, { username, news_id });

  try {
    let entry = await UserNews.findOne({ username, news_id });
    const previousState = entry?.bookmarked;

    if (entry) {
      entry.bookmarked = !entry.bookmarked;
      await entry.save();
    } else {
      entry = new UserNews({ username, news_id, bookmarked: true });
      await entry.save();
    }

    logger.info('Bookmark updated', {
      username,
      news_id,
      previousState,
      newState: entry.bookmarked
    });

    res.status(200).json({ message: "Bookmark updated", bookmarked: entry.bookmarked });
  } catch (err) {
    logger.error('Bookmark error', {
      error: err.message,
      stack: err.stack,
      username,
      news_id
    });
    res.status(500).json({ error: err.message });
  }
};

// Get all bookmarked news with full news details
exports.getBookmarkedNews = async (req, res) => {
  try {
    const bookmarked = await UserNews.find({
      username: req.params.username,
      bookmarked: true,
    });

    const newsDetails = await Promise.all(
      bookmarked.map(async (item) => {
        const news = await News.findOne({ news_id: item.news_id });
        return { ...item._doc, news };
      })
    );

    res.status(200).json(newsDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};