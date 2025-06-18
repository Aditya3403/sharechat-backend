import express from 'express';
import { 
  sendMessage, 
  getUserMessages, 
  markMessagesAsRead, 
  findOrCreateChat,
  getUserChats,
  addToChatWith
} from '../Controllers/chat.controller.js';
import { verifyToken } from '../Middlewares/verifyToken.js';

const router = express.Router();

router.post('/messages', verifyToken, sendMessage);
router.get('/messages/user/:userId/:otherUserId', verifyToken, getUserMessages);
router.put('/messages/read/:chatId', verifyToken, markMessagesAsRead);
router.post('/chats/find-or-create', verifyToken, findOrCreateChat);
router.get('/chats/user/:userId', verifyToken, getUserChats);
router.post('/chat-contacts/add', verifyToken, addToChatWith);

export default router;