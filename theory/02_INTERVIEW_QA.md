# Socket.IO Interview Questions & Answers

## TOP 10 INTERVIEW QUESTIONS

---

### Q1: What is Socket.IO? How is it different from WebSocket?

**Expected Answer:**

"Socket.IO is a real-time communication library built on top of WebSocket that provides higher-level features like events, rooms, and namespaces. While WebSocket is a low-level protocol, Socket.IO adds abstraction layers.

**Key Differences:**
1. **Fallback Support**: If WebSocket isn't available, Socket.IO falls back to long-polling
2. **Events**: Socket.IO supports custom named events; WebSocket uses raw messages
3. **Rooms**: Socket.IO has built-in room support for group messaging
4. **Reconnection**: Socket.IO handles reconnection automatically
5. **Middleware**: Socket.IO supports middleware for authentication

**Real Example in MERN:**
```javascript
// Socket.IO - Easy to use
socket.emit('userTyping', { name: 'John' });
socket.on('userTyping', (data) => console.log(data.name));

// Raw WebSocket - More complex
socket.send(JSON.stringify({ type: 'userTyping', name: 'John' }));
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if(data.type === 'userTyping') console.log(data.name);
};
```"

---

### Q2: How do you handle multiple Socket.IO connections in React?

**Expected Answer:**

"In React, you should create a single socket connection instance and reuse it across components. Use a Context API or custom hook to manage the socket.

**Good Pattern:**
```javascript
// socket.js - Create single instance
import io from 'socket.io-client';
export const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// useSocket.js - Custom hook
export const useSocket = () => {
  useEffect(() => {
    socket.connect();
    return () => {
      // Optional: uncomment to disconnect on unmount
      // socket.disconnect();
    };
  }, []);
  return socket;
};

// ChatComponent.js
export const ChatComponent = () => {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    socket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    return () => socket.off('newMessage');
  }, [socket]);
};
```

**Why this works:**
- Single connection prevents duplicate events
- Custom hook encapsulates socket logic
- Proper cleanup prevents memory leaks"

---

### Q3: What are Rooms and Namespaces? When would you use them?

**Expected Answer:**

"**Rooms** and **Namespaces** are used to organize and segment socket connections.

**Rooms:**
- Group users for selective broadcasting
- Use case: Chat rooms, group notifications
- Same namespace, different rooms
- Users can join/leave rooms dynamically

**Namespaces:**
- Separate logical groups of connections
- Use case: `/chat`, `/notifications`, `/admin`
- Different event handlers per namespace
- Better organization for large apps

**Real Example:**
```javascript
// SERVER
io.on('connection', (socket) => {
  // Rooms - for group chat
  socket.on('joinChatRoom', (roomId) => {
    socket.join(roomId);
    io.to(roomId).emit('userJoined', socket.id);
  });
  
  socket.on('sendMessage', (roomId, msg) => {
    io.to(roomId).emit('messageReceived', msg);
  });
});

// Namespaces - for feature separation
const chatNamespace = io.of('/chat');
const notificationNamespace = io.of('/notifications');

chatNamespace.on('connection', (socket) => {
  socket.on('message', (msg) => {
    chatNamespace.emit('messageReceived', msg);
  });
});

notificationNamespace.on('connection', (socket) => {
  socket.on('notify', (alert) => {
    notificationNamespace.emit('alert', alert);
  });
});

// CLIENT
const chatSocket = io('http://localhost:3001/chat');
const notifySocket = io('http://localhost:3001/notifications');
```

**When to use:**
- **Rooms**: Same type of connections but grouped (like different chat rooms)
- **Namespaces**: Different types of connections (chat vs notifications vs admin)"

---

### Q4: How do you handle authentication in Socket.IO?

**Expected Answer:**

"Use middleware and query parameters during handshake to authenticate connections.

**Best Practice:**
```javascript
// SERVER
const io = require('socket.io')(server);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Authenticated user:', socket.userId);
});

// CLIENT (React)
const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
});
```

**Key Points:**
- Validate token before socket connects
- Store userId in socket for later reference
- Handle invalid tokens gracefully"

---

### Q5: Explain how you'd build a real-time notification system

**Expected Answer:**

"A notification system needs to:
1. Send targeted notifications to specific users
2. Persist notifications in DB
3. Handle offline users (show when they come online)

**Implementation:**
```javascript
// SERVER
io.on('connection', (socket) => {
  // User comes online
  socket.on('userOnline', async (userId) => {
    socket.userId = userId;
    
    // Get pending notifications from DB
    const notifications = await Notification.find({ 
      userId, 
      read: false 
    });
    
    socket.emit('pendingNotifications', notifications);
    
    // Broadcast to others that user is online
    io.emit('userStatus', { userId, status: 'online' });
  });

  // Send notification
  socket.on('sendNotification', async (data) => {
    const notification = await Notification.create({
      from: socket.userId,
      to: data.recipientId,
      message: data.message,
      read: false
    });
    
    // Send to user if online
    io.to(`user_${data.recipientId}`).emit('notification', notification);
  });

  socket.on('disconnect', () => {
    io.emit('userStatus', { userId: socket.userId, status: 'offline' });
  });
});

// CLIENT (React)
useEffect(() => {
  socket.emit('userOnline', userId);
  
  socket.on('pendingNotifications', (notifications) => {
    setPendingNotifications(notifications);
  });
  
  socket.on('notification', (notification) => {
    setPendingNotifications(prev => [...prev, notification]);
    showToast(notification.message);
  });
}, [socket, userId]);
```

**Real-life Use Case:**
- LinkedIn: When someone likes your post
- Facebook: Message request notifications
- E-commerce: Order status updates"

---

### Q6: How do you handle disconnections and reconnections?

**Expected Answer:**

"Socket.IO has built-in reconnection, but you should handle edge cases.

```javascript
// CLIENT
const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000, // Start with 1s
  reconnectionDelayMax: 5000, // Max 5s
  reconnectionAttempts: 5 // Try 5 times
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected client, try to reconnect
    socket.connect();
  }
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error);
  if (socket.active) {
    // Keep trying
  } else {
    // Stop retrying after max attempts
  }
});

// Handle graceful state management
const [isOnline, setIsOnline] = useState(socket.connected);

useEffect(() => {
  socket.on('connect', () => setIsOnline(true));
  socket.on('disconnect', () => setIsOnline(false));
  
  return () => {
    socket.off('connect');
    socket.off('disconnect');
  };
}, []);
```

**Real Scenario:**
- User on mobile, signal drops → Socket.IO reconnects automatically
- Server restarts → Client waits, then reconnects
- Network switch (WiFi to 4G) → Seamless reconnection"

---

### Q7: How would you scale Socket.IO with multiple servers?

**Expected Answer:**

"With multiple Node.js servers, you need a way to share events across instances using an adapter like Redis.

```javascript
// With Redis Adapter
const io = require('socket.io')(server);
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});

// Now events work across servers
io.on('connection', (socket) => {
  socket.on('message', (msg) => {
    // Sent to ALL servers and their clients
    io.emit('message', msg);
  });
});
```

**Why Redis:**
- Pub/Sub mechanism
- All servers see the same events
- Users can connect to any server

**Real Example:**
- Netflix: Millions of concurrent connections
- Uber: Ride notifications across servers
- Discord: Message synchronization"

---

### Q8: What's the difference between emit, broadcast, and to?

**Expected Answer:**

```javascript
// SERVER
io.on('connection', (socket) => {
  socket.on('message', (msg) => {
    
    // 1. socket.emit() - Send ONLY to THIS client
    socket.emit('response', 'Only me');
    
    // 2. socket.broadcast.emit() - Send to ALL except THIS client
    socket.broadcast.emit('newMessage', msg);
    
    // 3. io.emit() - Send to ALL clients (including sender)
    io.emit('globalUpdate', msg);
    
    // 4. io.to().emit() - Send to specific room
    io.to('room123').emit('roomMessage', msg);
    
    // 5. socket.broadcast.to().emit() - Send to room except sender
    socket.broadcast.to('room123').emit('roomMessage', msg);
  });
});
```

**Visual:**
```
socket.emit('test')          → [THIS CLIENT]
socket.broadcast.emit()      → [ALL except THIS]
io.emit()                    → [ALL including THIS]
io.to(room).emit()           → [ROOM only]
socket.broadcast.to().emit() → [ROOM except THIS]
```"

---

### Q9: How do you prevent memory leaks with Socket.IO in React?

**Expected Answer:**

"Always cleanup event listeners and handle disconnections properly.

```javascript
// ❌ BAD - Memory leak
const ChatComponent = () => {
  const socket = io('http://localhost:3001');
  
  socket.on('message', (msg) => {
    console.log(msg); // Listener never removed!
  });
};

// ✅ GOOD - Proper cleanup
const ChatComponent = () => {
  const socket = useSocket();
  
  useEffect(() => {
    const handleMessage = (msg) => {
      console.log(msg);
    };
    
    socket.on('message', handleMessage);
    
    return () => {
      socket.off('message', handleMessage); // ✅ Remove listener
    };
  }, [socket]);
};

// ✅ BETTER - Using useSocket hook with cleanup
export const useSocket = () => {
  const socketRef = useRef(null);
  
  useEffect(() => {
    socketRef.current = io('http://localhost:3001');
    
    return () => {
      socketRef.current.disconnect(); // ✅ Clean disconnect
    };
  }, []);
  
  return socketRef.current;
};
```

**Key Rules:**
1. Always use `socket.off()` in cleanup
2. Use dependency arrays correctly
3. Disconnect on component unmount
4. Don't create new connections in effects without deps"

---

### Q10: Design a real-time collaborative text editor using Socket.IO

**Expected Answer:**

"A collaborative editor needs to sync edits across multiple users in real-time.

```javascript
// SERVER - Simple operational transformation
io.on('connection', (socket) => {
  socket.on('joinDocument', (docId) => {
    socket.join(docId);
    socket.emit('loadDocument', documents[docId] || '');
  });
  
  socket.on('edit', (docId, content, position) => {
    documents[docId] = content;
    
    // Broadcast to all in room except sender
    socket.broadcast.to(docId).emit('remoteEdit', {
      content,
      position,
      userId: socket.id
    });
  });
  
  socket.on('disconnect', () => {
    socket.broadcast.emit('userLeft', socket.id);
  });
});

// CLIENT (React)
const CollabEditor = ({ docId }) => {
  const socket = useSocket();
  const [content, setContent] = useState('');
  const [remoteEdits, setRemoteEdits] = useState([]);
  
  useEffect(() => {
    socket.emit('joinDocument', docId);
    
    socket.on('loadDocument', (initialContent) => {
      setContent(initialContent);
    });
    
    socket.on('remoteEdit', ({ content, position, userId }) => {
      // Apply remote edit
      setContent(content);
      setRemoteEdits(prev => [...prev, { userId, position }]);
    });
    
    return () => socket.off('loadDocument');
  }, [socket, docId]);
  
  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    socket.emit('edit', docId, newContent, e.target.selectionStart);
  };
  
  return <textarea value={content} onChange={handleChange} />;
};
```

**Real-life Examples:**
- Google Docs
- Figma
- Notion
- VS Code Live Share"

---

## BONUS: Quick Reference

### Socket.IO Event Lifecycle
```
1. Connection: socket.on('connect')
2. Custom events: socket.on('customEvent')
3. Disconnection: socket.on('disconnect')
```

### Common Properties
```
socket.id              // Unique identifier
socket.rooms           // Set of rooms joined
socket.handshake.auth  // Auth data from client
socket.disconnect()    // Disconnect client
```

### Connection Options (Client)
```javascript
io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  query: { token: 'xyz' }
})
```

---

## Tips for Interview

1. **Start Simple**: Explain what, then how, then why
2. **Use Examples**: Always have MERN-specific examples ready
3. **Show Real-world Use**: Link to actual products (LinkedIn, Uber, etc)
4. **Handle Edge Cases**: Discuss reconnection, authentication, scaling
5. **Ask Clarifying Questions**: "Would this be for one server or multiple?"
6. **Mention Performance**: Think about 1000+ concurrent users

Good luck! 🚀
