import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Play, Pause, Settings } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
}

interface Task {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  tool_input_json: any;
  active: boolean;
  created_at: string;
  agent_id: string;
}

interface ExecutionLog {
  id: string;
  function_name: string;
  input_data: any;
  success_status: boolean;
  execution_time_ms: number;
  error_details: string;
  timestamp: string;
}

export default function TaskDetail() {
  const { agentId, taskId } = useParams<{ agentId: string; taskId: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agentId && taskId) {
      fetchTaskData();
    }
  }, [agentId, taskId]);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      
      // Fetch agent
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id, name")
        .eq("id", agentId)
        .single();

      if (agentError) throw agentError;
      setAgent(agentData);

      // Fetch task
      const { data: taskData, error: taskError } = await supabase
        .from("agent_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);

      // Fetch execution logs
      const { data: logsData, error: logsError } = await supabase
        .from("agent_execution_log")
        .select("*")
        .eq("function_name", taskData.tool_name)
        .order("timestamp", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setExecutionLogs(logsData || []);

    } catch (error) {
      console.error("Error fetching task data:", error);
      toast.error("Failed to load task data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!task) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from("agent_tasks")
        .update({
          name: task.name,
          trigger_type: task.trigger_type,
          trigger_value: task.trigger_value,
          tool_name: task.tool_name,
          tool_input_json: task.tool_input_json,
          active: task.active
        })
        .eq("id", taskId);

      if (error) throw error;
      
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!task) return;

    try {
      const newActiveStatus = !task.active;
      
      const { error } = await supabase
        .from("agent_tasks")
        .update({ active: newActiveStatus })
        .eq("id", taskId);

      if (error) throw error;
      
      setTask({ ...task, active: newActiveStatus });
      toast.success(`Task ${newActiveStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error("Error toggling task status:", error);
      toast.error("Failed to update task status");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!agent || !task) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Task Not Found</h2>
          <Button onClick={() => navigate(`/admin/agents/${agentId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/admin/agents/${agentId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agent
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{task.name}</h1>
            <p className="text-muted-foreground">{agent.name} Task</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={task.active ? "default" : "secondary"}>
            {task.active ? "Active" : "Inactive"}
          </Badge>
          <Button onClick={toggleActive} variant="outline">
            {task.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Task Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Task Name</Label>
              <Input
                id="name"
                value={task.name}
                onChange={(e) => setTask({ ...task, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="trigger_type">Trigger Type</Label>
              <Input
                id="trigger_type"
                value={task.trigger_type}
                onChange={(e) => setTask({ ...task, trigger_type: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="trigger_value">Trigger Value</Label>
              <Input
                id="trigger_value"
                value={task.trigger_value}
                onChange={(e) => setTask({ ...task, trigger_value: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="tool_name">Tool Name</Label>
              <Input
                id="tool_name"
                value={task.tool_name}
                onChange={(e) => setTask({ ...task, tool_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="tool_input">Tool Input (JSON)</Label>
              <Textarea
                id="tool_input"
                value={JSON.stringify(task.tool_input_json, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setTask({ ...task, tool_input_json: parsed });
                  } catch (error) {
                    // Invalid JSON, don't update
                  }
                }}
                rows={6}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={task.active}
                onCheckedChange={(checked) => setTask({ ...task, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Execution History */}
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
            <CardDescription>
              Recent executions of this task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {executionLogs.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={log.success_status ? "default" : "destructive"}>
                      {log.success_status ? "Success" : "Failed"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    <p><strong>Function:</strong> {log.function_name}</p>
                    <p><strong>Duration:</strong> {log.execution_time_ms}ms</p>
                  </div>

                  {log.error_details && (
                    <div className="text-sm text-destructive">
                      <strong>Error:</strong> {log.error_details}
                    </div>
                  )}

                  {log.input_data && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">Input Data</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.input_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              
              {executionLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No execution history available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}