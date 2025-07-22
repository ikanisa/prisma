import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, 
  BellRing, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  X,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'message' | 'system' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
      }
    }

    fetchNotifications();
    
    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show browser notification
          if (permission === 'granted' && !document.hasFocus()) {
            showBrowserNotification(newNotification);
          }
          
          // Play sound
          if (soundEnabled) {
            playNotificationSound();
          }
          
          // Show toast
          toast({
            title: newNotification.title,
            description: newNotification.message,
            duration: 5000
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [permission, soundEnabled, toast]);

  const fetchNotifications = async () => {
    try {
      // This would fetch from a notifications table
      // For now, simulate some notifications
      const simulatedNotifications: Notification[] = [
        {
          id: '1',
          type: 'message',
          title: 'New message from +250788123456',
          message: 'Hello, I need help with my order',
          is_read: false,
          created_at: new Date().toISOString(),
          priority: 'medium'
        },
        {
          id: '2',
          type: 'system',
          title: 'AI Agent Update',
          message: 'Smart router has been updated with new capabilities',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          priority: 'low'
        },
        {
          id: '3',
          type: 'warning',
          title: 'High Response Time',
          message: 'AI agent response time is above 5 seconds',
          is_read: true,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          priority: 'high'
        }
      ];

      setNotifications(simulatedNotifications);
      setUnreadCount(simulatedNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const showBrowserNotification = (notification: Notification) => {
    if (permission !== 'granted') return;

    const browserNotification = new window.Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent'
    });

    browserNotification.onclick = () => {
      window.focus();
      markAsRead(notification.id);
      browserNotification.close();
    };

    // Auto close after 5 seconds unless urgent
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (browser restrictions)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return MessageSquare;
      case 'warning':
        return AlertTriangle;
      case 'success':
        return CheckCircle;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-600';
    if (priority === 'high') return 'text-orange-600';
    
    switch (type) {
      case 'message':
        return 'text-blue-600';
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 min-w-5 text-xs px-1.5"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Notification settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          <div className="p-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type, notification.priority);
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 group",
                      !notification.is_read && "bg-muted/30"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    {/* Priority indicator */}
                    {notification.priority === 'urgent' && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                    
                    <div className="flex gap-3">
                      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", colorClass)} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={cn(
                            "text-sm font-medium line-clamp-1",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {notification.priority === 'high' && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                High
                              </Badge>
                            )}
                            {notification.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs px-1 py-0">
                                Urgent
                              </Badge>
                            )}
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}