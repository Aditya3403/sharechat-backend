import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [{
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
      default: ""
    },
    time: {
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
    },
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMedia",
      default: null,
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ChatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.updatedAt = Date.now();
  }
  next();
});

const Chat = mongoose.model('Chat', ChatSchema);

export default Chat;