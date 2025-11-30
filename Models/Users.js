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
    default: null 
  },
  phoneNumber: {
    type: String,
    default: null
  },
  discoverySource: {
    type: String,
    default: null,
    enum: ['Google Search', 'Friend Referral', 'Social Media', 'Advertisement', 'Other']
  },
  avatar: {
    public_id: { 
      type: String, 
      default: null 
    },
    url: { 
      type: String, 
      default: "" 
    },
  },
  token: { 
    type: String 
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  chats: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat' 
  }],
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
      default:""
    },
    mediaType: {
      type: String,
      enum: ["image", "video", "document"],
      default: "image"
    },

    mediaUrl: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    }
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date
  },
  socketId: {
    type: String
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  accountCreatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  indexes: [
    { 'chatWith.userId': 1 },
    { 'messages.chatId': 1 },
    { 'messages.sender': 1 },
    { 'messages.receiver': 1 },
    { phoneNumber: 1 },
    { discoverySource: 1 }
  ]
});

UserSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(msg => 
    msg.receiver.equals(this._id) && !msg.read
  ).length;
});

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

UserSchema.methods.markProfileCompleted = async function() {
  this.profileCompleted = true;
  await this.save();
};

const User = mongoose.model('User', UserSchema);

export default User;