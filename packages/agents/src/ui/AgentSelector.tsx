import { useState } from 'react';
import type { AgentDefinition } from '../registry-loader';

export interface AgentSelectorProps {
  agents: AgentDefinition[];
  onSelectAgent: (agent: AgentDefinition) => void;
  selectedAgentId?: string;
  groupBy?: 'group' | 'none';
  searchable?: boolean;
  className?: string;
}

export function AgentSelector({
  agents,
  onSelectAgent,
  selectedAgentId,
  groupBy = 'group',
  searchable = true,
  className = '',
}: AgentSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredAgents = agents.filter((agent) =>
    agent.label.toLowerCase().includes(search.toLowerCase()) ||
    agent.id.toLowerCase().includes(search.toLowerCase()) ||
    agent.group.toLowerCase().includes(search.toLowerCase())
  );

  const groupedAgents = groupBy === 'group'
    ? filteredAgents.reduce((acc, agent) => {
        if (!acc[agent.group]) acc[agent.group] = [];
        acc[agent.group].push(agent);
        return acc;
      }, {} as Record<string, AgentDefinition[]>)
    : { all: filteredAgents };

  const getAgentIcon = (group: string) => {
    const icons: Record<string, string> = {
      tax: '💰',
      audit: '🔍',
      accounting: '📊',
      'corporate-services': '🏢',
    };
    return icons[group] || '🤖';
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Agent</h2>
        
        {searchable && (
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedAgents).map(([group, groupAgents]) => (
          <div key={group} className="mb-4">
            {groupBy === 'group' && (
              <div className="px-4 py-2 bg-gray-50 border-b">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                  {getAgentIcon(group)} {group.replace('-', ' ')}
                </h3>
              </div>
            )}

            <div className="divide-y">
              {groupAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent(agent)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedAgentId === agent.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      selectedAgentId === agent.id
                        ? 'bg-gradient-to-br from-blue-600 to-purple-700'
                        : 'bg-gradient-to-br from-gray-400 to-gray-600'
                    }`}>
                      {agent.label.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{agent.label}</p>
                      <p className="text-sm text-gray-500 truncate">{agent.id}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredAgents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No agents found</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t p-4 bg-gray-50">
        <p className="text-sm text-gray-600">
          {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
}
