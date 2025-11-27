import User from '../Models/Users.js';
import Chat from '../Models/Chat.js';
import ChatMedia from '../Models/ChatMedia.js';
import cloudinary from 'cloudinary';
import { Readable } from 'stream';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploader = cloudinary.v2.uploader.upload_stream(
      { resource_type: "auto", folder: "chat_media" },
      (err, result) => {
        if (result) resolve(result);
        else reject(err);
      }
    );

    Readable.from(buffer).pipe(uploader);
  });
};

export const sendMessage = async (req, res) => {
  try {
    const { userId, otherUserId, message } = req.body;
    if (!userId || !otherUserId || !message) {
      return res.status(400).json({ message: 'Sender, receiver and message are required' });
    }

    const sender = await User.findById(userId).select("name avatar");
    const receiver = await User.findById(otherUserId).select("name avatar");

    // find or create chat
    let chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] }
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [userId, otherUserId],
        messages: []
      });
    }

    const newMessage = {
      sender: userId,
      receiver: otherUserId,
      text: message,
      time: new Date(),
      read: false
    };

    chat.messages.push(newMessage);
    await chat.save();

    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        chatWith: {
          userId: otherUserId,
          name: receiver.name,
          avatar: receiver.avatar,
          lastMessage: {
            text: message,
            timestamp: new Date(),
            read: false
          }
        }
      }
    });

    await User.findByIdAndUpdate(otherUserId, {
      $addToSet: {
        chatWith: {
          userId: userId,
          name: sender.name,
          avatar: sender.avatar,
          lastMessage: {
            text: message,
            timestamp: new Date(),
            read: false
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.log("ERR sending message:", error);
    return res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

export const sendMessageSocket = async (senderId, receiverId, message) => {
  try {
    // Get sender details for notification
    const sender = await User.findById(senderId).select('name avatar');
    if (!sender) {
      throw new Error('Sender not found');
    }

    // Find or create chat
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] }
    }) || new Chat({ 
      participants: [senderId, receiverId], 
      messages: [] 
    });

    // Create message
    const newMessage = {
      sender: senderId,
      receiver: receiverId,
      text: message,
      time: new Date().toISOString(),
      read: false
    };

    // Add message to chat
    chat.messages.push(newMessage);
    await chat.save();

    // Update both users' messages arrays
    await User.findByIdAndUpdate(senderId, {
      $push: { messages: newMessage },
      $addToSet: { chats: chat._id }
    });
    
    // Update receiver with message and add notification
    await User.findByIdAndUpdate(receiverId, {
      $push: { 
        messages: newMessage,
        notifications: {
          sender: senderId,
          senderName: sender.name,
          senderAvatar: sender.avatar,
          message: message,
          chatId: chat._id,
          read: false
        }
      },
      $addToSet: { chats: chat._id }
    });

    return newMessage;
  } catch (error) {
    console.error('Error in sendMessageSocket:', error);
    throw error;
  }
};

// Controller function to get messages between two users
export const getUserMessages = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    const chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] }
    })
    .populate({
      path: "messages.mediaId",
      model: "ChatMedia",
      select: "url mediaType"
    });

    if (!chat) return res.json([]);

    const formatted = chat.messages.map(m => ({
      _id: m._id,
      sender: m.sender,
      receiver: m.receiver,
      text: m.text || "",
      mediaUrl: m.mediaId ? m.mediaId.url : null,      
      mediaType: m.mediaId ? m.mediaId.mediaType : null,
      timestamp: m.time,                               
      read: m.read,
      status: m.status
    }));

    return res.json(formatted);

  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};


// Controller function to mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    let updated = false;
    chat.messages.forEach(msg => {
      if (msg.receiver.toString() === userId && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });
    
    if (updated) {
      await chat.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Controller function to create or find a chat
export const findOrCreateChat = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;

    console.log('Received request to start chat with:', req.body);

    let chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, otherUserId],
        messages: [],
      });
      await chat.save();
      
      // Update both users' chats array
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { chats: chat._id } }
      );
      
      await User.findByIdAndUpdate(
        otherUserId,
        { $addToSet: { chats: chat._id } }
      );
    }

    console.log('Chat created or found:', chat);

    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating or finding chat:', error);
    res.status(500).json({ message: 'Error creating or finding chat', error });
  }
};

// Controller function to get all chats for a user
export const getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find chats where the user is a participant
    const chats = await Chat.find({
      participants: userId
    }).populate({
      path: 'participants',
      select: 'name avatar'
    });
    
    res.status(200).json({
      success: true,
      chats
    });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

export const addToChatWith = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;
    
    // Validate inputs
    if (!userId || !otherUserId) {
      return res.status(400).json({ message: 'Both userId and otherUserId are required' });
    }
    
    // Check if users are the same
    if (userId === otherUserId) {
      return res.status(400).json({ message: 'Cannot add yourself to chat list' });
    }
    
    // Get the other user's name
    const otherUser = await User.findById(otherUserId).select('name');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // First check if the user already exists in the chatWith array
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }
    
    // Check if the user is already in the chatWith array
    const existingChat = currentUser.chatWith.find(chat => 
      chat.userId.toString() === otherUserId.toString()
    );
    
    if (existingChat) {
      // If the user exists but name might have changed, update the name
      if (existingChat.name !== otherUser.name) {
        await User.updateOne(
          { 
            _id: userId, 
            'chatWith.userId': otherUserId 
          },
          { 
            $set: { 'chatWith.$.name': otherUser.name } 
          }
        );
        return res.status(200).json({ 
          success: true, 
          message: 'Chat contact name updated' 
        });
      }
      
      // If user already exists with same name, just return success
      return res.status(200).json({ 
        success: true, 
        message: 'User already in chat contacts' 
      });
    }

    // Add to chatWith array if not already present
    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          chatWith: {
            userId: otherUserId,
            name: otherUser.name
          }
        }
      }
    );

    res.status(200).json({ 
      success: true,
      message: 'User added to chat contacts'
    });
  } catch (error) {
    console.error('Error adding to chatWith:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

export const sendImageMessage = async (req, res) => {
  try {
    const { userId, otherUserId, chatId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const sender = await User.findById(userId).select("name avatar");
    const receiver = await User.findById(otherUserId).select("name avatar");

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Invalid sender or receiver" });
    }

    const uploaded = await uploadToCloudinary(req.file.buffer);

    let chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [userId, otherUserId],
        messages: []
      });
    }

    const media = await ChatMedia.create({
      chatId: chat._id,
      sender: userId,
      receiver: otherUserId,
      mediaType: "image",
      url: uploaded.secure_url,
      originalName: req.file.originalname
    });

    const msg = {
      sender: userId,
      receiver: otherUserId,
      text: "",
      time: new Date(),
      read: false,
      status: "sent",
      mediaId: media._id,
    };

    chat.messages.push(msg);
    await chat.save();

    await User.findByIdAndUpdate(userId, {
      $push: { messages: { ...msg, chatId: chat._id } },
      $addToSet: { chats: chat._id }
    });

    await User.findByIdAndUpdate(otherUserId, {
      $push: { messages: { ...msg, chatId: chat._id } },
      $addToSet: { chats: chat._id }
    });

    const lastMsgObj = {
      text: "(Image)",
      timestamp: msg.time,
      read: false,
    };

    await User.findOneAndUpdate(
      { _id: userId, "chatWith.userId": otherUserId },
      { $set: { "chatWith.$.lastMessage": lastMsgObj } }
    );

    await User.findOneAndUpdate(
      { _id: userId, "chatWith.userId": { $ne: otherUserId } },
      {
        $push: {
          chatWith: {
            userId: otherUserId,
            name: receiver.name,
            avatar: receiver.avatar,
            lastMessage: lastMsgObj
          }
        }
      }
    );

    await User.findOneAndUpdate(
      { _id: otherUserId, "chatWith.userId": userId },
      { $set: { "chatWith.$.lastMessage": lastMsgObj } }
    );

    await User.findOneAndUpdate(
      { _id: otherUserId, "chatWith.userId": { $ne: userId } },
      {
        $push: {
          chatWith: {
            userId: userId,
            name: sender.name,
            avatar: sender.avatar,
            lastMessage: lastMsgObj
          }
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: msg,
      mediaId: media._id,
      chatId: chat._id,
      mediaUrl: media.url,
    });

  } catch (error) {
    console.error("Error sending image:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};





