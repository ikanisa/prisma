/**
 * Tool Hub Page - Admin Panel
 * 
 * Tool registry browser for viewing and managing available tools.
 * Shows categories, usage statistics, and allows tool configuration.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Wrench,
  Plus,
  Search,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Code,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// Mock tools data - in production, this would come from the API
const MOCK_TOOLS = [
  {
    id: '1',
    name: 'Web Search',
    slug: 'web-search',
    description: 'Search the web for information using various search engines',
    category: 'Search',
    implementation_type: 'api_call',
    is_destructive: false,
    requires_confirmation: false,
    status: 'active',
    usage_count: 1250,
    avg_latency_ms: 450,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Document Analysis',
    slug: 'document-analysis',
    description: 'Analyze and extract information from uploaded documents',
    category: 'Analysis',
    implementation_type: 'function',
    is_destructive: false,
    requires_confirmation: false,
    status: 'active',
    usage_count: 890,
    avg_latency_ms: 1200,
    created_at: '2024-01-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'Email Sender',
    slug: 'email-sender',
    description: 'Send emails to specified recipients',
    category: 'Communication',
    implementation_type: 'api_call',
    is_destructive: true,
    requires_confirmation: true,
    status: 'active',
    usage_count: 340,
    avg_latency_ms: 200,
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Task Creator',
    slug: 'task-creator',
    description: 'Create tasks and assign them to team members',
    category: 'Productivity',
    implementation_type: 'database_query',
    is_destructive: false,
    requires_confirmation: false,
    status: 'active',
    usage_count: 567,
    avg_latency_ms: 150,
    created_at: '2024-02-10T00:00:00Z',
  },
  {
    id: '5',
    name: 'Calculator',
    slug: 'calculator',
    description: 'Perform mathematical calculations',
    category: 'Utility',
    implementation_type: 'function',
    is_destructive: false,
    requires_confirmation: false,
    status: 'active',
    usage_count: 2100,
    avg_latency_ms: 50,
    created_at: '2024-01-10T00:00:00Z',
  },
];

const CATEGORIES = ['All', 'Search', 'Analysis', 'Communication', 'Productivity', 'Utility'];

const IMPLEMENTATION_TYPE_LABELS: Record<string, string> = {
  function: 'Function',
  api_call: 'API Call',
  database_query: 'Database',
  file_operation: 'File Op',
  workflow: 'Workflow',
};

interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  implementation_type: string;
  is_destructive: boolean;
  requires_confirmation: boolean;
  status: string;
  usage_count: number;
  avg_latency_ms: number;
  created_at: string;
}

function ToolCard({ tool, onTest, onEdit, onDelete }: {
  tool: Tool;
  onTest: (tool: Tool) => void;
  onEdit: (tool: Tool) => void;
  onDelete: (tool: Tool) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {tool.name}
                {tool.is_destructive && (
                  <AlertTriangle className="h-4 w-4 text-orange-500" title="Destructive" />
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {IMPLEMENTATION_TYPE_LABELS[tool.implementation_type]} • {tool.category}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTest(tool)}>
                <Play className="mr-2 h-4 w-4" />
                Test Tool
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(tool)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(tool)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {tool.description}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{tool.usage_count.toLocaleString()} uses</span>
          <span>{tool.avg_latency_ms}ms avg</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TestToolDialog({ tool, open, onOpenChange }: {
  tool: Tool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [params, setParams] = useState('{}');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setResult(JSON.stringify({
      success: true,
      output: `Tool "${tool?.name}" executed successfully`,
      latency_ms: 150,
    }, null, 2));
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test Tool: {tool?.name}</DialogTitle>
          <DialogDescription>
            Enter test parameters to execute this tool
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Parameters (JSON)</Label>
            <Textarea
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono text-sm"
              rows={5}
            />
          </div>
          <Button onClick={handleTest} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Execute
          </Button>
          {result && (
            <div className="space-y-2">
              <Label>Result</Label>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ToolHubPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [testTool, setTestTool] = useState<Tool | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  const filteredTools = MOCK_TOOLS.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || tool.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleTest = (tool: Tool) => {
    setTestTool(tool);
    setTestDialogOpen(true);
  };

  const handleEdit = (tool: Tool) => {
    console.log('Edit tool:', tool.id);
  };

  const handleDelete = (tool: Tool) => {
    console.log('Delete tool:', tool.id);
  };

  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tool Hub</h1>
          <p className="text-muted-foreground">
            Browse and manage available agent tools
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/tools/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Tool
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{MOCK_TOOLS.length}</div>
            <p className="text-sm text-muted-foreground">Total Tools</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {MOCK_TOOLS.reduce((sum, t) => sum + t.usage_count, 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Total Executions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Math.round(MOCK_TOOLS.reduce((sum, t) => sum + t.avg_latency_ms, 0) / MOCK_TOOLS.length)}ms
            </div>
            <p className="text-sm text-muted-foreground">Avg Latency</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onTest={handleTest}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredTools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tools found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}

      <TestToolDialog
        tool={testTool}
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
      />
    </main>
  );
}
