// server/server.js - Complete Socket.IO Server Example
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Store active users
const activeUsers = new Map();

// ============ AUTHENTICATION MIDDLEWARE ============
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    // In real app, verify with JWT_SECRET from env
    const decoded = jwt.decode(token); // Mock decode
    if (!decoded) throw new Error('Invalid token');
    
    socket.userId = decoded.userId;
    socket.userName = decoded.userName;
    socket.email = decoded.email;
    next();
  } catch (err) {
    next(new Error('Authentication failed: ' + err.message));
  }
});

// ============ CONNECTION EVENT ============
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.userId} (${socket.socket.id})`);
  
  // Store user info
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    userName: socket.userName,
    email: socket.email,
    status: 'online'
  });
  
  // Notify all users about new user
  io.emit('userConnected', {
    userId: socket.userId,
    userName: socket.userName,
    activeUsers: Array.from(activeUsers.values())
  });
  
  // ============ EXAMPLE 1: CHAT MESSAGES ============
  socket.on('sendMessage', (messageData) => {
    console.log(`💬 Message from ${socket.userName}:`, messageData.text);
    
    const message = {
      id: Date.now(),
      from: socket.userName,
      fromId: socket.userId,
      text: messageData.text,
      timestamp: new Date(),
      avatar: messageData.avatar || 'https://i.pravatar.cc/150?img=' + socket.userId
    };
    
    // Broadcast to all clients
    io.emit('messageReceived', message);
  });
  
  // ============ EXAMPLE 2: TYPING INDICATOR ============
  socket.on('userTyping', (data) => {
    // Broadcast to all except sender
    socket.broadcast.emit('userTyping', {
      userId: socket.userId,
      userName: socket.userName,
      isTyping: data.isTyping
    });
  });
  
  // ============ EXAMPLE 3: NOTIFICATIONS ============
  socket.on('sendNotification', (data) => {
    console.log(`🔔 Notification to ${data.recipientId}:`, data.message);
    
    const notification = {
      id: Date.now(),
      from: socket.userName,
      fromId: socket.userId,
      message: data.message,
      type: data.type || 'info', // 'info', 'warning', 'success'
      timestamp: new Date()
    };
    
    // Send to specific user if online
    const recipient = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === data.recipientId);
    
    if (recipient) {
      recipient.emit('notificationReceived', notification);
    }
  });
  
  // ============ EXAMPLE 4: ROOMS (GROUP CHAT) ============
  socket.on('joinChatRoom', (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.userName} joined room ${roomId}`);
    
    // Notify room members
    io.to(roomId).emit('roomEvent', {
      type: 'userJoined',
      userName: socket.userName,
      message: `${socket.userName} has joined the room`
    });
  });
  
  socket.on('roomMessage', (roomData) => {
    const message = {
      from: socket.userName,
      text: roomData.text,
      timestamp: new Date()
    };
    
    // Send only to specific room
    io.to(roomData.roomId).emit('roomMessageReceived', message);
  });
  
  socket.on('leaveChatRoom', (roomId) => {
    socket.leave(roomId);
    console.log(`👥 User ${socket.userName} left room ${roomId}`);
    
    io.to(roomId).emit('roomEvent', {
      type: 'userLeft',
      userName: socket.userName,
      message: `${socket.userName} has left the room`
    });
  });
  
  // ============ EXAMPLE 5: LIVE UPDATES ============
  socket.on('shareUpdate', (data) => {
    // Broadcast to all except sender
    socket.broadcast.emit('liveUpdate', {
      from: socket.userName,
      update: data.update,
      timestamp: new Date()
    });
  });
  
  // ============ EXAMPLE 6: PRESENCE/STATUS ============
  socket.on('updateStatus', (status) => {
    const user = activeUsers.get(socket.userId);
    if (user) {
      user.status = status; // 'online', 'away', 'busy'
      activeUsers.set(socket.userId, user);
    }
    
    io.emit('userStatusChanged', {
      userId: socket.userId,
      userName: socket.userName,
      status: status
    });
  });
  
  // ============ EXAMPLE 7: GET ACTIVE USERS ============
  socket.on('getActiveUsers', () => {
    socket.emit('activeUsersList', Array.from(activeUsers.values()));
  });
  
  // ============ DISCONNECT ============
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.userId} (Reason: ${reason})`);
    
    activeUsers.delete(socket.userId);
    
    // Notify all users
    io.emit('userDisconnected', {
      userId: socket.userId,
      userName: socket.userName,
      activeUsers: Array.from(activeUsers.values())
    });
  });
  
  // ============ ERROR HANDLING ============
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// ============ REST API ENDPOINTS ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running', activeUsers: activeUsers.size });
});

app.get('/api/active-users', (req, res) => {
  res.json(Array.from(activeUsers.values()));
});

// ============ START SERVER ============
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on http://localhost:${PORT}`);
});

module.exports = { io, server, app };
