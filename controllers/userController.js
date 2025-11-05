const mongoose = require('mongoose')

const News = require('../models/News')
const UserNews = require('../models/UserNews')
const User = require('../models/User')

exports.comment = async (req, res) => {
    // Input : Comment, newsId
    const { comment, newsId } = req.body;
    
    // Get username from database using req.user info from authMiddleware
    let username = "";
    try {
        const user = await User.findById(req.user.userId).select('username');
        username = user.username;
        if (!username) {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }


    // Logic: save comment to db with username and newsId in UserNews. Update comment in News model as well
    //Check if username, newsId exists in UserNews
    try {
    let userNews = await UserNews.findOne({ username, news_id: newsId });
    const commentId = new mongoose.Types.ObjectId(); // 🔹 same ID for both comments

    if (!userNews) {
        userNews = new UserNews({
        username,
        news_id: newsId,
        comments: [{ _id: commentId, comment }]
        });
    } else {
        userNews.comments.push({ _id: commentId, comment });
    }
    await userNews.save();

    const newsItem = await News.findOne({ news_id: newsId });
    if (newsItem) {
        newsItem.comments.push({ _id: commentId, username, comment });
        await newsItem.save();
    }

    res.status(200).json({ message: 'Comment added successfully', commentId });
    } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
    }

}

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
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.like = async (req, res) => {
  const { newsId } = req.body;

  try {
    // 1️⃣ Get username from logged-in user
    const user = await User.findById(req.user.userId).select('username');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
    return res.status(404).json({ message: 'News item not found' });
    }

    // Ensure likes is numeric
    if (typeof newsItem.likes !== 'number') {
    newsItem.likes = Number(newsItem.likes) || 0;
    }

    // If user liked → +1, if unliked → -1 (prevent negative)
    newsItem.likes = isLiked
    ? newsItem.likes + 1
    : Math.max(0, newsItem.likes - 1);


    await newsItem.save();

    // 4️⃣ Respond with updated info
    res.status(200).json({
      message: `News ${isLiked ? 'liked' : 'unliked'} successfully`,
      totalLikes: newsItem.likes,
      userLikeStatus: userNews.likes,
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.activity = async (req, res) => {
    // Input : none (get from req.user)
    const user = req.user;

    //get username from db
    let username = "";
    try {
        const userData = await User.findById(user.userId).select('username');
        username = userData.username;
        if (!username) {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }

    // Logic: fetch comments and liked news from UserNews
    try {
        const userNews = await UserNews.find({ username });

        if (!userNews || userNews.length === 0) {
            return res.status(404).json({ message: 'No activity found for user' });
        }

        res.status(200).json({ activity: userNews });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
    
}