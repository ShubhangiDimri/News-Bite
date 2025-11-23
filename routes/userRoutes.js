const express = require("express");
const { activity, uploadPhoto } = require("../controllers/userController");
const { addComment, deleteComment, getComments } = require("../controllers/commentController");
const { toggleLike, getLikesCount } = require("../controllers/likeController");
const { addReply, deleteReply, getReplies } = require("../controllers/replyController");
const { voteComment, voteReply } = require("../controllers/voteController");
const { viewProfile, editProfile } = require("../controllers/profileController");
const { searchNews, getNewsById, getCategories } = require("../controllers/searchController");
const { toggleBookmark, getBookmarkedNews } = require("../controllers/bookmarkController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadHandler");

const router = express.Router();

// Activity routes
router.get("/activity", authMiddleware, activity);

// Comment routes

router.post("/comments", authMiddleware, addComment);
router.delete("/comments/:commentId", authMiddleware, deleteComment);
router.get("/comments/:news_id", getComments);

// Reply routes
router.post("/comments/:commentId/replies", authMiddleware, addReply);
router.delete("/comments/:commentId/replies/:replyId", authMiddleware, deleteReply);
router.get("/comments/:commentId/replies", authMiddleware, getReplies);

// Vote routes
router.post("/comments/:commentId/votes", authMiddleware, voteComment);
router.post("/comments/:commentId/replies/:replyId/votes", authMiddleware, voteReply);

// Like routes
router.post("/likes", authMiddleware, toggleLike);
router.get("/likes/:news_id", getLikesCount);

// Profile routes
// Get profile by username
router.get("/profile/:username", viewProfile);
router.get("/profile",authMiddleware, viewProfile);
router.post("/upload-photo", authMiddleware, upload, uploadPhoto);


// Edit logged-in user's profile
// @accepts application/x-www-form-urlencoded
// @body {bio_data?: string}
router.put("/profile", authMiddleware, editProfile);

// Search routes
router.get("/search", searchNews);
router.get("/getNews/:newsId", getNewsById);
router.get("/categories", getCategories);

// Bookmark routes
router.post("/bookmarks", authMiddleware, toggleBookmark);
router.get("/bookmarks", authMiddleware, getBookmarkedNews);

module.exports = router;



