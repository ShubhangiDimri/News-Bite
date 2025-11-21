const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  comment: { type: String, required: true },       // keeping original field name for compatibility
  originalText: { type: String },                  // raw text (optional for old records)
  wasCensored: { type: Boolean, default: false },
  censoredTerms: [{ type: String }],              // array of terms found
  status: { type: String, enum: ['visible', 'review'], default: 'visible' },
  timestamp: { type: Date, default: Date.now },
  
  // New fields for better user tracking (optional for backward compatibility)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // made optional
  username: { type: String },                                     // made optional since we already have it in parent
  
  // New voting fields (all optional with defaults)
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  score: { type: Number, default: 0 },
  
  // Replies (optional array, won't affect existing comments)
  replies: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    comment: { type: String, required: true },
    originalText: { type: String },
    wasCensored: { type: Boolean, default: false },
    censoredTerms: [{ type: String }],
    status: { type: String, enum: ['visible', 'review'], default: 'visible' },
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    score: { type: Number, default: 0 }
  }]
});

const userNewsSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  news_id: {
    type: String,
    required: true,
  },
  likes: { type: Number, default: 0 },
  bookmarked: { type: Boolean, default: false },   //bookmarks
  comments: [commentSchema],
});

// Index news_id for faster lookups
userNewsSchema.index({ news_id: 1 });

module.exports = mongoose.model("UserNews", userNewsSchema);