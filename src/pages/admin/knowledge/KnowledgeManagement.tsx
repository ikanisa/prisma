import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { BookOpen, FileText, Brain, Search, Plus, MoreHorizontal } from 'lucide-react';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function KnowledgeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: documents, loading: documentsLoading } = useAdminData('centralized_documents', { autoLoad: true });
  const { data: embeddings, loading: embeddingsLoading } = useAdminData('agent_document_embeddings', { autoLoad: true });
  const { data: learning, loading: learningLoading } = useAdminData('agent_learning', { autoLoad: true });

  const documentColumns = [
    {
      accessorKey: 'title',
      header: 'Document Title',
    },
    {
      accessorKey: 'document_type',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('document_type') || 'General'}</Badge>
      ),
    },
    {
      accessorKey: 'agent_scope',
      header: 'Scope',
      cell: ({ row }: any) => (
        <Badge variant="secondary">{row.getValue('agent_scope')}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={status === 'active' ? 'default' : 'destructive'}>
            {status}
          </Badge>
        );
      },
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
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const embeddingColumns = [
    {
      accessorKey: 'chunk_text',
      header: 'Content Preview',
      cell: ({ row }: any) => (
        <div className="max-w-xs truncate">{row.getValue('chunk_text')}</div>
      ),
    },
    {
      accessorKey: 'chunk_index',
      header: 'Chunk #',
    },
    {
      accessorKey: 'domain',
      header: 'Domain',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('domain') || 'General'}</Badge>
      ),
    },
    {
      accessorKey: 'lang',
      header: 'Language',
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }: any) => new Date(row.getValue('created_at')).toLocaleDateString(),
    },
  ];

  const learningColumns = [
    {
      accessorKey: 'source_type',
      header: 'Source Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('source_type')}</Badge>
      ),
    },
    {
      accessorKey: 'source_detail',
      header: 'Source Detail',
    },
    {
      accessorKey: 'vectorize',
      header: 'Vectorized',
      cell: ({ row }: any) => (
        <Badge variant={row.getValue('vectorize') ? 'default' : 'secondary'}>
          {row.getValue('vectorize') ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }: any) => new Date(row.getValue('created_at')).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Management</h1>
          <p className="text-muted-foreground">Manage documents, embeddings, and learning resources</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Knowledge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active knowledge base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embeddings</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{embeddings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Vector chunks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Sources</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learning?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Training materials</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Knowledge Base</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="documents" className="w-full">
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
              <TabsTrigger value="learning">Learning Sources</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="space-y-4">
              <DataTable
                columns={documentColumns}
                data={documents || []}
                loading={documentsLoading}
                searchKey="title"
                searchPlaceholder="Search documents..."
              />
            </TabsContent>
            
            <TabsContent value="embeddings" className="space-y-4">
              <DataTable
                columns={embeddingColumns}
                data={embeddings || []}
                loading={embeddingsLoading}
                searchKey="chunk_text"
                searchPlaceholder="Search embeddings..."
              />
            </TabsContent>
            
            <TabsContent value="learning" className="space-y-4">
              <DataTable
                columns={learningColumns}
                data={learning || []}
                loading={learningLoading}
                searchKey="source_type"
                searchPlaceholder="Search learning sources..."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}