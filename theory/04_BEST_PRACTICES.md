# Socket.IO Architecture & Best Practices

## 1. Architecture Patterns for MERN

### Single Server Architecture (Small Apps)
```
┌─────────────────────────────────────────┐
│         React Client                    │
│     ┌─────────────────────────┐        │
│     │  useSocket Hook          │        │
│     │  - ChatComponent         │        │
│     │  - NotificationComponent │        │
│     └─────────────────────────┘        │
└───────────────────┬─────────────────────┘
          ↕ WebSocket
┌───────────────────┴─────────────────────┐
│    Express + Socket.IO Server           │
│  ┌─────────────────────────────────┐   │
│  │ Connection Handler              │   │
│  │ - Message Events                │   │
│  │ - Notification Events           │   │
│  │ - Room Management               │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ MongoDB                         │   │
│  │ - Messages                      │   │
│  │ - Users                         │   │
│  │ - Notifications                 │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Multi-Server Architecture (Large Apps)
```
┌──────────────────────────────────────────┐
│           React Clients                  │
│      (Multiple concurrent users)         │
└────────────────┬──────────────────────────┘
         ↓       ↓       ↓       ↓
┌─────────────────────────────────────────┐
│         Load Balancer (Nginx)           │
└──────┬──────────────┬──────────┬────────┘
       ↓              ↓          ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Socket.IO #1 │ │ Socket.IO #2 │ │ Socket.IO #3 │
└──────────────┘ └──────────────┘ └──────────────┘
       ↓              ↓          ↓
┌──────────────────────────────────────────┐
│    Redis (Pub/Sub + Session Store)      │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│           MongoDB                        │
└──────────────────────────────────────────┘
```

---

## 2. Common Pitfalls & Solutions

### ❌ Pitfall 1: Multiple Socket Instances

```javascript
// ❌ BAD - Creates new connection on every component
function ChatComponent() {
  useEffect(() => {
    const socket = io('http://localhost:3001'); // New connection!
  }, []); // Wrong: no dependency or missing array
}

// ✅ GOOD - Single connection
const socket = io('http://localhost:3001'); // Outside component

function ChatComponent() {
  useEffect(() => {
    socket.on('message', handler);
    return () => socket.off('message', handler);
  }, []);
}

// ✅ BETTER - Using context
const SocketContext = createContext();

function SocketProvider({ children }) {
  const socketRef = useRef(io('http://localhost:3001'));
  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

function useSocket() {
  return useContext(SocketContext);
}
```

**Interview Answer:**
"Creating multiple socket instances causes:
- Duplicate events firing
- Memory leaks
- Multiple connections to server
- Performance degradation

Solution: Create socket once and share via context or module export."

---

### ❌ Pitfall 2: Memory Leaks

```javascript
// ❌ BAD - Listeners never removed
useEffect(() => {
  socket.on('message', (msg) => {
    setMessages(prev => [...prev, msg]);
  });
  // Missing cleanup!
}, [socket]); // Re-runs on every socket change

// ✅ GOOD - Proper cleanup
useEffect(() => {
  const handleMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
  };
  
  socket.on('message', handleMessage);
  
  return () => {
    socket.off('message', handleMessage); // Clean up
  };
}, [socket]);
```

---

### ❌ Pitfall 3: Not Handling Disconnection

```javascript
// ❌ BAD - Ignores disconnection
socket.emit('message', data);

// ✅ GOOD - Check connection
if (socket.connected) {
  socket.emit('message', data);
} else {
  showError('Not connected to server');
}

// ✅ BETTER - Listen for events
useEffect(() => {
  socket.on('connect', () => setIsOnline(true));
  socket.on('disconnect', () => setIsOnline(false));
  socket.on('connect_error', (error) => setError(error.message));
  
  return () => {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
  };
}, []);
```

---

### ❌ Pitfall 4: Blocking Operations

```javascript
// ❌ BAD - Blocks socket
socket.on('largeData', (data) => {
  expensiveOperation(data); // Blocks everything
  sendResponse();
});

// ✅ GOOD - Use async
socket.on('largeData', async (data) => {
  await expensiveOperationAsync(data);
  sendResponse();
});

// ✅ BETTER - Use worker threads for CPU-heavy work
socket.on('heavyProcessing', async (data) => {
  const result = await workerPool.run(data);
  socket.emit('result', result);
});
```

---

## 3. Performance Optimization

### Strategy 1: Use Namespaces

```javascript
// ✅ Separate concerns
const chatNamespace = io.of('/chat');
const notifyNamespace = io.of('/notifications');
const adminNamespace = io.of('/admin');

// Reduces connection overhead
chatNamespace.on('connection', (socket) => {
  socket.on('message', handleMessage);
});

notifyNamespace.on('connection', (socket) => {
  socket.on('notification', handleNotification);
});
```

### Strategy 2: Batch Messages

```javascript
// ❌ BAD - Sends 100 messages individually
messages.forEach(msg => {
  socket.emit('message', msg);
});

// ✅ GOOD - Batch send
socket.emit('messages', messages);
```

### Strategy 3: Compression

```javascript
// Enable compression on server
const io = socketIo(server, {
  serveClient: false,
  allowUpgrades: true,
  pingInterval: 25000,
  pingTimeout: 60000,
  cookie: false
});

// Middleware to compress large payloads
io.use((socket, next) => {
  socket.on('message', (msg) => {
    if (JSON.stringify(msg).length > 1000) {
      // Compress large messages
    }
  });
  next();
});
```

### Strategy 4: Connection Pooling

```javascript
// Limit connections per user
const MAX_CONNECTIONS_PER_USER = 1;
const userConnections = new Map();

io.use((socket, next) => {
  const userId = socket.userId;
  const count = userConnections.get(userId) || 0;
  
  if (count >= MAX_CONNECTIONS_PER_USER) {
    return next(new Error('Too many connections'));
  }
  
  userConnections.set(userId, count + 1);
  next();
});

socket.on('disconnect', () => {
  const count = userConnections.get(socket.userId);
  if (count > 1) {
    userConnections.set(socket.userId, count - 1);
  } else {
    userConnections.delete(socket.userId);
  }
});
```

---

## 4. Error Handling Strategy

### Server-side

```javascript
// ✅ Good error handling
io.on('connection', (socket) => {
  socket.on('sendMessage', (data, callback) => {
    try {
      if (!data.text) {
        return callback(new Error('Message text required'));
      }
      
      // Process
      const message = saveMessage(data);
      callback(null, message);
      
      // Broadcast
      io.emit('newMessage', message);
    } catch (err) {
      callback(err);
      console.error('Message error:', err);
    }
  });
});
```

### Client-side

```javascript
// ✅ Good error handling
const sendMessage = async (text) => {
  try {
    if (!socket?.connected) {
      throw new Error('Not connected to server');
    }
    
    socket.emit('sendMessage', { text }, (error, response) => {
      if (error) {
        showError(error.message);
      } else {
        addMessage(response);
      }
    });
  } catch (err) {
    showError(err.message);
  }
};
```

---

## 5. Testing Socket.IO

### Unit Test Example

```javascript
// server.test.js
const io = require('socket.io');
const { Server } = require('http');

describe('Socket.IO', () => {
  let socket, ioServer;
  
  beforeEach((done) => {
    const httpServer = new Server();
    ioServer = io(httpServer, { transports: ['websocket'] });
    httpServer.listen(() => {
      const port = httpServer.address().port;
      socket = ioClient(`http://localhost:${port}`, {
        transports: ['websocket']
      });
      socket.on('connect', done);
    });
  });
  
  afterEach(() => {
    ioServer.close();
    socket.close();
  });
  
  it('should receive message', (done) => {
    ioServer.on('connection', (s) => {
      s.on('message', (msg) => {
        expect(msg).toBe('Hello');
        done();
      });
    });
    
    socket.emit('message', 'Hello');
  });
});
```

---

## 6. Monitoring & Debugging

### Check Active Connections

```javascript
// Get connection stats
app.get('/api/stats', (req, res) => {
  const stats = {
    clients: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size,
    namespaces: io.nsps.length
  };
  res.json(stats);
});

// Monitor events
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    console.log(`Event: ${event}`, args);
  });
});
```

### Debug Client-side

```javascript
// Enable debug logs
localStorage.debug = 'socket.io-client:*';
const socket = io('http://localhost:3001', {
  reconnection: true,
  debug: true
});
```

---

## 7. Security Best Practices

```javascript
// ✅ Secure Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: ['https://yourdomain.com'], // Whitelist origins
    credentials: true
  },
  path: '/socket.io/',
  transports: ['websocket'] // Only WebSocket (no polling)
});

// ✅ Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) return next(new Error('No token'));
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.userId = decoded.id;
    next();
  });
});

// ✅ Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// ✅ Input validation
io.on('connection', (socket) => {
  socket.on('sendMessage', (data) => {
    if (!data.text || typeof data.text !== 'string') {
      return socket.emit('error', 'Invalid input');
    }
    if (data.text.length > 5000) {
      return socket.emit('error', 'Message too long');
    }
  });
});
```

---

## Summary

### Do's ✅
- Create socket once, reuse across components
- Use namespaces for organization
- Clean up listeners in useEffect
- Handle disconnections gracefully
- Validate input on server
- Use middleware for auth
- Batch large data transfers

### Don'ts ❌
- Create multiple socket instances
- Forget to cleanup listeners
- Send sensitive data unencrypted
- Block socket with sync operations
- Ignore error handling
- Use polling if WebSocket available
- Store passwords in socket data

Good luck in your interview! 🚀
