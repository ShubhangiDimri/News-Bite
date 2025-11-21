const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
}).single("photo");   // <-- Must match input name="photo"

module.exports = upload;
