import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity as ActivityIcon, User, FileText, Calendar, Clock, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganizations } from '@/hooks/use-organizations';
import { useActivityLogs, type ActivityRecord } from '@/hooks/use-activity-logs';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

const activityTypeColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  export: 'bg-orange-100 text-orange-800',
};

const entityIcons = {
  client: User,
  engagement: Calendar,
  task: Calendar,
  document: FileText,
  user: User,
  system: ActivityIcon,
};

export function Activity() {
  const { currentOrg } = useOrganizations();
  const { data: activities = [], isLoading, isFetching, error } = useActivityLogs(currentOrg?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const isBusy = isLoading || isFetching;
  const requiresOrgSelection = isSupabaseConfigured && !currentOrg;

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesSearch =
        activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (activity.details ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || activity.type === typeFilter;
      const matchesEntity = entityFilter === 'all' || activity.entity === entityFilter;
      return matchesSearch && matchesType && matchesEntity;
    });
  }, [activities, searchQuery, typeFilter, entityFilter]);

  const getUserName = (activity: ActivityRecord) => {
    return activity.actorName || activity.userId || 'Team member';
  };

  const getUserInitials = (activity: ActivityRecord) => {
    const name = getUserName(activity);
    return name
      .split(' ')
      .map((segment) => segment[0])
      .join('')
      .toUpperCase();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Activity Log</h1>
        <p className="text-muted-foreground">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="export">Export</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="engagement">Engagements</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {requiresOrgSelection && (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select an organization</h3>
            <p className="text-muted-foreground">Choose an organization to load its recent activity.</p>
          </CardContent>
        </Card>
      )}

      {!requiresOrgSelection && error && (
        <Card>
          <CardContent className="py-12 text-center">
            <ActivityIcon className="h-10 w-10 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to load activity</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {!requiresOrgSelection && !error && !isBusy && filteredActivities.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ActivityIcon className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No activity yet</h3>
            <p className="text-muted-foreground">System activity will appear here once actions are performed.</p>
          </CardContent>
        </Card>
      )}

      {!requiresOrgSelection && filteredActivities.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const Icon = entityIcons[activity.entity] ?? ActivityIcon;
                return (
                  <div key={activity.id} className="flex items-start space-x-4 rounded-lg border border-white/10 p-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getUserName(activity)}`} />
                      <AvatarFallback>{getUserInitials(activity)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={activityTypeColors[activity.type] ?? ''}>
                            {activity.type}
                          </Badge>
                          <span className="flex items-center gap-1 capitalize">
                            <Icon className="h-4 w-4" />
                            {activity.entity}
                          </span>
                        </div>
                        <div>{new Date(activity.createdAt).toLocaleString()}</div>
                      </div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{getUserName(activity)}</span>
                        </div>
                        <div>{formatTimestamp(activity.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
