import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity as ActivityIcon, User, FileText, Calendar, Clock, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/stores/mock-data';

interface ActivityLog {
  id: string;
  type: 'create' | 'update' | 'delete' | 'login' | 'export';
  entity: 'client' | 'engagement' | 'task' | 'document' | 'user' | 'system';
  action: string;
  details: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const mockActivities: ActivityLog[] = [
  {
    id: '1',
    type: 'create',
    entity: 'client',
    action: 'Created new client',
    details: 'Added TechCorp Solutions to client database',
    userId: '1',
    timestamp: '2024-01-15T14:30:00Z',
    metadata: { clientName: 'TechCorp Solutions' }
  },
  {
    id: '2',
    type: 'update',
    entity: 'task',
    action: 'Updated task status',
    details: 'Changed "Review Q4 Reports" from In Progress to Completed',
    userId: '2',
    timestamp: '2024-01-15T13:45:00Z',
    metadata: { taskId: 'task-123', oldStatus: 'IN_PROGRESS', newStatus: 'COMPLETED' }
  },
  {
    id: '3',
    type: 'create',
    entity: 'document',
    action: 'Uploaded document',
    details: 'Added Annual_Compliance_Report_2024.pdf',
    userId: '1',
    timestamp: '2024-01-15T12:20:00Z',
    metadata: { fileName: 'Annual_Compliance_Report_2024.pdf', fileSize: '2.5MB' }
  },
  {
    id: '4',
    type: 'login',
    entity: 'user',
    action: 'User login',
    details: 'Successful login from Chrome browser',
    userId: '3',
    timestamp: '2024-01-15T11:15:00Z',
    metadata: { browser: 'Chrome', ip: '192.168.1.100' }
  },
  {
    id: '5',
    type: 'update',
    entity: 'engagement',
    action: 'Updated engagement',
    details: 'Modified Project Alpha timeline and budget',
    userId: '2',
    timestamp: '2024-01-15T10:30:00Z',
    metadata: { engagementName: 'Project Alpha' }
  },
  {
    id: '6',
    type: 'delete',
    entity: 'task',
    action: 'Deleted task',
    details: 'Removed obsolete task "Legacy System Review"',
    userId: '1',
    timestamp: '2024-01-15T09:45:00Z',
    metadata: { taskName: 'Legacy System Review' }
  },
  {
    id: '7',
    type: 'export',
    entity: 'system',
    action: 'Data export',
    details: 'Exported client data for Q4 reporting',
    userId: '2',
    timestamp: '2024-01-14T16:20:00Z',
    metadata: { exportType: 'clients', recordCount: 45 }
  }
];

const activityTypeColors = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  export: 'bg-orange-100 text-orange-800'
};

const entityIcons = {
  client: User,
  engagement: Calendar,
  task: Calendar,
  document: FileText,
  user: User,
  system: ActivityIcon
};

export function Activity() {
  const { users } = useAppStore();
  const [activities] = useState<ActivityLog[]>(mockActivities);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || activity.type === typeFilter;
    const matchesEntity = entityFilter === 'all' || activity.entity === entityFilter;
    
    return matchesSearch && matchesType && matchesEntity;
  });

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown User';
  };

  const getUserInitials = (userId: string) => {
    const name = getUserName(userId);
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
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
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No activities found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => {
              const EntityIcon = entityIcons[activity.entity];
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover-lift glass">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(activity.userId)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <EntityIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{activity.action}</span>
                                <Badge className={activityTypeColors[activity.type]} variant="secondary">
                                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {activity.details}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(activity.timestamp)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>By {getUserName(activity.userId)}</span>
                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <span className="px-2 py-1 bg-muted rounded text-xs">
                                {Object.entries(activity.metadata).map(([key, value]) => 
                                  `${key}: ${value}`
                                ).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}