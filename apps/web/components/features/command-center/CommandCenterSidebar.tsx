/**
 * Command Center Sidebar
 * 
 * Shows threads (cases, clients, audits) and allows navigation
 */

'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Briefcase, FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getSupabaseServiceClient } from '@prisma/tools/database';

interface Thread {
  id: string;
  name: string;
  type: 'engagement' | 'case' | 'client';
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount?: number;
}

interface CommandCenterSidebarProps {
  selectedThread: string | null;
  selectedEngagement: string | null;
  onSelectThread: (threadId: string) => void;
  onSelectEngagement: (engagementId: string) => void;
}

export function CommandCenterSidebar({
  selectedThread,
  selectedEngagement,
  onSelectThread,
  onSelectEngagement,
}: CommandCenterSidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [engagements, setEngagements] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngagements();
  }, []);

  async function loadEngagements() {
    try {
      // In production, this would fetch from API
      // For now, use placeholder data
      setEngagements([
        { id: 'eng1', name: 'Acme Corp FY2025', status: 'IN_PROGRESS' },
        { id: 'eng2', name: 'TechStart Q4 2024', status: 'DRAFT' },
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load engagements:', error);
      setLoading(false);
    }
  }

  const filteredEngagements = engagements.filter((eng) =>
    eng.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Threads</h2>
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Threads List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Engagements Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
            Engagements
          </div>
          {loading ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              Loading...
            </div>
          ) : filteredEngagements.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No engagements found
            </div>
          ) : (
            filteredEngagements.map((engagement) => (
              <button
                key={engagement.id}
                onClick={() => {
                  onSelectEngagement(engagement.id);
                  onSelectThread(`thread_${engagement.id}`);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  selectedEngagement === engagement.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent'
                )}
              >
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{engagement.name}</div>
                  <div className="text-xs text-muted-foreground">{engagement.status}</div>
                </div>
              </button>
            ))
          )}

          {/* Recent Threads Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase mt-4">
            Recent
          </div>
          {threads.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No recent threads
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // Create new engagement thread
            onSelectThread(`new_${Date.now()}`);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>
      </div>
    </div>
  );
}

