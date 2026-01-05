/**
 * Command Center - Chat-First Interface
 * 
 * This is the primary landing page after login - a chat-first interface
 * with context panels for engagements, tasks, and documents
 */

'use client';

import { useState, useEffect } from 'react';
import { ChatKitInterface } from '@/components/features/chatkit/ChatKitInterface';
import { CommandCenterSidebar } from '@/components/features/command-center/CommandCenterSidebar';
import { ContextPanel } from '@/components/features/command-center/ContextPanel';
import { useAuth } from '@/components/features/auth/auth-provider';
import { MessageSquare, Layout, Sidebar as SidebarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CommandCenterPage() {
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selectedEngagement, setSelectedEngagement] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Generate session ID on mount
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [sessionId]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar - Threads/Engagements */}
      {sidebarOpen && (
        <div className="w-80 border-r bg-card flex flex-col">
          <CommandCenterSidebar
            selectedThread={selectedThread}
            selectedEngagement={selectedEngagement}
            onSelectThread={setSelectedThread}
            onSelectEngagement={setSelectedEngagement}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <SidebarIcon className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Command Center</h1>
              <p className="text-xs text-muted-foreground">
                AI-powered operations workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setContextPanelOpen(!contextPanelOpen)}
            >
              <Layout className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {sessionId ? (
            <ChatKitInterface
              agentSessionId={sessionId}
              onSessionCreate={(id) => setSessionId(id)}
              onWidgetAction={(widgetId, action) => {
                // Handle widget actions
                console.log('Widget action:', widgetId, action);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Initializing chat session...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Context Panel */}
      {contextPanelOpen && (
        <div className="w-96 border-l bg-card flex flex-col">
          <ContextPanel
            engagementId={selectedEngagement}
            threadId={selectedThread}
          />
        </div>
      )}
    </div>
  );
}

