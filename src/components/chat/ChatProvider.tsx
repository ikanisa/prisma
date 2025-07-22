import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface ChatContextType {
  selectedContactPhone: string | null;
  setSelectedContactPhone: (phone: string | null) => void;
  isConnected: boolean;
  notifications: any[];
  unreadCount: number;
  markNotificationAsRead: (id: string) => void;
  createNotification: (notification: any) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [selectedContactPhone, setSelectedContactPhone] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);

  // Get current user phone from auth or set a default for demo
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // In a real app, you'd get the phone from user metadata
        setCurrentUserPhone(user.phone || '+250000000000');
      } else {
        // For demo purposes, set a default phone
        setCurrentUserPhone('+250000000000');
      }
    };
    getCurrentUser();
  }, []);

  // Use notifications hook
  const {
    notifications,
    unreadCount,
    markAsRead: markNotificationAsRead,
    createNotification,
  } = useNotifications(undefined, currentUserPhone || undefined);

  // Monitor connection status
  useEffect(() => {
    let statusChannel = supabase.channel('connection-status');

    statusChannel
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
      })
      .on('presence', { event: 'join' }, () => {
        setIsConnected(true);
      })
      .on('presence', { event: 'leave' }, () => {
        setIsConnected(false);
      })
      .subscribe();

    // Track initial connection
    statusChannel.track({ online_at: new Date().toISOString() });

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, []);

  const value: ChatContextType = {
    selectedContactPhone,
    setSelectedContactPhone,
    isConnected,
    notifications,
    unreadCount,
    markNotificationAsRead,
    createNotification,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}