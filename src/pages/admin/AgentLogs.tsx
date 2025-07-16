import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
}

interface AgentLog {
  id: string;
  agent_id: string;
  user_id: string;
  event: string;
  success: boolean;
  created_at: string;
  agents?: Agent;
}

export default function AgentLogs() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logsResult, agentsResult] = await Promise.all([
        supabase
          .from("agent_logs")
          .select(`
            *,
            agents!inner (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("agents")
          .select("id, name")
          .order("name")
      ]);

      if (logsResult.error) throw logsResult.error;
      if (agentsResult.error) throw agentsResult.error;

      setLogs(logsResult.data || []);
      setAgents(agentsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agent logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchQuery === "" || 
      log.event?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.agents?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAgent = selectedAgent === "" || log.agent_id === selectedAgent;
    
    return matchesSearch && matchesAgent;
  });

  if (loading) {
    return <div className="p-6">Loading agent logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Execution Logs</h1>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Search Events</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by event or agent name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Filter by Agent</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Recent Activity ({filteredLogs.length} logs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{log.agents?.name}</span>
                    <Badge variant={log.success ? "default" : "destructive"}>
                      {log.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Event:</span> {log.event || "No event"}
                  </div>
                  {log.user_id && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">User ID:</span> {log.user_id}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery || selectedAgent ? "No logs match your filters." : "No agent logs found."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}