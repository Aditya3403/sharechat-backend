import jwt from 'jsonwebtoken';
import User from '../Models/Users.js';
import dotenv from "dotenv" ;
dotenv.config();

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ 
      success: false,
      message: 'Token is required.' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid Token' 
      });
    }
    
    try {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Server error during token verification' 
      });
    }
  });
};
