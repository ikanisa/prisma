import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Brain, Settings, BookOpen, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AIAgentsModels() {
  const [agents, setAgents] = useState<any[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsResult, personasResult, assistantsResult, tasksResult, executionsResult] = await Promise.all([
        supabase.from('agents').select('*'),
        supabase.from('agent_personas').select('*'),
        supabase.from('assistant_configs').select('*'),
        supabase.from('agent_tasks').select('*'),
        supabase.from('agent_execution_log').select('*').limit(50)
      ]);

      setAgents(agentsResult.data || []);
      setPersonas(personasResult.data || []);
      setAssistants(assistantsResult.data || []);
      setTasks(tasksResult.data || []);
      setExecutions(executionsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'training': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Agents & Models</h1>
        <Button>
          <Bot className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold">
                  {agents.filter(a => a.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Personas</p>
                <p className="text-2xl font-bold">{personas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Models</p>
                <p className="text-2xl font-bold">{assistants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold">
                  {tasks.filter(t => t.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Executions Today</p>
                <p className="text-2xl font-bold">
                  {executions.filter(e => 
                    new Date(e.timestamp).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="executions">Execution Log</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>AI Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{agent.name}</h3>
                          <Badge className={getStatusColor(agent.status)}>
                            {agent.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{agent.description}</p>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(agent.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                        <Button variant="outline" size="sm">
                          Test
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas">
          <Card>
            <CardHeader>
              <CardTitle>Agent Personas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personas.map((persona) => (
                  <div key={persona.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{persona.language}</Badge>
                          <span className="text-sm text-gray-600">{persona.tone}</span>
                        </div>
                        <p className="text-sm">{persona.personality}</p>
                        <div className="text-xs text-gray-500">
                          Instructions: {persona.instructions?.substring(0, 100)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          Updated: {new Date(persona.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Model Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assistants.map((assistant) => (
                  <div key={assistant.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{assistant.name}</h3>
                          <Badge className={getStatusColor(assistant.status)}>
                            {assistant.status}
                          </Badge>
                          <Badge variant="outline">{assistant.model}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Temperature: {assistant.temperature}
                          <span className="ml-4">Tools: {assistant.tools?.length || 0}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {assistant.instructions?.substring(0, 150)}...
                        </p>
                        <div className="text-sm text-gray-500">
                          Updated: {new Date(assistant.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Agent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{task.name}</h3>
                          <Badge className={task.active ? 'bg-green-500' : 'bg-gray-500'}>
                            {task.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Tool: {task.tool_name}
                          <span className="ml-4">Trigger: {task.trigger_type}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Trigger Value: {task.trigger_value}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(task.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit Task
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle>Execution Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.map((execution) => (
                  <div key={execution.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={execution.success_status ? 'bg-green-500' : 'bg-red-500'}>
                            {execution.success_status ? 'Success' : 'Failed'}
                          </Badge>
                          <span className="text-sm font-medium">{execution.function_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Model: {execution.model_used}
                          <span className="ml-4">Duration: {execution.execution_time_ms}ms</span>
                        </div>
                        {execution.error_details && (
                          <div className="text-sm text-red-600">
                            Error: {execution.error_details}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {new Date(execution.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}