import express from 'express';
import multer from 'multer';
import { 
  sendMessage, 
  getUserMessages, 
  markMessagesAsRead, 
  findOrCreateChat,
  getUserChats,
  addToChatWith
} from '../Controllers/chat.controller.js';
import { sendImageMessage } from '../Controllers/chat.controller.js';
import { verifyToken } from '../Middlewares/verifyToken.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/chat-media",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

router.post('/messages', verifyToken, sendMessage);
router.get('/messages/user/:userId/:otherUserId', verifyToken, getUserMessages);
router.put('/messages/read/:chatId', verifyToken, markMessagesAsRead);
router.post('/chats/find-or-create', verifyToken, findOrCreateChat);
router.get('/chats/user/:userId', verifyToken, getUserChats);
router.post('/chat-contacts/add', verifyToken, addToChatWith);

router.post("/send-image", verifyToken, upload.single("image"), sendImageMessage);

export default router;