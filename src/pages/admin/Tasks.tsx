import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
}

interface Task {
  id: string;
  agent_id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  tool_input_json: any;
  active: boolean;
  created_at: string;
  agents?: Agent;
}

interface TaskFormData {
  agent_id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  tool_name: string;
  tool_input_json: string;
  active: boolean;
}

const TRIGGER_TYPES = [
  { value: "keyword", label: "Keyword" },
  { value: "regex", label: "Regex" },
  { value: "cron", label: "Cron Schedule" },
  { value: "api", label: "API Call" }
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    agent_id: "",
    name: "",
    trigger_type: "keyword",
    trigger_value: "",
    tool_name: "",
    tool_input_json: "{}",
    active: true
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      const [tasksResult, agentsResult] = await Promise.all([
        supabase
          .from("agent_tasks")
          .select(`
            *,
            agents!inner (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("agents")
          .select("id, name")
          .order("name")
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (agentsResult.error) throw agentsResult.error;

      setTasks(tasksResult.data || []);
      setAgents(agentsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let toolInputJson;
      try {
        toolInputJson = JSON.parse(formData.tool_input_json);
      } catch {
        throw new Error("Invalid JSON in tool input");
      }

      const taskData = {
        ...formData,
        tool_input_json: toolInputJson
      };

      if (editingTask) {
        const { error } = await supabase
          .from("agent_tasks")
          .update(taskData)
          .eq("id", editingTask.id);
        if (error) throw error;
        toast({ title: "Success", description: "Task updated successfully" });
      } else {
        const { error } = await supabase
          .from("agent_tasks")
          .insert([taskData]);
        if (error) throw error;
        toast({ title: "Success", description: "Task created successfully" });
      }
      
      setDialogOpen(false);
      setEditingTask(null);
      setFormData({
        agent_id: "",
        name: "",
        trigger_type: "keyword",
        trigger_value: "",
        tool_name: "",
        tool_input_json: "{}",
        active: true
      });
      fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save task",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      const { error } = await supabase
        .from("agent_tasks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Task deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("agent_tasks")
        .update({ active: !task.active })
        .eq("id", task.id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Task status updated" });
      fetchData();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const openDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        agent_id: task.agent_id,
        name: task.name || "",
        trigger_type: task.trigger_type || "keyword",
        trigger_value: task.trigger_value || "",
        tool_name: task.tool_name || "",
        tool_input_json: JSON.stringify(task.tool_input_json || {}, null, 2),
        active: task.active
      });
    } else {
      setEditingTask(null);
      setFormData({
        agent_id: "",
        name: "",
        trigger_type: "keyword",
        trigger_value: "",
        tool_name: "",
        tool_input_json: "{}",
        active: true
      });
    }
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Tasks & Tools</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Task" : "Create Task"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Agent</label>
                <select
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select an agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Task Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Trigger Type</label>
                  <select
                    value={formData.trigger_type}
                    onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {TRIGGER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Trigger Value</label>
                  <Input
                    value={formData.trigger_value}
                    onChange={(e) => setFormData({ ...formData, trigger_value: e.target.value })}
                    placeholder="e.g., 'help' or '0 9 * * *'"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Tool Name</label>
                <Input
                  value={formData.tool_name}
                  onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                  placeholder="e.g., generate-payment, send-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tool Input (JSON)</label>
                <Textarea
                  value={formData.tool_input_json}
                  onChange={(e) => setFormData({ ...formData, tool_input_json: e.target.value })}
                  rows={4}
                  placeholder='{"param1": "value1", "param2": "value2"}'
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingTask ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                {task.agents?.name} - {task.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={task.active ? "default" : "secondary"}>
                  {task.active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive(task)}
                  title={`${task.active ? "Pause" : "Activate"} task`}
                >
                  {task.active ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDialog(task)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Trigger:</span> {task.trigger_type} - {task.trigger_value}
                </div>
                <div>
                  <span className="font-medium">Tool:</span> {task.tool_name}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Created: {new Date(task.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No tasks found. Create tasks to define agent automation and tool usage.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}