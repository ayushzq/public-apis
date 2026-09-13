const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const whatsapp = require("../controllers/whatsappController");

const router = express.Router();

// Files are buffered in memory then streamed straight to Cloudinary —
// nothing touches disk, which keeps this safe on ephemeral hosts (Render).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 * 1024 }, // 64MB, matches WhatsApp's own media ceiling roughly
});

router.use(authenticate);

router.post("/connect", whatsapp.connect);
router.get("/status", whatsapp.status);
router.post("/logout", whatsapp.logout);

router.get("/chats", whatsapp.getChats);
router.post("/chats/start", whatsapp.startChat);
router.get("/chats/:chatId/messages", whatsapp.getMessages);
router.post("/chats/:chatId/messages", whatsapp.sendMessage);
router.post("/chats/:chatId/media", upload.single("file"), whatsapp.sendMediaMessage);

module.exports = router;
