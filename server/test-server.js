// server/test-server.js - Quick test to verify server works
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// ============ SIMPLE TEST SERVER ============
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  // Send welcome message
  socket.emit('welcome', {
    message: 'Welcome to Socket.IO!',
    socketId: socket.id,
    timestamp: new Date()
  });
  
  // Echo test
  socket.on('echo', (data) => {
    console.log('📨 Echo received:', data);
    socket.emit('echo_response', {
      received: data,
      timestamp: new Date()
    });
  });
  
  // Broadcast test
  socket.on('broadcast_test', (data) => {
    console.log('📢 Broadcasting:', data);
    io.emit('broadcast_received', {
      from: socket.id,
      data: data,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    clients: io.engine.clientsCount,
    timestamp: new Date()
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Test Socket.IO server running on http://localhost:${PORT}`);
  console.log('✅ Open browser console and test with:');
  console.log('   socket.emit("echo", "hello")');
  console.log('   socket.emit("broadcast_test", "hello all")');
  console.log('\nPress Ctrl+C to stop\n');
});
