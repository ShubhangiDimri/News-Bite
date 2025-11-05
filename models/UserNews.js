const mongoose = require("mongoose");

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
  comments: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      comment: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
});

module.exports = mongoose.model("UserNews", userNewsSchema);