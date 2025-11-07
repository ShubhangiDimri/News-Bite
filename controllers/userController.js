const mongoose = require("mongoose");
const { sanitizeText } = require("../utils/sanitizer");

const News = require("../models/News");
const UserNews = require("../models/UserNews");
const User = require("../models/User");

exports.comment = async (req, res) => {
  // Input validation
  const { comment, newsId } = req.body;
  
  if (!comment || !newsId) {
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

exports.like = async (req, res) => {
  const { newsId } = req.body;

  try {
    // 1️⃣ Get username from logged-in user
    const user = await User.findById(req.user.userId).select("username");
    if (!user) {
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

    // 4️⃣ Respond with updated info
    res.status(200).json({
      message: `News ${isLiked ? "liked" : "unliked"} successfully`,
      totalLikes: newsItem.likes,
      userLikeStatus: userNews.likes,
    });
  } catch (error) {
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
  try {
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//Search & filter

exports.searchNews = async (req, res) => {
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

    res.status(200).json({
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      results: news,
    });
  } catch (error) {
    console.error("Error searching news:", error);
    res.status(500).json({ message: "Server error" });
  }
};
