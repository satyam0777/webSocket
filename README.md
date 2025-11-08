# Complete Setup & Run Guide

## Quick Start (5 minutes)

### Prerequisites
- Node.js v14+ installed
- npm or yarn
- MongoDB running (optional, can use mock data)

---

## Server Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Create `.env` file

```env
PORT=3001
JWT_SECRET=your_secret_key_here
MONGODB_URI=mongodb://localhost:27017/websocket-chat
NODE_ENV=development
```

### 3. Run Server

```bash
npm start
# or for development with auto-reload
npm run dev
```

**Expected Output:**
```
🚀 Socket.IO server running on http://localhost:3001
```

---

## Client Setup

### 1. Create React App (if not exists)

```bash
npx create-react-app client
cd client
npm install socket.io-client
```

### 2. Update `src/App.js`

```javascript
import React, { useState } from 'react';
import ChatComponent from './components/ChatComponent';
import NotificationComponent from './components/NotificationComponent';

function App() {
  const [userName] = useState('User_' + Math.random().toString(36).substr(2, 9));
  const userId = 'user_' + Math.random().toString(36).substr(2, 9);
  
  // Mock token - in real app, get from auth
  const token = 'mock_token_' + userId;
  
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <ChatComponent userId={userId} userName={userName} token={token} />
      <NotificationComponent userId={userId} userName={userName} token={token} />
    </div>
  );
}

export default App;
```

### 3. Run Client

```bash
npm start
```

**Expected:** Opens http://localhost:3000 in browser

---

## Testing the Connection

### Test 1: Chat Message

1. **Open two browser tabs** (localhost:3000 in both)
2. **Type message in Tab 1** → Should appear in Tab 2 instantly
3. **Type message in Tab 2** → Should appear in Tab 1 instantly

### Test 2: Typing Indicator

1. **Start typing in Tab 1** → Tab 2 shows "User is typing..."
2. **Stop typing after 2 seconds** → Indicator disappears

### Test 3: Active Users

1. **Open Tab 1** → Shows 1 active user
2. **Open Tab 2** → Both show 2 active users
3. **Close Tab 1** → Tab 2 shows 1 active user

### Test 4: Notifications

1. **Click "Send Test Notification" in Tab 1**
2. **Toast notification appears in Tab 2**

---


## Common Issues & Solutions

### ❌ Problem: "Connection refused"
**Solution:** 
- Check if server is running on port 3001
- Check firewall settings
- Verify `REACT_APP_SOCKET_URL` in `.env`

### ❌ Problem: "Cannot find module 'socket.io'"
**Solution:**
```bash
cd server
npm install socket.io express cors
```

### ❌ Problem: Messages not showing
**Solution:**
- Open browser console (F12)
- Check for errors
- Verify server logs show "✅ User connected"
- Check both tabs are on http://localhost:3000

### ❌ Problem: Token authentication fails
**Solution:**
- Update mock token generation in App.js
- Check server middleware auth logic

---

### Challenge 1: Add Direct Messages
```javascript
// Hint: Use rooms like 'dm_user1_user2'
socket.on('sendDirectMessage', (recipientId, message) => {
  // Create room between two users
  const roomId = [socket.userId, recipientId].sort().join('_');
  socket.to(roomId).emit('directMessage', {
    from: socket.userId,
    text: message
  });
});
```

### Challenge 2: Add User Status
```javascript
// Hint: Emit status changes
socket.on('setStatus', (status) => {
  socket.broadcast.emit('userStatusChanged', {
    userId: socket.userId,
    status: status // 'online', 'away', 'busy'
  });
});
```

### Challenge 3: Add Message Persistence
```javascript
// Hint: Save to MongoDB
socket.on('sendMessage', async (messageData) => {
  const message = await Message.create({
    from: socket.userId,
    text: messageData.text,
    timestamp: new Date()
  });
  io.emit('messageReceived', message);
});
```

---

## Resources & Further Learning

### Official Documentation
- [Socket.IO Docs](https://socket.io/docs/)
- [Socket.IO Examples](https://github.com/socketio/socket.io/tree/master/examples)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)


---

## Interview Tips

### When Interviewer Asks: "How does Socket.IO work?"

**Your Answer:**
"Socket.IO is a real-time communication library that:
1. Initiates WebSocket connection with server
2. If WebSocket fails, falls back to long-polling
3. Uses events for bidirectional communication
4. Provides rooms for selective broadcasting
5. Handles reconnection automatically

In a MERN app, I would:
- Create single socket connection on app load
- Store socket in Context API
- Use custom hooks to manage socket lifecycle
- Listen for events in useEffect with cleanup
- Emit events when user takes actions"

### When Interviewer Asks: "What's a real example?"
"I would implement a chat application like LinkedIn messaging:
- Server accepts connections and authenticates via JWT
- Users join rooms (like user1_user2 for DMs)
- Messages are emitted to specific room
- Client receives and displays messages
- For notifications, we'd use a separate namespace"

### When Interviewer Asks: "How would you scale?"
"For scaling to thousands of users:
1. Use Redis adapter for multiple server instances
2. Use namespaces to separate concerns (/chat, /notify)
3. Implement rooms for selective broadcasting
4. Add load balancer (nginx) in front
5. Monitor connection pools
6. Cache frequently accessed data"

---

## Good Luck! 

