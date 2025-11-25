import express from 'express';
import { 
  signup,
  login,
  getProfile,
  getAllUsers,
  getCurrentUser,
  addToChatWith,
} from '../Controllers/user.controller.js';
import { sendOTP, verifyOTP } from '../Controllers/auth.controller.js';

import { verifyToken } from '../Middlewares/verifyToken.js';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post('/signup', upload.single('image'), signup);
router.post('/login', login);

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

router.get('/profile', verifyToken, getProfile);
router.get('/me', verifyToken, getCurrentUser);
router.get('/all', verifyToken, getAllUsers);
router.post('/add-to-chatwith', verifyToken, addToChatWith);

export default router;