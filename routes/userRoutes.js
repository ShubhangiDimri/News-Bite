const express = require("express");
const {comment, like, activity, deleteComment, searchNews, viewProfile,editProfile,toggleBookmark, getBookmarkedNews} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();


// Existing routes      
router.post("/comment", authMiddleware, comment);
router.post("/like", authMiddleware, like);
router.post("/activity", authMiddleware, activity);
router.delete("/deleteComment", authMiddleware, deleteComment);
router.put("/editProfile", authMiddleware, editProfile);

// New comment reply routes
router.post("/comments/:commentId/reply", authMiddleware, require("../controllers/userController").addReply);
router.delete("/comments/:commentId/replies/:replyId", authMiddleware, require("../controllers/userController").deleteReply);
router.get("/comments/:commentId/replies", authMiddleware, require("../controllers/userController").getReplies);

// New voting routes
router.post("/comments/:commentId/vote", authMiddleware, require("../controllers/userController").voteComment);
router.post("/comments/:commentId/replies/:replyId/vote", authMiddleware, require("../controllers/userController").voteReply);

router.get("/viewProfile", viewProfile);
router.get("/search", searchNews);

//Bookmark routes
router.post("/bookmark", authMiddleware, toggleBookmark);
router.get("/bookmarks/:username", authMiddleware, getBookmarkedNews);

module.exports = router;



