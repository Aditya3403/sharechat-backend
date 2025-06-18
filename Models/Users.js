import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  avatar: {
    public_id: { 
      type: String, 
      required: true 
    },
    url: { 
      type: String, 
      required: true 
    },
  },
  token: { 
    type: String 
  },
  // Array of chat IDs the user participates in
  chats: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat' 
  }],
  // Array of users the current user chats with
  chatWith: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    name: { 
      type: String 
    },
    avatar: {
      public_id: { 
        type: String 
      },
      url: { 
        type: String 
      }
    },
    lastMessage: {
      text: String,
      timestamp: Date,
      read: Boolean
    }
  }],
  notifications: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderAvatar: {
      public_id: String,
      url: String
    },
    message: {
      type: String,
      required: true
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Individual messages stored at user level
  messages: [{
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    },
    // For message status (sent, delivered, read)
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    }
  }],
  // Online status
  isOnline: {
    type: Boolean,
    default: false
  },
  // Last seen timestamp
  lastSeen: {
    type: Date
  },
  // Socket ID for real-time communication
  socketId: {
    type: String
  }
}, { 
  timestamps: true,
  // Add index for better query performance
  indexes: [
    { 'chatWith.userId': 1 },
    { 'messages.chatId': 1 },
    { 'messages.sender': 1 },
    { 'messages.receiver': 1 }
  ]
});

// Virtual for getting unread message count
UserSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(msg => 
    msg.receiver.equals(this._id) && !msg.read
  ).length;
});

// Method to update last message in chatWith
UserSchema.methods.updateChatWith = async function(contactId, message) {
  const chatWithItem = this.chatWith.find(item => 
    item.userId.toString() === contactId.toString()
  );
  
  if (chatWithItem) {
    chatWithItem.lastMessage = {
      text: message.text,
      timestamp: message.timestamp,
      read: message.read
    };
    await this.save();
  }
};

const User = mongoose.model('User', UserSchema);

export default User;