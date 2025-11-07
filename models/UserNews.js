const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  comment: { type: String, required: true },       // keeping original field name for compatibility
  originalText: { type: String },                  // raw text (optional for old records)
  wasCensored: { type: Boolean, default: false },
  censoredTerms: [{ type: String }],              // array of terms found
  status: { type: String, enum: ['visible', 'review'], default: 'visible' },
  timestamp: { type: Date, default: Date.now }
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
  comments: [commentSchema],
});

module.exports = mongoose.model("UserNews", userNewsSchema);