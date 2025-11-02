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
  liked_news: {
    type: [String],
    default: [],
  },
  commented_news: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("UserNews", userNewsSchema);