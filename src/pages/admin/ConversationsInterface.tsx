import React, { useState } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ConversationView } from '@/components/ConversationView';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { 
  Maximize2, 
  Minimize2, 
  MessageSquare, 
  Users,
  BarChart3,
  Settings,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationsInterfaceProps {
  className?: string;
}

interface Conversation {
  id: string;
  contact_id: string;
  contact_phone: string;
  contact_name?: string;
  contact_avatar?: string;
  channel: string;
  status: string;
  message_count: number;
  last_message: string;
  last_message_time: string;
  last_message_sender: string;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  conversation_duration_minutes?: number;
}

export default function ConversationsInterface({ className }: ConversationsInterfaceProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [view, setView] = useState<'split' | 'chat-only' | 'list-only'>('split');

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (window.innerWidth < 768) {
      setView('chat-only');
    }
  };

  const handleBackToList = () => {
    setView('split');
    setSelectedConversation(null);
  };

  if (isFullScreen && selectedConversation) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-semibold">
              Chat with {selectedConversation.contact_name || selectedConversation.contact_phone}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullScreen(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1">
            <ChatInterface
              contactPhone={selectedConversation.contact_phone}
              isFullScreen={true}
              className="h-full border-0"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">
            Monitor and manage customer conversations across all channels
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Contacts
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'list-only' || (!selectedConversation && view === 'split') ? (
          // List only view
          <div className="h-full p-6">
            <ChatList
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
              className="h-full"
            />
          </div>
        ) : view === 'chat-only' && selectedConversation ? (
          // Chat only view (mobile)
          <div className="h-full">
            <ChatInterface
              contactPhone={selectedConversation.contact_phone}
              onClose={handleBackToList}
              className="h-full border-0"
            />
          </div>
        ) : (
          // Split view (desktop)
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Chat List Panel */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <div className="h-full p-6 pr-3">
                <ChatList
                  onSelectConversation={handleSelectConversation}
                  selectedConversationId={selectedConversation?.id}
                  className="h-full"
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Chat Interface Panel */}
            <ResizablePanel defaultSize={65} minSize={50}>
              <div className="h-full p-6 pl-3">
                {selectedConversation ? (
                  <div className="h-full flex flex-col">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <h2 className="font-semibold">
                            {selectedConversation.contact_name || selectedConversation.contact_phone}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {selectedConversation.channel} • {selectedConversation.message_count} messages
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFullScreen(true)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Chat Interface */}
                    <div className="flex-1">
                      <ChatInterface
                        contactPhone={selectedConversation.contact_phone}
                        className="h-full"
                      />
                    </div>
                  </div>
                ) : (
                  // No conversation selected
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-semibold mb-2">
                        Select a conversation
                      </h3>
                      <p className="text-muted-foreground max-w-sm">
                        Choose a conversation from the list to start viewing and managing customer messages
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}