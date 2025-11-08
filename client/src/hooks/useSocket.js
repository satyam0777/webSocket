// client/src/hooks/useSocket.js - Custom React Hook for Socket.IO
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

/**
 * Custom hook to manage Socket.IO connection
 * Ensures single connection instance across components
 * Handles authentication and cleanup
 */
export const useSocket = (token) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Create socket connection only if we have a token
    if (!token) {
      console.warn('No token provided for socket connection');
      return;
    }
    
    // Initialize socket if not already connected
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: {
          token: token
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });
      
      // Connection events
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected:', socketRef.current.id);
        setConnected(true);
        setError(null);
      });
      
      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setConnected(false);
      });
      
      // Error handling
      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
        setError(error.message);
      });
    }
    
    // Cleanup
    return () => {
      // Don't disconnect - keep connection alive
      // Only cleanup event listeners if needed
    };
  }, [token]);
  
  return {
    socket: socketRef.current,
    connected,
    error,
    disconnect: () => socketRef.current?.disconnect(),
    reconnect: () => socketRef.current?.connect()
  };
};

export default useSocket;
