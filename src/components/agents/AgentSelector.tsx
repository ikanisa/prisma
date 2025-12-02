import React, { useState, useEffect } from 'react';
import { Search, Bot, ChevronRight } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  domain: string;
  capabilities: string[];
}

interface AgentSelectorProps {
  onSelectAgent: (agent: Agent) => void;
}

export default function AgentSelector({ onSelectAgent }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents/v2/list');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const domains = ['all', ...new Set(agents.map(a => a.domain))];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || agent.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const getDomainColor = (domain: string) => {
    const colors: Record<string, string> = {
      tax: 'bg-blue-100 text-blue-800',
      audit: 'bg-green-100 text-green-800',
      accounting: 'bg-purple-100 text-purple-800',
      corporate: 'bg-orange-100 text-orange-800',
    };
    return colors[domain] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Select an AI Agent</h2>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {domains.map(domain => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDomain === domain
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {domain.charAt(0).toUpperCase() + domain.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-3">
        {filteredAgents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No agents found</p>
        ) : (
          filteredAgents.map(agent => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getDomainColor(agent.domain)}`}>
                        {agent.domain}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 3).map((cap, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{agent.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
