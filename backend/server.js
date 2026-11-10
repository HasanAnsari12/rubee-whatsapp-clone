const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const storyRoutes = require("./routes/storyRoutes");
const aiRoutes = require("./routes/aiRoutes");
const groupRoutes = require("./routes/groupRoutes");
const webrtcRoutes = require("./routes/webrtcRoutes");
const app = express();

// CORS Configuration
const clientUrls = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((u) => u.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...clientUrls,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ])
);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/webrtc", webrtcRoutes);

// Health Check Endpoint (Render & Production Monitoring)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});
// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// Create HTTP server
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Store online users: userId -> socketId
const onlineUsers = {};

// Store active WebRTC calls: userId -> { peerId, status, callType }
const activeCalls = {};

// Socket Connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ==============================
  // User Join
  // ==============================
  socket.on("join", (userId) => {
    if (!userId) return;
    onlineUsers[userId] = socket.id;
    socket.userId = userId.toString();

    console.log("Online Users:", onlineUsers);

    // Sab clients ko online users list bhejo
    io.emit("onlineUsers", Object.keys(onlineUsers));
  });

  // ==============================
  // Send Message
  // ==============================
  socket.on("sendMessage", (data) => {
    const receiverSocketId = onlineUsers[data.receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", data);
    }
  });

  // ==============================
  // Typing Indicator
  // ==============================
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", {
        senderId,
      });
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", {
        senderId,
      });
    }
  });

  // ==============================
  // Mark Messages Seen (Read Receipts)
  // ==============================
  socket.on("markSeen", ({ senderId, receiverId }) => {
    const senderSocketId = onlineUsers[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", { seenBy: receiverId });
    }
  });

  // ==============================
  // Send Reaction
  // ==============================
  socket.on("sendReaction", ({ messageId, reactions, receiverId }) => {
    const receiverSocketId = onlineUsers[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReaction", { messageId, reactions });
    }
  });

  // ==============================
  // Group Chat Sockets
  // ==============================
  socket.on("joinGroupRoom", ({ groupId }) => {
    if (groupId) {
      socket.join(`group_${groupId}`);
    }
  });

  socket.on("leaveGroupRoom", ({ groupId }) => {
    if (groupId) {
      socket.leave(`group_${groupId}`);
    }
  });

  socket.on("sendGroupMessage", (data) => {
    if (data?.groupId) {
      socket.to(`group_${data.groupId}`).emit("receiveGroupMessage", data);
    }
  });

  socket.on("groupTyping", ({ groupId, senderId, senderName }) => {
    if (groupId) {
      socket.to(`group_${groupId}`).emit("userGroupTyping", { groupId, senderId, senderName });
    }
  });

  socket.on("groupStopTyping", ({ groupId, senderId }) => {
    if (groupId) {
      socket.to(`group_${groupId}`).emit("userGroupStopTyping", { groupId, senderId });
    }
  });

  socket.on("groupUpdated", ({ groupId }) => {
    if (groupId) {
      io.to(`group_${groupId}`).emit("groupUpdated", { groupId });
    }
  });

  // ==============================
  // WebRTC Audio/Video Calling
  // ==============================

  // 1. Initiate Call
  socket.on("callUser", ({ userToCall, signalData, callType = "video", callerData = {} }) => {
    const callerId = socket.userId || callerData._id;

    if (!callerId) {
      return socket.emit("callFailed", { reason: "Unauthorized caller" });
    }

    if (callerId.toString() === userToCall.toString()) {
      return socket.emit("callFailed", { reason: "Cannot call yourself" });
    }

    const receiverSocketId = onlineUsers[userToCall];
    if (!receiverSocketId) {
      return socket.emit("callFailed", { reason: "User is currently offline" });
    }

    // Busy check: Callee already in a call
    if (activeCalls[userToCall]) {
      return socket.emit("userBusy", {
        reason: "User is currently busy in another call",
        userId: userToCall,
      });
    }

    // Busy check: Caller already in a call
    if (activeCalls[callerId]) {
      return socket.emit("callFailed", { reason: "You are already in an active call" });
    }

    activeCalls[callerId] = { peerId: userToCall, status: "calling", callType };
    activeCalls[userToCall] = { peerId: callerId, status: "ringing", callType };

    io.to(receiverSocketId).emit("incomingCall", {
      from: callerId,
      callerName: callerData.name || "WhatsApp User",
      callerPic: callerData.profilePic || "",
      callType,
      signal: signalData,
    });
  });

  // 2. Callee acknowledges ringing
  socket.on("callRinging", ({ callerId }) => {
    const callerSocketId = onlineUsers[callerId];
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRinging", { calleeId: socket.userId });
    }
  });

  // 3. Answer Call
  socket.on("answerCall", ({ to, signal }) => {
    const calleeId = socket.userId;
    const callerSocketId = onlineUsers[to];

    if (!callerSocketId) {
      if (calleeId) delete activeCalls[calleeId];
      if (to) delete activeCalls[to];
      return socket.emit("callFailed", { reason: "Caller disconnected" });
    }

    if (activeCalls[calleeId]) activeCalls[calleeId].status = "connected";
    if (activeCalls[to]) activeCalls[to].status = "connected";

    io.to(callerSocketId).emit("callAccepted", {
      signal,
      from: calleeId,
    });
  });

  // 4. Reject Call (Decline or Missed Timeout)
  socket.on("rejectCall", ({ to, reason = "Call declined" }) => {
    const currentUserId = socket.userId;

    if (currentUserId && activeCalls[currentUserId]) {
      delete activeCalls[currentUserId];
    }
    if (to && activeCalls[to]) {
      delete activeCalls[to];
    }

    const callerSocketId = onlineUsers[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected", {
        reason,
        from: currentUserId,
      });
    }
  });

  // 5. End Call (Hang up)
  socket.on("endCall", ({ to }) => {
    const currentUserId = socket.userId;

    if (currentUserId && activeCalls[currentUserId]) {
      delete activeCalls[currentUserId];
    }
    if (to && activeCalls[to]) {
      delete activeCalls[to];
    }

    const remoteSocketId = onlineUsers[to];
    if (remoteSocketId) {
      io.to(remoteSocketId).emit("callEnded", {
        from: currentUserId,
      });
    }
  });

  // 6. ICE Candidate Exchange
  socket.on("iceCandidate", ({ to, candidate }) => {
    const targetSocketId = onlineUsers[to];
    if (targetSocketId && candidate) {
      io.to(targetSocketId).emit("receiveIceCandidate", {
        candidate,
        from: socket.userId,
      });
    }
  });

  // ==============================
  // Disconnect
  // ==============================
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const disconnectedUserId =
      socket.userId ||
      Object.keys(onlineUsers).find((uid) => onlineUsers[uid] === socket.id);

    if (disconnectedUserId) {
      // Terminate any ongoing call
      if (activeCalls[disconnectedUserId]) {
        const peerId = activeCalls[disconnectedUserId].peerId;
        const peerSocketId = onlineUsers[peerId];
        if (peerSocketId) {
          io.to(peerSocketId).emit("callEnded", {
            reason: "Peer disconnected",
            from: disconnectedUserId,
          });
        }
        delete activeCalls[peerId];
        delete activeCalls[disconnectedUserId];
      }

      delete onlineUsers[disconnectedUserId];
    }

    // Updated online users list broadcast karo
    io.emit("onlineUsers", Object.keys(onlineUsers));
  });
});

// Global Production Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error("Unhandled API Error:", err.message);

  res.status(statusCode).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});