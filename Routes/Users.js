import express from 'express';
import User from '../Models/Users.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cloudinary from 'cloudinary';
import { Readable } from 'stream';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

cloudinary.config({
  cloud_name: 'memoriesshare',
  api_key: '499337929461178',
  api_secret: 'AVtfSMH1XcIPB0YFBkQQ1lQiggo',
  secure: true,
});

const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream((error, result) => {
      if (result) {
        resolve(result);
      } else {
        reject(error);
      }
    });
    Readable.from(buffer).pipe(stream);
  });
};

router.post('/signup', upload.single('image'), async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload image to Cloudinary
    const result = await streamUpload(file.buffer);

    const newUser = new User({
      name: `${firstName} ${lastName}`,
      email,
      password,
      avatar: {
        public_id: result.public_id,
        url: result.secure_url,
      },
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, 'your_jwt_secret', { expiresIn: '30d' });

    // Store the token in MongoDB (optional, if needed)
    newUser.token = token;
    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser, token });
  } catch (error) {
    console.error('Error during signup:', error.message, error.stack);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, 'your_jwt_secret', { expiresIn: '30d' });

    // Store the token in MongoDB (optional, if needed)
    user.token = token;
    await user.save();

    res.status(200).json({ message: 'Login successful', user, token });
  } catch (error) {
    console.error('Error during login:', error.message, error.stack);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(403).send('Token is required.');

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) return res.status(401).send('Invalid Token');
    req.user = user;
    next();
  });
};

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).send('User not found');
    res.json(user);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

export default router;
