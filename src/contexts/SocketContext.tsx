import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // In a real app, this would be your actual socket server URL
    // For now, we'll simulate the socket connection
    const socketInstance = {
      id: 'mock-socket-id',
      connected: true,
      onlineUsers: [] as string[],
      
      // Mock methods
      on: (event: string, callback: any) => {
        console.log(`Socket registered event: ${event}`);
        return socketInstance;
      },
      off: (event: string) => {
        console.log(`Socket unregistered event: ${event}`);
        return socketInstance;
      },
      emit: (event: string, data?: any, callback?: any) => {
        console.log(`Socket emitted event: ${event}`, data);
        if (event === 'getOnlineUsers' && callback) {
          callback(['some-user-id']);
        }
        return true;
      },
      disconnect: () => {
        console.log('Socket disconnected');
        return socketInstance;
      }
    } as unknown as Socket;

    setSocket(socketInstance);
    setIsConnected(true);

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}