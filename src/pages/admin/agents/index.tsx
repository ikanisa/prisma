/**
 * Agent Registry Page - Admin Panel
 * 
 * Displays a grid/list view of all AI agents with filtering,
 * search, and quick actions.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgents, type Agent } from '@/hooks/use-agents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
 * Agent Registry Page
 * 
 * Main page for browsing and managing AI agents.
 */

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAgents } from '@/hooks/use-agents';
import { AgentList } from '@/components/agents/AgentList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Bot,
  Plus,
  Search,
  Grid,
  List,
  MoreVertical,
  Copy,
  Trash2,
  Play,
  Eye,
  Loader2,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type AgentType = 'all' | 'assistant' | 'specialist' | 'orchestrator' | 'evaluator' | 'autonomous';
type AgentStatus = 'all' | 'draft' | 'testing' | 'active' | 'deprecated' | 'archived';

const TYPE_LABELS: Record<string, string> = {
  assistant: 'Assistant',
  specialist: 'Specialist',
  orchestrator: 'Orchestrator',
  evaluator: 'Evaluator',
  autonomous: 'Autonomous',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  testing: 'bg-yellow-500',
  active: 'bg-green-500',
  deprecated: 'bg-orange-500',
  archived: 'bg-red-500',
};

function AgentCard({ agent, onDuplicate, onDelete }: { 
  agent: Agent; 
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <CardDescription className="text-xs">
                {TYPE_LABELS[agent.type]} • v{agent.version}
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
              <DropdownMenuItem asChild>
                <Link to={`/admin/agents/${agent.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/admin/agents/${agent.id}/personas`}>
                  <Play className="mr-2 h-4 w-4" />
                  Test Agent
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDuplicate(agent.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(agent.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {agent.description || 'No description provided'}
        </p>
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className={`${STATUS_COLORS[agent.status]} text-white`}
          >
            {agent.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated {new Date(agent.updated_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentListItem({ agent, onDuplicate, onDelete }: { 
  agent: Agent; 
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{agent.name}</span>
            <Badge variant="outline" className="text-xs">
              {TYPE_LABELS[agent.type]}
            </Badge>
            <Badge 
              variant="secondary" 
              className={`${STATUS_COLORS[agent.status]} text-white text-xs`}
            >
              {agent.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.description || 'No description'} • v{agent.version}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/admin/agents/${agent.id}`}>View</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDuplicate(agent.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(agent.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function AgentRegistryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AgentType>('all');
  const [statusFilter, setStatusFilter] = useState<AgentStatus>('all');
import { Plus, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AgentsRegistryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useAgents({
    page,
    page_size: 12,
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const handleDuplicate = async (id: string) => {
    // TODO: Implement duplicate mutation
    console.log('Duplicate agent:', id);
  };

  const handleDelete = async (id: string) => {
    // TODO: Implement delete mutation
    console.log('Delete agent:', id);
  };

  const agents = data?.agents || [];
  const totalPages = Math.ceil((data?.total || 0) / 12);

  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Registry</h1>
          <p className="text-muted-foreground">
            Manage and configure your AI agents
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/agents/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  });

  const handleCreateAgent = () => {
    router.push('/admin/agents/create');
  };

  const handleTestAgent = (agent: any) => {
    router.push(`/admin/agents/${agent.id}/test`);
  };

  const handleDuplicateAgent = (agent: any) => {
    router.push(`/admin/agents/create?duplicate=${agent.id}`);
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const activeFiltersCount = [search, typeFilter, statusFilter].filter(Boolean).length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Registry</h1>
          <p className="text-muted-foreground mt-1">
            Manage and configure AI agents for your organization
          </p>
        </div>
        <Button onClick={handleCreateAgent}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AgentType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="assistant">Assistant</SelectItem>
            <SelectItem value="specialist">Specialist</SelectItem>
            <SelectItem value="orchestrator">Orchestrator</SelectItem>
            <SelectItem value="evaluator">Evaluator</SelectItem>
            <SelectItem value="autonomous">Autonomous</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AgentStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="grid">
              <Grid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load agents. Please try again.</p>
          </CardContent>
        </Card>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-4">
              {search || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first agent'}
            </p>
            <Button asChild>
              <Link to="/admin/agents/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="assistant">🤖 Assistant</SelectItem>
              <SelectItem value="specialist">🎓 Specialist</SelectItem>
              <SelectItem value="orchestrator">🎭 Orchestrator</SelectItem>
              <SelectItem value="evaluator">⚖️ Evaluator</SelectItem>
              <SelectItem value="autonomous">🚀 Autonomous</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 mb-6">
          <p className="text-sm text-destructive">
            Failed to load agents: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Results Count */}
      {data && !isLoading && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.agents.length} of {data.total} agents
          </p>
          {data.agents.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="outline">
                Page {data.page} of {Math.ceil(data.total / data.page_size)}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Agent Grid */}
      <AgentList
        agents={data?.agents || []}
        isLoading={isLoading}
        emptyMessage={
          activeFiltersCount > 0
            ? 'No agents match your filters. Try adjusting your search criteria.'
            : 'No agents created yet. Click "Create Agent" to get started.'
        }
        onTestAgent={handleTestAgent}
        onDuplicateAgent={handleDuplicateAgent}
      />

      {/* Pagination */}
      {data && data.total > data.page_size && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(data.total / data.page_size)}
          >
            Next
          </Button>
        </div>
      )}
    </main>
    </div>
  );
}
