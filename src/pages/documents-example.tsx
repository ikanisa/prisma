/**
 * Example: Documents Page with Virtual List Integration
 * Demonstrates how to use VirtualList for rendering large document collections
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VirtualList } from '@/components/ui/virtual-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Filter, Download } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  created_at: string;
  updated_at: string;
  size: number;
  type: string;
}

/**
 * Document Card Component
 * Rendered by VirtualList for each document item
 */
function DocumentCard({ document }: { document: Document }) {
  const statusColors = {
    draft: 'bg-gray-500',
    review: 'bg-yellow-500',
    approved: 'bg-green-500',
    archived: 'bg-slate-500',
  };

  return (
    <Card className="mb-2 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <h3 className="font-medium">{document.title}</h3>
              <p className="text-sm text-muted-foreground">
                {document.type} • {(document.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[document.status]}>
              {document.status}
            </Badge>
            <Button size="sm" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Documents Page with Virtual List
 * Uses VirtualList for efficient rendering of large document collections
 */
export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch documents from API
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/documents?${params}`);
      return response.json();
    },
  });

  // Filter documents locally for instant feedback
  const filteredDocuments = documents.filter((doc: Document) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage your document library ({filteredDocuments.length} items)
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['draft', 'review', 'approved', 'archived'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtual List - Renders 1000+ documents efficiently */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No documents found</p>
            </div>
          ) : (
            <VirtualList
              items={filteredDocuments}
              renderItem={(document) => (
                <DocumentCard document={document} />
              )}
              estimateSize={80}
              className="h-[600px]"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
