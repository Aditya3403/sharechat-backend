import express from 'express';
import mongoose from 'mongoose';
import userRoute from './Routes/Users.js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cloudinary from 'cloudinary';
import './Utils/Connection.js';
import cors from "cors";
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001"
  },
});
app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());


app.use("/user", userRoute);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", (data) => {
    console.log("Message received:", data);
    socket.broadcast.emit("send-message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Listening on port 3000...");
});
