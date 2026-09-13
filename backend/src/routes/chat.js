const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
} = require("../controllers/chatController");

const router = express.Router();

router.use(authenticate);

router.get("/conversations", getConversations);
router.post("/conversations", createConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", sendMessage);

module.exports = router;
