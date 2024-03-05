const { protect } = require("../controllers/authController");
const getAllConversations = require("../controllers/conversationController");

const router = require("express").Router();

router.get("/all_conversations", protect, getAllConversations);

module.exports = router;
