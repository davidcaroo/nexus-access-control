import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Conectar al servidor WebSocket
    socketRef.current = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      setIsConnected(false);
    });

    socketRef.current.on('error', (error) => {
      console.error('Error WebSocket:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    on: (event: string, callback: (...args: any[]) => void) => {
      socketRef.current?.on(event, callback);
    },
    off: (event: string) => {
      socketRef.current?.off(event);
    }
  };
};
