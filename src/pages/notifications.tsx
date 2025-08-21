import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, X, Clock, User, FileText, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Notification {
  id: string;
  type: 'task' | 'document' | 'engagement' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  from?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task',
    title: 'Task Assignment',
    message: 'You have been assigned to "Review Q4 Financial Reports"',
    timestamp: '2024-01-15T10:30:00Z',
    read: false,
    urgent: true,
    from: 'Sarah Mitchell'
  },
  {
    id: '2',
    type: 'document',
    title: 'Document Updated',
    message: 'Annual Compliance Report has been updated',
    timestamp: '2024-01-15T09:15:00Z',
    read: false,
    urgent: false,
    from: 'System'
  },
  {
    id: '3',
    type: 'engagement',
    title: 'Engagement Milestone',
    message: 'Project Alpha has reached 75% completion',
    timestamp: '2024-01-14T16:45:00Z',
    read: true,
    urgent: false,
    from: 'Project System'
  },
  {
    id: '4',
    type: 'system',
    title: 'Maintenance Scheduled',
    message: 'System maintenance scheduled for tonight at 11 PM',
    timestamp: '2024-01-14T14:20:00Z',
    read: true,
    urgent: false,
    from: 'System Admin'
  }
];

const notificationIcons = {
  task: Calendar,
  document: FileText,
  engagement: User,
  system: AlertCircle
};

const notificationColors = {
  task: 'bg-blue-100 text-blue-800',
  document: 'bg-green-100 text-green-800',
  engagement: 'bg-purple-100 text-purple-800',
  system: 'bg-orange-100 text-orange-800'
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'urgent') return notification.urgent;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.urgent).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with important alerts</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Bell className="w-3 h-3" />
            <span>{unreadCount} unread</span>
          </Badge>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="urgent">Urgent ({urgentCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'all' ? 'You\'re all caught up!' : 'Check back later for updates'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification, index) => {
                const Icon = notificationIcons[notification.type];
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`hover-lift ${!notification.read ? 'border-primary/50' : ''}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${notificationColors[notification.type]}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{notification.title}</span>
                                {notification.urgent && (
                                  <Badge variant="destructive" className="text-xs">
                                    Urgent
                                  </Badge>
                                )}
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(notification.timestamp)}</span>
                          </div>
                          {notification.from && (
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>From: {notification.from}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}