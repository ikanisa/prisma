import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Brain, MessageSquare, Clock, Search, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function MemoryManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: memory, loading: memoryLoading } = useAdminData('agent_memory', { autoLoad: true });
  const { data: memoryEnhanced, loading: memoryEnhancedLoading } = useAdminData('agent_memory_enhanced', { autoLoad: true });
  const { data: conversations, loading: conversationsLoading } = useAdminData('agent_conversations', { autoLoad: true });

  const memoryColumns = [
    {
      accessorKey: 'contact_id',
      header: 'Contact ID',
      cell: ({ row }: any) => (
        <div className="font-mono text-xs">{row.getValue('contact_id')?.slice(0, 8)}...</div>
      ),
    },
    {
      accessorKey: 'memory_type',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('memory_type')}</Badge>
      ),
    },
    {
      accessorKey: 'content',
      header: 'Content Preview',
      cell: ({ row }: any) => (
        <div className="max-w-xs truncate">{row.getValue('content')}</div>
      ),
    },
    {
      accessorKey: 'updated_at',
      header: 'Last Updated',
      cell: ({ row }: any) => new Date(row.getValue('updated_at')).toLocaleDateString(),
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
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const memoryEnhancedColumns = [
    {
      accessorKey: 'user_id',
      header: 'User ID',
      cell: ({ row }: any) => (
        <div className="font-mono text-xs">{row.getValue('user_id')?.slice(0, 8)}...</div>
      ),
    },
    {
      accessorKey: 'memory_type',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('memory_type')}</Badge>
      ),
    },
    {
      accessorKey: 'memory_key',
      header: 'Key',
    },
    {
      accessorKey: 'importance_weight',
      header: 'Importance',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('importance_weight') > 0.7 ? 'default' : 'secondary'}>
          {row.getValue('importance_weight')}
        </Badge>
      ),
    },
    {
      accessorKey: 'confidence_score',
      header: 'Confidence',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('confidence_score') > 0.8 ? 'default' : 'destructive'}>
          {row.getValue('confidence_score')}
        </Badge>
      ),
    },
    {
      accessorKey: 'expires_at',
      header: 'Expires',
      cell: ({ row }: any) => {
        const expires = row.getValue('expires_at');
        return expires ? new Date(expires).toLocaleDateString() : 'Never';
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }: any) => new Date(row.getValue('updated_at')).toLocaleDateString(),
    },
  ];

  const conversationColumns = [
    {
      accessorKey: 'user_id',
      header: 'User ID',
      cell: ({ row }: any) => (
        <div className="font-mono text-xs">{row.getValue('user_id')?.slice(0, 8)}...</div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('role') === 'user' ? 'outline' : 'default'}>
          {row.getValue('role')}
        </Badge>
      ),
    },
    {
      accessorKey: 'message',
      header: 'Message Preview',
      cell: ({ row }: any) => (
        <div className="max-w-xs truncate">{row.getValue('message')}</div>
      ),
    },
    {
      accessorKey: 'ts',
      header: 'Timestamp',
      cell: ({ row }: any) => new Date(row.getValue('ts')).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Memory Management</h1>
          <p className="text-muted-foreground">Manage agent memory, conversations, and user context</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Memory
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Basic Memory</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memory?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Simple memory entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enhanced Memory</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memoryEnhanced?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Vector-enhanced memory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Message history</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Memory Store</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search memory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Basic Memory</TabsTrigger>
              <TabsTrigger value="enhanced">Enhanced Memory</TabsTrigger>
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <DataTable
                columns={memoryColumns}
                data={memory || []}
                loading={memoryLoading}
                searchKey="content"
                searchPlaceholder="Search memory content..."
              />
            </TabsContent>
            
            <TabsContent value="enhanced" className="space-y-4">
              <DataTable
                columns={memoryEnhancedColumns}
                data={memoryEnhanced || []}
                loading={memoryEnhancedLoading}
                searchKey="memory_key"
                searchPlaceholder="Search memory keys..."
              />
            </TabsContent>
            
            <TabsContent value="conversations" className="space-y-4">
              <DataTable
                columns={conversationColumns}
                data={conversations || []}
                loading={conversationsLoading}
                searchKey="message"
                searchPlaceholder="Search conversations..."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}