import mongoose from "mongoose";

const ChatMediaSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  mediaType: {
    type: String,
    enum: ["image", "video", "document"],
    default: "image"
  },

  url: {
    type: String,
    required: true
  },

  size: Number,
  extension: String,

  originalName: String,   
  mimeType: String,      

  createdAt: {
    type: Date,
    default: Date.now
  },
}, { timestamps: true });

const ChatMedia = mongoose.model("ChatMedia", ChatMediaSchema);
export default ChatMedia;
