import express from 'express';
import mongoose from 'mongoose';
import userRoute from './Routes/Users.js';
import chatRoute from './Routes/Chat.js';
import notificationsRoute from './Routes/Notifications.js';
import User from './Models/Users.js';
import Chat from './Models/Chat.js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import './Utils/Connection.js';
import { sendMessageSocket } from './Controllers/chat.controller.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    credentials: true
  },
});

app.use(cors({
  origin: [ "http://localhost:3001","http://localhost:3002"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use("/user", userRoute);
app.use("/chat", chatRoute);
app.use("/notifications", notificationsRoute);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("register-user", (userId) => {
    socket.userId = userId;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

socket.on("send-message", async ({ sender, receiver, message, timestamp }) => {
  try {
    const savedMessage = await sendMessageSocket(sender, receiver, message);
    
    const receiverSockets = Array.from(io.sockets.sockets.values())
      .filter(s => s.userId === receiver);
    
    receiverSockets.forEach(s => {
      s.emit("receive-message", {
        sender,
        message,
        timestamp: savedMessage.time
      });
    });
    
    socket.emit("message-sent", {
      success: true,
      message: savedMessage
    });
    
  } catch (error) {
    console.error("Error processing message:", error);
    socket.emit("message-error", {
      error: "Failed to send message"
    });
  }
});

  socket.on("disconnect", () => {
    console.log(`User ${socket.userId || socket.id} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});