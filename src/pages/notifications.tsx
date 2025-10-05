import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, X, Clock, User, FileText, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { authorizedFetch } from '@/lib/api';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/notifications';
import { useEmptyStateCopy } from '@/lib/system-config';

interface NotificationRecord {
  id: string;
  type: 'task' | 'document' | 'engagement' | 'system';
  title: string;
  body?: string;
  created_at: string;
  read: boolean;
  urgent?: boolean;
  from?: string;
}

const notificationIcons = {
  task: Calendar,
  document: FileText,
  engagement: User,
  system: AlertCircle,
};

const notificationColors = {
  task: 'bg-blue-100 text-blue-800',
  document: 'bg-green-100 text-green-800',
  engagement: 'bg-purple-100 text-purple-800',
  system: 'bg-orange-100 text-orange-800',
};

async function fetchNotifications(orgSlug: string, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  const response = await authorizedFetch(
    `/v1/notifications?orgSlug=${encodeURIComponent(orgSlug)}&limit=${pageSize}&offset=${offset}`,
    { method: 'GET' },
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to load notifications');
  }
  return payload.notifications as NotificationRecord[];
}

export function Notifications() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const notificationsEmptyCopy = useEmptyStateCopy('notifications', "You're all caught up.");

  const orgSlug = currentOrg?.slug ?? null;

  useEffect(() => {
    setPage(1);
    setNotifications([]);
    setHasMore(true);
  }, [orgSlug]);

  useEffect(() => {
    if (!orgSlug) {
      setNotifications([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchNotifications(orgSlug, page, 20);
        if (page === 1) {
          setNotifications(data);
        } else {
          setNotifications((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === 20);
      } catch (error) {
        toast({
          title: 'Unable to load notifications',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orgSlug, page, toast]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.read;
      if (filter === 'urgent') return Boolean(n.urgent);
      return true;
    });
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const urgentCount = notifications.filter((n) => n.urgent).length;

  const markAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      toast({
        title: 'Failed to mark notification',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    if (!orgSlug) return;
    try {
      await markAllNotificationsRead(orgSlug);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      toast({
        title: 'Failed to mark notifications',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!currentOrg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Join or select an organization to view notifications.
        </p>
      </div>
    );
  }

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
                {filter === 'all' ? notificationsEmptyCopy : 'Check back later for updates'}
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
                                {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.body ?? notification.title}
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
                              className="h-8 w-8"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatTimestamp(notification.created_at)}</span>
                        </div>
                        {notification.from && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{notification.from}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setPage((prev) => prev + 1)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Load more'}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
