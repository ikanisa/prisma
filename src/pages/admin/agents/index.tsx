/**
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
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(data.total / data.page_size)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
