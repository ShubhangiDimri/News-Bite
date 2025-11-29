const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  news_id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    default: "",
  },
  publishedAt: {
    type: Date,
  },
  likes: { type: Number, default: 0 },
  comments: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    comment: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    score: { type: Number, default: 0 },
    replies: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: { type: String, required: true },
      comment: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      score: { type: Number, default: 0 }
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("News", newsSchema);
