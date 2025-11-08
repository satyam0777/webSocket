# Socket.IO Real-time Examples & Scenarios

## Example 1: Real-time Chat Application

### Scenario: Building LinkedIn-style messaging

**Interview Answer:**
"For a real-time chat application like LinkedIn, I would:

1. **Server Setup** - Create a Socket.IO server with message persistence
2. **Rooms** - Use rooms for one-to-one chats (roomId = sorted user IDs)
3. **Events** - Emit 'message' and 'messageRead' events
4. **Scaling** - Use Redis adapter for multiple servers

```javascript
// SERVER
io.on('connection', (socket) => {
  socket.on('openChat', (userId) => {
    const roomId = [socket.userId, userId].sort().join('_');
    socket.join(roomId);
    
    // Fetch chat history from MongoDB
    const messages = await Message.find({ roomId }).limit(50);
    socket.emit('chatHistory', messages);
  });
  
  socket.on('sendMessage', async (data) => {
    const message = await Message.create({
      from: socket.userId,
      to: data.to,
      text: data.text,
      timestamp: new Date()
    });
    
    io.to(roomId).emit('newMessage', message);
  });
});

// CLIENT
const [messages, setMessages] = useState([]);

useEffect(() => {
  socket.emit('openChat', otherUserId);
  socket.on('chatHistory', (history) => setMessages(history));
  socket.on('newMessage', (msg) => setMessages(prev => [...prev, msg]));
}, [otherUserId]);
```

**Real-life Use:**
- LinkedIn messages
- Facebook Messenger
- WhatsApp Web"

---

## Example 2: Typing Indicators & Presence

### Scenario: Show when someone is typing

**Interview Answer:**
"Typing indicators create a more natural communication feel. Implementation:

```javascript
// CLIENT - Send typing event
const handleTyping = () => {
  socket.emit('userTyping', { 
    roomId, 
    isTyping: true 
  });
};

// Debounce when user stops
useEffect(() => {
  const timeout = setTimeout(() => {
    socket.emit('userTyping', { 
      roomId, 
      isTyping: false 
    });
  }, 2000);
  
  return () => clearTimeout(timeout);
}, [inputValue]);

// SERVER - Broadcast typing status
socket.on('userTyping', (data) => {
  io.to(data.roomId).emit('typingStatus', {
    userId: socket.userId,
    isTyping: data.isTyping
  });
});
```

**Real-life Use:**
- Slack (shows 'User is typing...')
- WhatsApp
- Gmail
- Discord"

---

## Example 3: Live Notifications

### Scenario: Multi-channel notifications

**Interview Answer:**
"For notifications like Facebook likes or Instagram follows:

```javascript
// SERVER - Notify specific user
socket.on('likePost', async (postId) => {
  const post = await Post.findByIdAndUpdate(
    postId, 
    { $inc: { likes: 1 } }
  );
  
  // Notify post owner
  const targetUser = io.sockets.sockets.get(post.ownerSocketId);
  if (targetUser) {
    targetUser.emit('notification', {
      type: 'like',
      from: socket.userId,
      postId: postId,
      message: `${socket.userName} liked your post`
    });
  } else {
    // Save to database if user offline
    await Notification.create({
      userId: post.userId,
      type: 'like',
      data: { postId, from: socket.userId }
    });
  }
});

// CLIENT - Handle notifications
useEffect(() => {
  socket.on('notification', (notif) => {
    // Show toast
    showToast(notif.message, notif.type);
    
    // Update notification count
    setUnreadCount(prev => prev + 1);
  });
}, [socket]);
```

**Real-life Use:**
- LinkedIn notifications
- Instagram likes/comments
- Facebook friend requests
- YouTube subscriptions"

---

## Example 4: Live Analytics/Dashboards

### Scenario: Real-time metrics dashboard

**Interview Answer:**
"For dashboards that need live updates (like Google Analytics):

```javascript
// SERVER - Broadcasting metrics
setInterval(() => {
  const metrics = {
    activeUsers: io.engine.clientsCount,
    messageCount: messageStore.length,
    cpuUsage: os.cpus(),
    memory: process.memoryUsage()
  };
  
  io.emit('dashboardUpdate', metrics);
}, 1000);

// CLIENT - Display real-time metrics
const [metrics, setMetrics] = useState({});

useEffect(() => {
  socket.on('dashboardUpdate', (data) => {
    setMetrics(data);
  });
}, [socket]);

return (
  <Dashboard>
    <Card title=\"Active Users\">{metrics.activeUsers}</Card>
    <Card title=\"Messages\">{metrics.messageCount}</Card>
  </Dashboard>
);
```

**Real-life Use:**
- Google Analytics
- Shopify dashboard
- Stock market tickers
- Server monitoring (DataDog)"

---

## Example 5: Collaborative Tools

### Scenario: Google Docs-like real-time editing

**Interview Answer:**
"For collaborative editing, we need operational transformation:

```javascript
// SERVER - Store document state
let documentState = 'Initial content';

io.on('connection', (socket) => {
  socket.on('joinDocument', (docId) => {
    socket.join(docId);
    
    // Send current state to new user
    socket.emit('documentState', documentState);
  });
  
  socket.on('edit', (docId, operation) => {
    // Apply operation to document
    documentState = applyOperation(documentState, operation);
    
    // Broadcast to all users except sender
    socket.broadcast.to(docId).emit('remoteEdit', operation);
  });
});

// CLIENT - Send edits
const handleChange = (e) => {
  const newContent = e.target.value;
  const operation = {
    type: 'insert',
    index: e.target.selectionStart,
    content: newContent
  };
  
  socket.emit('edit', docId, operation);
};
```

**Real-life Use:**
- Google Docs
- Figma
- Notion
- VS Code Live Share
- Overleaf"

---

## Example 6: Order Status Tracking

### Scenario: E-commerce real-time order updates

**Interview Answer:**
"For e-commerce apps tracking order status:

```javascript
// SERVER
socket.on('trackOrder', (orderId) => {
  socket.join(`order_${orderId}`);
  
  // Send current status
  const order = await Order.findById(orderId);
  socket.emit('orderStatus', order);
});

// When order status changes (from admin panel or service)
io.to(`order_${orderId}`).emit('orderUpdated', {
  orderId,
  status: 'shipped',
  trackingNumber: 'ABC123',
  estimatedDelivery: '2 days'
});

// CLIENT
useEffect(() => {
  socket.emit('trackOrder', orderId);
  
  socket.on('orderStatus', (order) => {
    setOrder(order);
  });
  
  socket.on('orderUpdated', (update) => {
    setOrder(prev => ({ ...prev, ...update }));
    showNotification(\`Order \${update.status}!\`);
  });
}, [orderId]);
```

**Real-life Use:**
- Amazon order tracking
- Uber ride tracking
- Zomato delivery tracking
- Flipkart shipment tracking"

---

## Example 7: Gaming - Multiplayer State Sync

### Scenario: Real-time multiplayer game

**Interview Answer:**
"For multiplayer games, you need frequent state updates:

```javascript
// SERVER - Game state management
const games = new Map();

io.on('connection', (socket) => {
  socket.on('joinGame', (gameId) => {
    let game = games.get(gameId) || { players: [], state: {} };
    
    game.players.push({
      id: socket.id,
      x: Math.random() * 800,
      y: Math.random() * 600
    });
    
    games.set(gameId, game);
    
    // Send game state to player
    socket.emit('gameState', game);
    
    // Notify others
    io.to(gameId).emit('playerJoined', socket.id);
  });
  
  // High frequency updates (30-60 fps)
  socket.on('playerMove', (gameId, position) => {
    const game = games.get(gameId);
    // Update player position
    io.to(gameId).emit('playerMoved', {
      playerId: socket.id,
      position
    });
  });
});

// CLIENT - Game loop
useEffect(() => {
  const gameLoop = setInterval(() => {
    socket.emit('playerMove', gameId, {
      x: player.x,
      y: player.y,
      angle: player.angle
    });
  }, 1000 / 60); // 60 fps
  
  socket.on('playerMoved', (data) => {
    updatePlayerPosition(data.playerId, data.position);
  });
}, [gameId]);
```

**Real-life Use:**
- Fortnite
- Counter-Strike
- Pac-Man multiplayer
- Agar.io"

---

## Performance Tips for Interview

**When asked about scale:**
"For millions of connections, I would:
1. Use Redis adapter for horizontal scaling
2. Implement rooms to segment connections
3. Use namespaces to organize events
4. Add load balancing (nginx/HAProxy)
5. Monitor memory with tools like clinode
6. Implement connection pooling
7. Cache frequently sent data"

**When asked about security:**
"Socket.IO security includes:
1. JWT token authentication on connect
2. Input validation for all events
3. Rate limiting per socket
4. CORS configuration
5. Secure WebSocket (wss://)
6. No sensitive data in messages
7. Sanitize user input"

---

## Summary for Interview

### What to emphasize:
- ✅ Real-time bidirectional communication
- ✅ Events and namespaces organization
- ✅ Rooms for selective broadcasting
- ✅ Proper connection management
- ✅ Handling edge cases (disconnection, reconnection)
- ✅ Security considerations
- ✅ Scaling strategies

### Demo Projects to mention:
- "I built a real-time chat app..."
- "I implemented live notifications..."
- "I created a multiplayer game..."
- "I designed a collaborative editor..."

Good luck! 🚀
