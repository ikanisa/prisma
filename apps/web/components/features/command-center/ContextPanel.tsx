/**
 * Context Panel
 * 
 * Shows context for the current thread/engagement:
 * - Case facts
 * - Timeline
 * - Documents
 * - Tasks
 * - Extracted entities
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, CheckSquare, Tag, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ContextPanelProps {
  engagementId: string | null;
  threadId: string | null;
}

export function ContextPanel({ engagementId, threadId }: ContextPanelProps) {
  const [engagement, setEngagement] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (engagementId) {
      loadEngagementContext();
    }
  }, [engagementId]);

  async function loadEngagementContext() {
    // In production, fetch from API
    // For now, use placeholder data
    setEngagement({
      id: engagementId,
      name: 'Acme Corp FY2025',
      status: 'IN_PROGRESS',
      type: 'AUDIT',
      period: '2025-01-01 to 2025-12-31',
    });
    setDocuments([
      { id: 'doc1', name: 'Financial Statements.pdf', status: 'CLASSIFIED' },
      { id: 'doc2', name: 'Trial Balance.xlsx', status: 'PENDING' },
    ]);
    setTasks([
      { id: 'task1', title: 'Complete risk assessment', status: 'IN_PROGRESS' },
      { id: 'task2', title: 'Review financial statements', status: 'PENDING' },
    ]);
    setTimeline([
      { id: '1', event: 'Engagement created', timestamp: new Date() },
      { id: '2', event: 'Documents uploaded', timestamp: new Date() },
    ]);
  }

  if (!engagementId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Select an engagement to view context
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">Context</h2>
        <p className="text-xs text-muted-foreground mt-1">{engagement?.name}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Docs</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Engagement Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{engagement?.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{engagement?.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period:</span>
                    <span>{engagement?.period}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documents:</span>
                    <span>{documents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks:</span>
                    <span>{tasks.length}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-2 mt-0">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No documents yet
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">{doc.status}</div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-2 mt-0">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks yet
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  >
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="text-xs text-muted-foreground">{task.status}</div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-2 mt-0">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No timeline events yet
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{event.event}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

