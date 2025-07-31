import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id?: string;
  phone_number?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  status: 'unread' | 'read';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata: Record<string, any>;
  created_at: string;
  read_at?: string;
  expires_at?: string;
}

export function useNotifications(userId?: string, phoneNumber?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('notification-manager', {
        body: {
          action: 'get_notifications',
          user_id: userId,
          phone_number: phoneNumber,
          limit: 50
        }
      });

      if (error) throw error;

      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => n.status === 'unread').length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('notification-manager', {
        body: {
          action: 'mark_read',
          notification_id: notificationId
        }
      });

      if (error) throw error;

      if (data.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('notification-manager', {
        body: {
          action: 'mark_all_read',
          user_id: userId,
          phone_number: phoneNumber
        }
      });

      if (error) throw error;

      if (data.success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, status: 'read' as const, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Create a new notification
  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'status'>) => {
    try {
      const { data, error } = await supabase.functions.invoke('notification-manager', {
        body: {
          action: 'create',
          ...notification
        }
      });

      if (error) throw error;

      if (data.success) {
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast for high priority notifications
        if (notification.priority === 'high' || notification.priority === 'urgent') {
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default'
          });
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('notification-manager', {
        body: {
          action: 'delete',
          notification_id: notificationId
        }
      });

      if (error) throw error;

      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => {
          const notification = notifications.find(n => n.id === notificationId);
          return notification?.status === 'unread' ? prev - 1 : prev;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = supabase.channel('notifications')
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        const notification = payload.payload as Notification;
        
        // Only add if it's for the current user
        if (
          (userId && notification.user_id === userId) ||
          (phoneNumber && notification.phone_number === phoneNumber)
        ) {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for important notifications
          if (notification.priority === 'high' || notification.priority === 'urgent') {
            toast({
              title: notification.title,
              description: notification.message,
              variant: notification.type === 'error' ? 'destructive' : 'default'
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, phoneNumber, toast]);

  // Initial fetch
  useEffect(() => {
    if (userId || phoneNumber) {
      fetchNotifications();
    }
  }, [userId, phoneNumber]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    refresh: fetchNotifications
  };
}