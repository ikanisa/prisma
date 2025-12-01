/**
 * Knowledge Manager Page - Admin Panel
 * 
 * Manage knowledge sources for AI agents including:
 * - Document uploads and ingestion
 * - Vector store management
 * - Sync status monitoring
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  RefreshCw,
  Edit,
  Trash2,
  FileText,
  Database,
  Globe,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useKnowledgeSources, type KnowledgeSourceRecord } from '@/hooks/use-knowledge-sources';
import { useOrganizations } from '@/hooks/use-organizations';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

const SOURCE_TYPE_ICONS: Record<string, ReactNode> = {
  document: <FileText className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  api: <Globe className="h-5 w-5" />,
  website: <Globe className="h-5 w-5" />,
  manual: <Upload className="h-5 w-5" />,
};

const STATUS_ICONS: Record<string, ReactNode> = {
  synced: <CheckCircle className="h-4 w-4 text-green-500" />,
  syncing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  synced: 'bg-green-500',
  syncing: 'bg-blue-500',
  pending: 'bg-yellow-500',
  failed: 'bg-red-500',
};

function KnowledgeSourceCard({ source, onSync, onEdit, onDelete }: {
  source: KnowledgeSourceRecord;
  onSync: (source: KnowledgeSourceRecord) => void;
  onEdit: (source: KnowledgeSourceRecord) => void;
  onDelete: (source: KnowledgeSourceRecord) => void;
}) {
  const icon = SOURCE_TYPE_ICONS[source.sourceType] || <FileText className="h-5 w-5" />;
  const statusIcon = STATUS_ICONS[source.syncStatus];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {source.name}
                {statusIcon}
              </CardTitle>
              <CardDescription className="text-xs capitalize">
                {source.sourceType} source
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSync(source)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(source)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(source)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {source.description}
        </p>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-semibold">{source.documentCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Documents</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-semibold">{(source.chunkCount ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Chunks</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-semibold">{((source.totalTokens ?? 0) / 1000).toFixed(0)}k</div>
            <div className="text-xs text-muted-foreground">Tokens</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge 
            variant="secondary" 
            className={`${STATUS_COLORS[source.syncStatus] ?? 'bg-muted'} text-white`}
          >
            {source.syncStatus}
          </Badge>
          <span>
            {source.lastSyncedAt
              ? `Synced ${new Date(source.lastSyncedAt).toLocaleDateString()}`
              : 'Never synced'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AddSourceDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sourceType, setSourceType] = useState('document');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    console.log('Create source:', { sourceType, name, description });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Knowledge Source</DialogTitle>
          <DialogDescription>
            Add a new knowledge source for your agents
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g., Tax Documentation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe this knowledge source..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          {sourceType === 'document' && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, TXT, MD supported
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name}>
              Create Source
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KnowledgeManagerPage() {
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { currentOrg } = useOrganizations();
  const { data: sources = [], isLoading, isFetching, error } = useKnowledgeSources(currentOrg?.id ?? null);
  const filteredSources = useMemo(() => {
    return sources.filter((source) => {
      const matchesSearch = source.name.toLowerCase().includes(search.toLowerCase()) ||
        source.description.toLowerCase().includes(search.toLowerCase());
      const matchesType = sourceType === 'all' || source.sourceType === sourceType;
      return matchesSearch && matchesType;
    });
  }, [sources, search, sourceType]);

  // Calculate totals
  const totalDocuments = sources.reduce((sum, s) => sum + (s.documentCount ?? 0), 0);
  const totalChunks = sources.reduce((sum, s) => sum + (s.chunkCount ?? 0), 0);
  const totalTokens = sources.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0);
  const syncedCount = sources.filter((s) => s.syncStatus === 'synced').length;
  const isBusy = isLoading || isFetching;
  const requiresOrgSelection = isSupabaseConfigured && !currentOrg;

  const handleSync = (source: KnowledgeSourceRecord) => {
    console.log('Sync source:', source.id);
  };

  const handleEdit = (source: KnowledgeSourceRecord) => {
    console.log('Edit source:', source.id);
  };

  const handleDelete = (source: KnowledgeSourceRecord) => {
    console.log('Delete source:', source.id);
  };

  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Manager</h1>
          <p className="text-muted-foreground">
            Manage knowledge sources for your AI agents
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{isBusy ? '—' : sources.length}</div>
            <p className="text-sm text-muted-foreground">Knowledge Sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {isBusy ? '—' : totalDocuments.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {isBusy ? '—' : totalChunks.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Vector Chunks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {isBusy ? '—' : `${(totalTokens / 1000000).toFixed(1)}M`}
            </div>
            <p className="text-sm text-muted-foreground">Total Tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Sync Status</span>
            <span className="text-sm text-muted-foreground">
              {isBusy ? '—' : `${syncedCount} of ${sources.length} synced`}
            </span>
          </div>
          <Progress value={sources.length ? (syncedCount / sources.length) * 100 : 0} />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceType} onValueChange={setSourceType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sources Grid */}
      {!requiresOrgSelection && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSources.map((source) => (
            <KnowledgeSourceCard
              key={source.id}
              source={source}
              onSync={handleSync}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {requiresOrgSelection && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select an organization</h3>
            <p className="text-muted-foreground">
              Choose an organization to load its knowledge sources.
            </p>
          </CardContent>
        </Card>
      )}

      {!requiresOrgSelection && error && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to load knowledge sources</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {!requiresOrgSelection && !error && !isBusy && filteredSources.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No knowledge sources found</h3>
            <p className="text-muted-foreground mb-4">
              Add a knowledge source to get started
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Source
            </Button>
          </CardContent>
        </Card>
      )}

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </main>
  );
}
