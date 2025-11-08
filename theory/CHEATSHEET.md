# Socket.IO Cheat Sheet - Quick Reference for Interview

## 1️ ONE-LINER DEFINITIONS

| Term | Definition |
|------|-----------|
| **WebSocket** | Persistent bidirectional TCP connection for real-time data |
| **Socket.IO** | Library on top of WebSocket with fallback, events, rooms |
| **Event** | Custom message type (like 'message', 'typing', 'userOnline') |
| **Room** | Group of sockets for selective broadcasting |
| **Namespace** | Separate logical groups of connections (/chat, /notify) |
| **Emit** | Send an event (server to client or vice versa) |
| **On** | Listen for an event |
| **Broadcast** | Send to all except sender |

---

## 2️⃣ CODE SNIPPETS - COPY PASTE READY

### Server - Connection & Events

```javascript
const io = require('socket.io')(server);

// On user connect
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Listen for message
  socket.on('sendMessage', (data) => {
    io.emit('messageReceived', data); // Send to ALL
  });
  
  // Send to all except sender
  socket.on('userTyping', (data) => {
    socket.broadcast.emit('typingIndicator', data);
  });
  
  // Send to specific room
  socket.on('roomMessage', (roomId, data) => {
    io.to(roomId).emit('roomMessageReceived', data);
  });
  
  // Join room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
  });
  
  // On disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```

### Client - Connect & Listen

```javascript
import io from 'socket.io-client';

// Connect
const socket = io('http://localhost:3001', {
  auth: { token: 'your_token' }
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Listen for custom event
socket.on('messageReceived', (data) => {
  console.log('Message:', data);
});

// Emit event
socket.emit('sendMessage', { text: 'Hello' });

// Listen for disconnect
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### React - useSocket Hook (Best Practice)

```javascript
import { useEffect } from 'react';
import io from 'socket.io-client';

export const useSocket = (token) => {
  const socketRef = useRef(null);
  
  useEffect(() => {
    socketRef.current = io('http://localhost:3001', {
      auth: { token }
    });
    
    return () => socketRef.current?.disconnect();
  }, [token]);
  
  return socketRef.current;
};

// Usage
const socket = useSocket(token);

useEffect(() => {
  socket?.on('message', handler);
  return () => socket?.off('message', handler);
}, [socket]);
```

---

## 3️⃣ SERVER-SIDE EMIT PATTERNS

```javascript
// Send to sender only
socket.emit('event', data);

// Send to all clients
io.emit('event', data);

// Send to all except sender
socket.broadcast.emit('event', data);

// Send to specific room (all)
io.to(roomId).emit('event', data);

// Send to specific room (except sender)
socket.broadcast.to(roomId).emit('event', data);

// Send to specific user
io.to(socketId).emit('event', data);

// Send to namespace
io.of('/chat').emit('event', data);
```

---

## 4️⃣ CLIENT-SIDE EMIT PATTERNS

```javascript
// Send event (no callback)
socket.emit('message', 'Hello');

// Send with callback (ACK)
socket.emit('message', 'Hello', (response) => {
  console.log('Server received:', response);
});

// Join room
socket.emit('joinRoom', roomId);

// Leave room
socket.emit('leaveRoom', roomId);
```

---

## 5️⃣ EVENT TYPES & EXAMPLES

### Built-in Events (Automatic)

```javascript
socket.on('connect', () => {});           // When connected
socket.on('disconnect', () => {});        // When disconnected
socket.on('error', (error) => {});        // Connection error
socket.on('connect_error', (error) => {}); // Auth/connect error
```

### Custom Events (Your Design)

```javascript
// Chat
socket.on('message', (msg) => {});
socket.on('typing', (user) => {});

// Notifications
socket.on('notification', (alert) => {});

// Presence
socket.on('userOnline', (user) => {});
socket.on('userOffline', (user) => {});

// Collaboration
socket.on('docUpdate', (change) => {});
socket.on('cursorMove', (position) => {});
```

---

## 6️⃣ ROOM OPERATIONS

```javascript
// Join room (server)
socket.join(roomId);

// Leave room (server)
socket.leave(roomId);

// Check if in room
socket.rooms // Set of room IDs

// Get all sockets in room
io.to(roomId).emit('event', data);

// Send only to room (not others)
socket.broadcast.to(roomId).emit('event', data);

// Send to multiple rooms
socket.to(room1).to(room2).emit('event', data);

// Send except rooms
socket.broadcast.except(roomId).emit('event', data);
```

---

## 7️⃣ CONNECTION OPTIONS

```javascript
const socket = io('http://localhost:3001', {
  // Authentication
  auth: {
    token: 'xyz'
  },
  
  // Reconnection
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  
  // Transport
  transports: ['websocket', 'polling'],
  
  // Path
  path: '/socket.io/',
  
  // Query parameters
  query: {
    userId: '123'
  }
});
```

---

## 8️⃣ INTERVIEW QUESTIONS - QUICK ANSWERS

| Q | A |
|---|---|
| **What is Socket.IO?** | Library for real-time bidirectional communication with WebSocket fallback |
| **Rooms vs Namespaces?** | Rooms = groups within namespace; Namespaces = separate connection groups |
| **How to auth?** | Use middleware: `io.use((socket, next) => { verify token; next(); })` |
| **Scaling?** | Use Redis adapter: `io.adapter(createAdapter(pubClient, subClient))` |
| **Prevent memory leaks?** | Always cleanup: `socket.off('event', handler)` in useEffect return |
| **Single connection?** | Yes, create once, share via Context or export |
| **Real-time examples?** | Chat, notifications, multiplayer games, live dashboards |
| **Emit vs Broadcast?** | Emit = send to all; Broadcast = send to all except sender |
| **Rooms use?** | Group users (chat rooms), selective broadcasting |
| **Disconnection?** | Listen to 'disconnect' event, handle UI updates |

---

## 9️⃣ COMMON PATTERNS

### Pattern 1: One-to-One Messaging

```javascript
// Server
socket.on('sendDM', (recipientId, message) => {
  io.to(recipientId).emit('dmReceived', {
    from: socket.userId,
    message
  });
});

// Client
socket.emit('sendDM', 'user123', 'Hello!');
socket.on('dmReceived', (data) => console.log(data));
```

### Pattern 2: Typing Indicator

```javascript
// Client
const handleTyping = () => {
  socket.emit('userTyping', { roomId, isTyping: true });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('userTyping', { roomId, isTyping: false });
  }, 2000);
};

// Server
socket.on('userTyping', (data) => {
  socket.broadcast.to(data.roomId).emit('typingStatus', {
    userId: socket.userId,
    isTyping: data.isTyping
  });
});
```

### Pattern 3: Active Users List

```javascript
// Server
const activeUsers = new Map();

io.on('connection', (socket) => {
  activeUsers.set(socket.userId, socket.id);
  io.emit('usersList', Array.from(activeUsers.keys()));
  
  socket.on('disconnect', () => {
    activeUsers.delete(socket.userId);
    io.emit('usersList', Array.from(activeUsers.keys()));
  });
});

// Client
socket.on('usersList', (users) => {
  setActiveUsers(users);
});
```

### Pattern 4: Notifications

```javascript
// Server - Send to user if online
const user = io.sockets.sockets.get(userId);
if (user) {
  user.emit('notification', { message: 'You got a like!' });
} else {
  // Save to DB if offline
  await Notification.create({ userId, message });
}

// Client
socket.on('notification', (data) => {
  showToast(data.message);
});
```

---

## 🔟 DEBUGGING TIPS

```javascript
// Enable debugging (client)
localStorage.debug = 'socket.io-client:*';

// Log all events (server)
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    console.log(`Event: ${event}`, args);
  });
});

// Check connections
console.log(io.engine.clientsCount); // Total clients

// Monitor individual socket
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});

// Get socket info
console.log(socket.id);        // Unique ID
console.log(socket.rooms);     // Rooms joined
console.log(socket.connected); // Is connected?
```

---

## 🔄 COMPARISON QUICK REFERENCE

### WebSocket vs Socket.IO vs HTTP Polling
```
WebSocket: Persistent connection, fast, no fallback
Socket.IO: WebSocket + fallback to polling, events, rooms
Polling: Multiple requests, slow, works everywhere
→ Use Socket.IO for 90% of cases
```

### Socket.IO vs Express
```
Express: HTTP framework, REST APIs, request-response
Socket.IO: Real-time events, bidirectional, persistent
→ Use BOTH together in MERN apps
```

### Socket.IO vs Kafka vs RabbitMQ
```
Socket.IO: Client ↔ Server real-time (<100ms)
Kafka: Stream processing, massive scale, logs
RabbitMQ: Task queues, async jobs
→ Use Socket.IO for real-time web, Kafka/RabbitMQ for backend
```

### Socket.IO vs GraphQL Subscriptions
```
REST: Static queries (no real-time)
GraphQL Subs: Typed queries + real-time (complex setup)
Socket.IO: Easy real-time events (not typed)
→ Use Socket.IO for chat, GraphQL for complex queries
```

### Socket.IO vs SSE (Server-Sent Events)
```
Socket.IO: Bidirectional (client & server send)
SSE: One-way only (server sends to client)
→ Use Socket.IO for chat, SSE for notifications
```

### Socket.IO vs WebRTC
```
Socket.IO: Messages via server, low latency
WebRTC: Direct peer-to-peer, ultra-low latency
→ Use Socket.IO for chat, WebRTC for video/voice
```

### Node.js vs Python vs Java (Real-time)
```
Node.js + Socket.IO: Easiest, fast dev, 1 hour setup
Python + Django: Good for data, 3 hour setup
Java + Spring: Enterprise scale, 5 hour setup
→ Start with Node.js + Socket.IO
```

### Monolith vs Microservices
```
Monolith: Simple Socket.IO setup, limited scale
Microservices: Complex setup, unlimited scale, needs Redis
→ Start monolith, scale with microservices + Redis adapter
```

---

##  PRACTICE SCENARIOS

### Scenario 1: Build a chat app
- Emit 'message' event
- Broadcast to all users
- Show typing indicator
- List active users

### Scenario 2: Build notifications
- User A triggers action
- Notify User B in real-time
- If User B offline, save to DB
- Show badge with count

### Scenario 3: Build presence
- Track who's online
- Update status (online, away, busy)
- Show last seen
- Broadcast to all

### Scenario 4: Build collaborative editor
- Users edit document simultaneously
- Broadcast edits to all
- Show cursor positions
- Handle conflicts

---

