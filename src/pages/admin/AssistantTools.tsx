import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Play, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AssistantTools() {
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch tool definitions
  const { data: tools, isLoading } = useQuery({
    queryKey: ["tool-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_definitions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Create/Update tool mutation
  const toolMutation = useMutation({
    mutationFn: async (toolData: any) => {
      if (toolData.id) {
        const { error } = await supabase
          .from("tool_definitions")
          .update(toolData)
          .eq("id", toolData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tool_definitions")
          .insert(toolData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool-definitions"] });
      setIsCreateDialogOpen(false);
      setSelectedTool(null);
      toast.success("Tool definition saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save tool: ${error.message}`);
    },
  });

  // Delete tool mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tool_definitions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool-definitions"] });
      toast.success("Tool deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete tool: ${error.message}`);
    },
  });

  // Test tool mutation
  const testMutation = useMutation({
    mutationFn: async ({ toolName, args }: { toolName: string; args: any }) => {
      const { data, error } = await supabase.functions.invoke("mcp-orchestrator", {
        body: {
          userMessage: `Test tool: ${toolName} with args: ${JSON.stringify(args)}`,
          test_mode: true,
          phone_number: "+250788000000"
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast.success("Tool test completed");
    },
    onError: (error) => {
      toast.error(`Tool test failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const parameters = JSON.parse(formData.get("parameters") as string);
      
      const toolData = {
        id: selectedTool?.id,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        parameters,
        function_name: formData.get("function_name") as string,
        status: formData.get("status") as string,
        // version: formData.get("version") as string,
      };

      toolMutation.mutate(toolData);
    } catch (error) {
      toast.error("Invalid JSON in parameters field");
    }
  };

  const testTool = (tool: any) => {
    try {
      const args = JSON.parse(testInput);
      testMutation.mutate({ toolName: tool.function_name, args });
    } catch (error) {
      toast.error("Invalid JSON in test input");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Assistant Tools</h1>
          <p className="text-muted-foreground">
            Manage function definitions for the AI assistant
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedTool(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTool ? "Edit Tool Definition" : "Create Tool Definition"}
              </DialogTitle>
              <DialogDescription>
                Define a new function that the AI assistant can call
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Function Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={selectedTool?.name}
                    placeholder="get_nearby_drivers"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="function_name">Implementation Function</Label>
                  <Input
                    id="function_name"
                    name="function_name"
                    defaultValue={selectedTool?.function_name}
                    placeholder="get_nearby_drivers"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={selectedTool?.description}
                  placeholder="Return available driver trips near GPS coordinates"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="parameters">Parameters (JSON Schema)</Label>
                <Textarea
                  id="parameters"
                  name="parameters"
                  defaultValue={JSON.stringify(selectedTool?.parameters || {}, null, 2)}
                  placeholder='{"type":"object","properties":{"lat":{"type":"number"}},"required":["lat"]}'
                  className="font-mono text-sm"
                  rows={8}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedTool?.status || "active"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    name="version"
                    defaultValue={selectedTool?.version || "1.0"}
                    placeholder="1.0"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={toolMutation.isPending}>
                  {toolMutation.isPending ? "Saving..." : "Save Tool"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Tools</CardTitle>
            <CardDescription>
              Function definitions currently available to the assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading tools...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tools?.map((tool) => (
                    <TableRow key={tool.id}>
                      <TableCell className="font-mono">{tool.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tool.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tool.status === "active"
                              ? "default"
                              : tool.status === "inactive"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {tool.status}
                        </Badge>
                      </TableCell>
                      <TableCell>1.0</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTool(tool);
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Play className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Test Tool: {tool.name}</DialogTitle>
                                <DialogDescription>
                                  Test the tool with custom arguments
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div>
                                  <Label>Parameters Schema</Label>
                                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                                    {JSON.stringify(tool.parameters, null, 2)}
                                  </pre>
                                </div>
                                
                                <div>
                                  <Label htmlFor="test-input">Test Arguments (JSON)</Label>
                                  <Textarea
                                    id="test-input"
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                    placeholder='{"lat": -1.9441, "lng": 30.0619, "radius_km": 5}'
                                    className="font-mono"
                                  />
                                </div>
                                
                                <Button
                                  onClick={() => testTool(tool)}
                                  disabled={testMutation.isPending}
                                >
                                  {testMutation.isPending ? "Testing..." : "Test Tool"}
                                </Button>
                                
                                {testResult && (
                                  <div>
                                    <Label>Test Result</Label>
                                    <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                                      {JSON.stringify(testResult, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(tool.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}