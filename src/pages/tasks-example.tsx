/**
 * Example: Task Board with Virtual Table Integration
 * Demonstrates how to use VirtualTable for rendering large task collections
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VirtualTable } from '@/components/ui/virtual-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Filter } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: {
    id: string;
    name: string;
    avatar?: string;
  };
  due_date: string;
  created_at: string;
}

/**
 * Task Board with Virtual Table
 * Uses VirtualTable for efficient rendering of large task lists
 */
export function TaskBoardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch tasks from API
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/tasks?${params}`);
      return response.json();
    },
  });

  // Filter tasks locally
  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Status badge colors
  const statusColors = {
    todo: 'bg-slate-500',
    in_progress: 'bg-blue-500',
    review: 'bg-yellow-500',
    done: 'bg-green-500',
  };

  // Priority badge colors
  const priorityColors = {
    low: 'bg-gray-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  // Table columns configuration
  const columns = [
    {
      key: 'title' as const,
      header: 'Task',
      width: '40%',
      cell: (task: Task) => (
        <div>
          <p className="font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">ID: {task.id}</p>
        </div>
      ),
    },
    {
      key: 'status' as const,
      header: 'Status',
      width: '15%',
      cell: (task: Task) => (
        <Badge className={statusColors[task.status]}>
          {task.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'priority' as const,
      header: 'Priority',
      width: '15%',
      cell: (task: Task) => (
        <Badge className={priorityColors[task.priority]}>
          {task.priority}
        </Badge>
      ),
    },
    {
      key: 'assignee' as const,
      header: 'Assignee',
      width: '20%',
      cell: (task: Task) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee.avatar} />
            <AvatarFallback>
              {task.assignee.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{task.assignee.name}</span>
        </div>
      ),
    },
    {
      key: 'due_date' as const,
      header: 'Due Date',
      width: '10%',
      cell: (task: Task) => (
        <span className="text-sm">
          {new Date(task.due_date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Board</h1>
          <p className="text-muted-foreground">
            Manage your tasks ({filteredTasks.length} items)
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['todo', 'in_progress', 'review', 'done'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtual Table - Renders 1000+ tasks efficiently */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tasks found</p>
            </div>
          ) : (
            <VirtualTable
              data={filteredTasks}
              columns={columns}
              estimateSize={60}
              className="h-[600px]"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
