import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { CheckSquare, Calendar, Zap, Search, Plus, MoreHorizontal, Play, Pause, RotateCcw } from 'lucide-react';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function TasksManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: automatedTasks, loading: automatedLoading } = useAdminData('automated_tasks', { autoLoad: true });
  const { data: agentTasks, loading: agentLoading } = useAdminData('agent_tasks', { autoLoad: true });

  const automatedTaskColumns = [
    {
      accessorKey: 'title',
      header: 'Task Title',
    },
    {
      accessorKey: 'task_type',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('task_type')}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.getValue('status') as string;
        const variant = 
          status === 'completed' ? 'default' :
          status === 'running' ? 'secondary' :
          status === 'failed' ? 'destructive' : 'outline';
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }: any) => {
        const priority = row.getValue('priority') as number;
        const variant = priority >= 8 ? 'destructive' : priority >= 5 ? 'default' : 'secondary';
        return <Badge variant={variant}>{priority}</Badge>;
      },
    },
    {
      accessorKey: 'scheduled_for',
      header: 'Scheduled',
      cell: ({ row }: any) => new Date(row.getValue('scheduled_for')).toLocaleString(),
    },
    {
      accessorKey: 'next_run',
      header: 'Next Run',
      cell: ({ row }: any) => {
        const nextRun = row.getValue('next_run');
        return nextRun ? new Date(nextRun).toLocaleString() : 'N/A';
      },
    },
    {
      accessorKey: 'is_enabled',
      header: 'Enabled',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('is_enabled') ? 'default' : 'secondary'}>
          {row.getValue('is_enabled') ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Play className="mr-2 h-4 w-4" />
              Run Now
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </DropdownMenuItem>
            <DropdownMenuItem>View Logs</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const agentTaskColumns = [
    {
      accessorKey: 'name',
      header: 'Task Name',
    },
    {
      accessorKey: 'trigger_type',
      header: 'Trigger Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('trigger_type')}</Badge>
      ),
    },
    {
      accessorKey: 'trigger_value',
      header: 'Trigger Value',
    },
    {
      accessorKey: 'tool_name',
      header: 'Tool',
      cell: ({ row }: any) => (
        <Badge variant="secondary">{row.getValue('tool_name')}</Badge>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Active',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('active') ? 'default' : 'secondary'}>
          {row.getValue('active') ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }: any) => new Date(row.getValue('created_at')).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Test Trigger</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const pendingTasks = automatedTasks?.filter(task => task.status === 'pending') || [];
  const runningTasks = automatedTasks?.filter(task => task.status === 'running') || [];
  const failedTasks = automatedTasks?.filter(task => task.status === 'failed') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks Management</h1>
          <p className="text-muted-foreground">Manage automated tasks and agent triggers</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">Waiting to run</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Tasks</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{runningTasks.length}</div>
            <p className="text-xs text-muted-foreground">Currently executing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedTasks.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentTasks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Agent triggers</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="automated" className="w-full">
            <TabsList>
              <TabsTrigger value="automated">Automated Tasks</TabsTrigger>
              <TabsTrigger value="agent">Agent Tasks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="automated" className="space-y-4">
              <DataTable
                columns={automatedTaskColumns}
                data={automatedTasks || []}
                loading={automatedLoading}
                searchKey="title"
                searchPlaceholder="Search automated tasks..."
              />
            </TabsContent>
            
            <TabsContent value="agent" className="space-y-4">
              <DataTable
                columns={agentTaskColumns}
                data={agentTasks || []}
                loading={agentLoading}
                searchKey="name"
                searchPlaceholder="Search agent tasks..."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}