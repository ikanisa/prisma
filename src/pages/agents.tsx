import React, { useState } from 'react';
import AgentSelector from '@/components/agents/AgentSelector';
import AgentChat from '@/components/agents/AgentChat';
import { ArrowLeft } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  domain: string;
  capabilities: string[];
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!selectedAgent ? (
          <AgentSelector onSelectAgent={setSelectedAgent} />
        ) : (
          <div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to agents
            </button>
            <div className="h-[calc(100vh-12rem)]">
              <AgentChat
                agentId={selectedAgent.id}
                agentName={selectedAgent.name}
                agentDescription={selectedAgent.description}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
