// client/src/components/NotificationComponent.jsx - Real-time Notifications Example
import React, { useState, useEffect } from 'react';
import useSocket from '../hooks/useSocket';

/**
 * Real-time Notifications Component
 * Demonstrates:
 * - Receiving notifications
 * - Notification types (info, warning, success)
 * - Toast-like notifications
 * - Clearing notifications
 */
const NotificationComponent = ({ userId, userName, token }) => {
  const { socket, connected } = useSocket(token);
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    if (!socket || !connected) return;
    
    // Listen for notifications
    socket.on('notificationReceived', (notification) => {
      console.log('🔔 Notification received:', notification);
      
      // Add notification
      setNotifications(prev => [notification, ...prev]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });
    
    return () => {
      socket.off('notificationReceived');
    };
  }, [socket, connected]);
  
  // Send notification example
  const sendTestNotification = () => {
    const recipientId = 'user_123'; // Replace with actual user ID
    
    socket?.emit('sendNotification', {
      recipientId: recipientId,
      message: `${userName} just sent you a message!`,
      type: 'info'
    });
  };
  
  const getNotificationStyle = (type) => {
    const baseStyle = {
      padding: '15px',
      marginBottom: '10px',
      borderRadius: '4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      animation: 'slideIn 0.3s ease-in'
    };
    
    const types = {
      info: { backgroundColor: '#d1ecf1', color: '#0c5460', borderLeft: '4px solid #0c5460' },
      success: { backgroundColor: '#d4edda', color: '#155724', borderLeft: '4px solid #155724' },
      warning: { backgroundColor: '#fff3cd', color: '#856404', borderLeft: '4px solid #856404' },
      error: { backgroundColor: '#f8d7da', color: '#721c24', borderLeft: '4px solid #721c24' }
    };
    
    return { ...baseStyle, ...types[type] };
  };
  
  return (
    <div style={styles.container}>
      <h2>🔔 Notifications</h2>
      
      {/* Test Button */}
      <button onClick={sendTestNotification} style={styles.testBtn}>
        📤 Send Test Notification
      </button>
      
      {/* Notifications List */}
      <div style={styles.notificationsList}>
        {notifications.length === 0 ? (
          <p style={styles.emptyState}>No notifications yet</p>
        ) : (
          notifications.map(notification => (
            <div key={notification.id} style={getNotificationStyle(notification.type)}>
              <div>
                <strong>{notification.from}</strong>
                <p>{notification.message}</p>
                <small>{new Date(notification.timestamp).toLocaleTimeString()}</small>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '500px'
  },
  testBtn: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column'
  },
  emptyState: {
    textAlign: 'center',
    color: '#999'
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px'
  }
};

export default NotificationComponent;
