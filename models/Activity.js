const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  username: {
    type: String
  },
  action: {
    type: String,
    required: true
  },
  news_id: {
    type: String,
    default: null
  },
  targetId: {
    type: String,
    default: null
  },
  meta: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ username: 1 });

module.exports = mongoose.model("Activity", activitySchema);
