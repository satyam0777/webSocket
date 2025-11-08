// client/src/components/ChatComponent.jsx - Real-time Chat Example
import React, { useState, useEffect, useRef } from 'react';
import useSocket from '../hooks/useSocket';

/**
 * Real-time Chat Component using Socket.IO
 * Demonstrates:
 * - Sending/receiving messages
 * - Typing indicators
 * - Active users list
 * - Connection status
 */
const ChatComponent = ({ userId, userName, token }) => {
  const { socket, connected, error } = useSocket(token);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [selectedRoom, setSelectedRoom] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);
  
  // Setup socket listeners
  useEffect(() => {
    if (!socket || !connected) return;
    
    // Listen for messages
    socket.on('messageReceived', (message) => {
      console.log('📨 New message:', message);
      setMessages(prev => [...prev, message]);
    });
    
    // Listen for typing indicators
    socket.on('userTyping', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    });
    
    // Listen for active users
    socket.on('userConnected', (data) => {
      console.log('👥 Active users:', data.activeUsers);
      setActiveUsers(data.activeUsers);
    });
    
    socket.on('userDisconnected', (data) => {
      console.log('👤 User disconnected:', data.userName);
      setActiveUsers(data.activeUsers);
    });
    
    // Get initial active users
    socket.emit('getActiveUsers');
    
    // Cleanup listeners
    return () => {
      socket.off('messageReceived');
      socket.off('userTyping');
      socket.off('userConnected');
      socket.off('userDisconnected');
    };
  }, [socket, connected]);
  
  // Handle message send
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !socket || !connected) return;
    
    // Emit message event
    socket.emit('sendMessage', {
      text: inputValue,
      avatar: `https://i.pravatar.cc/150?img=${userId}`
    });
    
    setInputValue('');
    
    // Stop typing indicator
    socket.emit('userTyping', { isTyping: false });
  };
  
  // Handle typing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Send typing indicator
    if (!typingTimeoutRef.current) {
      socket?.emit('userTyping', { isTyping: true });
    }
    
    // Clear timeout
    clearTimeout(typingTimeoutRef.current);
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('userTyping', { isTyping: false });
      typingTimeoutRef.current = null;
    }, 2000);
  };
  
  // Handle room join
  const handleJoinRoom = (roomId) => {
    if (selectedRoom) {
      socket?.emit('leaveChatRoom', selectedRoom);
    }
    socket?.emit('joinChatRoom', roomId);
    setSelectedRoom(roomId);
    setMessages([]);
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2>💬 Real-time Chat</h2>
        <div style={styles.status}>
          <span style={{ ...styles.dot, backgroundColor: connected ? 'green' : 'red' }}></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {error && <div style={styles.error}>⚠️ {error}</div>}
      
      {/* Main Content */}
      <div style={styles.content}>
        {/* Sidebar - Active Users */}
        <div style={styles.sidebar}>
          <h3>👥 Active Users ({activeUsers.length})</h3>
          <div style={styles.usersList}>
            {activeUsers.map(user => (
              <div key={user.socketId} style={styles.userItem}>
                <span style={{ ...styles.statusDot, backgroundColor: user.status === 'online' ? 'green' : 'gray' }}></span>
                <span>{user.userName}</span>
              </div>
            ))}
          </div>
          
          <h3 style={{ marginTop: '20px' }}>🎫 Chat Rooms</h3>
          <div style={styles.roomsList}>
            {['general', 'random', 'tech'].map(room => (
              <button
                key={room}
                onClick={() => handleJoinRoom(room)}
                style={{
                  ...styles.roomBtn,
                  backgroundColor: selectedRoom === room ? '#007bff' : '#f0f0f0',
                  color: selectedRoom === room ? 'white' : 'black'
                }}
              >
                # {room}
              </button>
            ))}
          </div>
        </div>
        
        {/* Chat Area */}
        <div style={styles.chatArea}>
          {/* Messages */}
          <div style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div style={styles.emptyState}>
                <p>👋 No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={styles.messageWrapper}>
                  <img src={msg.avatar} alt={msg.from} style={styles.avatar} />
                  <div style={styles.messageBubble}>
                    <div style={styles.messageHeader}>
                      <strong>{msg.from}</strong>
                      <small style={styles.timestamp}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </small>
                    </div>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div style={styles.typingIndicator}>
                <em>
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </em>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSendMessage} style={styles.inputForm}>
            <input
              type="text"
              placeholder="Type your message..."
              value={inputValue}
              onChange={handleInputChange}
              disabled={!connected}
              style={styles.input}
            />
            <button
              type="submit"
              disabled={!connected || !inputValue.trim()}
              style={styles.sendBtn}
            >
              📤 Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  error: {
    backgroundColor: '#ff6b6b',
    color: 'white',
    padding: '10px',
    textAlign: 'center'
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '250px',
    backgroundColor: 'white',
    borderRight: '1px solid #ddd',
    padding: '15px',
    overflowY: 'auto'
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    fontSize: '14px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  roomsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  roomBtn: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    marginTop: '50px'
  },
  messageWrapper: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  messageBubble: {
    backgroundColor: '#e3e3e3',
    padding: '10px',
    borderRadius: '8px',
    maxWidth: '70%'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
    fontSize: '14px'
  },
  timestamp: {
    color: '#666',
    marginLeft: '10px'
  },
  typingIndicator: {
    fontStyle: 'italic',
    color: '#999',
    padding: '10px'
  },
  inputForm: {
    display: 'flex',
    gap: '8px',
    padding: '15px',
    backgroundColor: '#f5f5f5',
    borderTop: '1px solid #ddd'
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  sendBtn: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default ChatComponent;
