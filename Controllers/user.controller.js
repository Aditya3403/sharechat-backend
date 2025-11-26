import User from '../Models/Users.js';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

// User Signup
export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, discoverySource, password } = req.body;
    const file = req.file;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !discoverySource || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required: firstName, lastName, email, phoneNumber, discoverySource, password' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if phone number already exists
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    let avatarData = null;

    // Handle profile picture upload
    if (file) {
      try {
        const result = await streamUpload(file.buffer);
        avatarData = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile picture',
          error: uploadError.message
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Profile picture is required'
      });
    }

    // Validate discovery source
    const validDiscoverySources = ['Google Search', 'Friend Referral', 'Social Media', 'Advertisement', 'Other'];
    if (!validDiscoverySources.includes(discoverySource)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discovery source'
      });
    }

    // Create new user with all fields
    const newUser = new User({
      name: `${firstName} ${lastName}`,
      email,
      phoneNumber,
      discoverySource,
      password,
      avatar: avatarData,
      isVerified: true,
      profileCompleted: true,
      chats: [],
      chatWith: [],
      notifications: [],
      messages: [],
      isOnline: false,
      lastSeen: new Date()
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ 
      id: newUser._id,
      email: newUser.email,
      name: newUser.name
    }, process.env.JWT_SECRET, { 
      expiresIn: '30d' 
    });

    // Save token to user
    newUser.token = token;
    await newUser.save();

    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      discoverySource: newUser.discoverySource,
      avatar: newUser.avatar,
      isVerified: newUser.isVerified,
      profileCompleted: newUser.profileCompleted,
      isOnline: newUser.isOnline,
      lastSeen: newUser.lastSeen,
      token: newUser.token,
      createdAt: newUser.createdAt
    };

    res.status(201).json({ 
      success: true,
      message: 'User created successfully', 
      user: userResponse, 
      token 
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        error: error.message
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

// User Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    user.token = token;
    await user.save();

    res.status(200).json({ 
      success: true,
      message: 'Login successful', 
      user, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

// Get User Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -chats -token');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    res.status(200).json({
      success: true,
      user: {
        name: user.name,
        avatar: user.avatar.url,
        about: user.about,
        joiningDate: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get All Users
export const getAllUsers = async (req, res) => {
    try {
      // Verify the user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: 'Not authenticated' 
        });
      }
  
      const search = req.query.search || '';
      const query = {
        _id: { $ne: req.user._id },
        name: { $regex: search, $options: 'i' }
      };
      
      const users = await User.find(query)
        .select('name avatar _id')
        .catch(err => {
          console.error('Database query error:', err);
          throw new Error('Failed to query users');
        });
  
      res.status(200).json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error fetching users',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

// Get Current User
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('chatWith.userId', 'name avatar')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Add to ChatWith
export const addToChatWith = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user._id;

    if (userId === otherUserId) {
      return res.status(400).json({ message: "Cannot add yourself to chatWith" });
    }

    const otherUser = await User.findById(otherUserId).select('name');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          chatWith: {
            userId: otherUserId,
            name: otherUser.name
          }
        }
      },
      { new: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error adding to chatWith:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
