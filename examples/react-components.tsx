/**
 * Example: React Component using Agent Registry
 */

import { useState } from "react";
import { runAgentAction, searchAgentsAction } from "@/actions/agents";
import type { AgentRegistryEntry } from "@prisma-glow/agents";

export function AgentChatInterface() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([]);

  // Load agents on mount
  useState(() => {
    searchAgentsAction({ category: "tax" }).then((result) => {
      if (result.success) {
        setAgents(result.data);
      }
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !message) return;

    setLoading(true);
    const result = await runAgentAction(selectedAgent, message);

    if (result.success) {
      setResponse(result.data.output);
    } else {
      setResponse(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Agent Chat</h1>

      {/* Agent Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Agent</label>
        <select
          className="w-full p-2 border rounded"
          value={selectedAgent || ""}
          onChange={(e) => setSelectedAgent(e.target.value)}
        >
          <option value="">Choose an agent...</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.jurisdictions.join(", ")})
            </option>
          ))}
        </select>
      </div>

      {/* Agent Info */}
      {selectedAgent && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">Agent Details</h3>
          {agents.find((a) => a.id === selectedAgent)?.description}
        </div>
      )}

      {/* Chat Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Question</label>
        <textarea
          className="w-full p-3 border rounded mb-3"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask your question here..."
        />
        <button
          type="submit"
          disabled={!selectedAgent || !message || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          {loading ? "Processing..." : "Send"}
        </button>
      </form>

      {/* Response */}
      {response && (
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Response:</h3>
          <div className="whitespace-pre-wrap">{response}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Agent Selector Component
 */
export function AgentSelector({
  category,
  jurisdiction,
  onSelect,
}: {
  category?: string;
  jurisdiction?: string;
  onSelect: (agent: AgentRegistryEntry) => void;
}) {
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    searchAgentsAction({ category, jurisdiction }).then((result) => {
      if (result.success) {
        setAgents(result.data);
      }
      setLoading(false);
    });
  });

  if (loading) {
    return <div>Loading agents...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="p-4 border rounded hover:border-blue-500 cursor-pointer"
          onClick={() => onSelect(agent)}
        >
          <h3 className="font-semibold mb-2">{agent.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
          <div className="flex gap-2 flex-wrap">
            {agent.routing_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-gray-200 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Example: Agent Category Filter
 */
export function AgentCategoryFilter({
  onCategoryChange,
}: {
  onCategoryChange: (category: string | null) => void;
}) {
  const categories = [
    { id: "tax", name: "Tax", icon: "💰" },
    { id: "audit", name: "Audit", icon: "🔍" },
    { id: "accounting", name: "Accounting", icon: "📊" },
    { id: "corporate", name: "Corporate", icon: "🏢" },
  ];

  return (
    <div className="flex gap-2 mb-6">
      <button
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        onClick={() => onCategoryChange(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className="px-4 py-2 rounded bg-blue-100 hover:bg-blue-200"
          onClick={() => onCategoryChange(cat.id)}
        >
          {cat.icon} {cat.name}
        </button>
      ))}
    </div>
  );
}
