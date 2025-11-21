const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio_data: {
    type: String,
    default: "",
  },
  photo: {
    data: Buffer,
    contentType: String
  }
});

module.exports = mongoose.model("User", userSchema);
