import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  BarChart3,
  Eye,
  Target,
  Clock,
  Activity
} from "lucide-react";

interface ActionButton {
  id: string;
  button_text: string;
  payload: string;
  button_type: 'reply' | 'url' | 'phone_number';
  url?: string;
  phone_number?: string;
  domain: string;
  intent: string;
  context_tags: string[];
  priority: number;
  usage_count: number;
  success_rate: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  user_feedback_score: number;
}

const DOMAINS = [
  { value: "all", label: "All Domains" },
  { value: "welcome", label: "Welcome" },
  { value: "payment", label: "Payment" },
  { value: "moto", label: "Moto/Transport" },
  { value: "commerce", label: "Commerce" },
  { value: "listings", label: "Listings" },
  { value: "events", label: "Events" },
  { value: "support", label: "Support" },
  { value: "language", label: "Language" },
  { value: "confirmation", label: "Confirmation" },
  { value: "navigation", label: "Navigation" },
  { value: "error", label: "Error" }
];

const BUTTON_TYPES = [
  { value: "reply", label: "Reply Button" },
  { value: "url", label: "URL Button" },
  { value: "phone_number", label: "Phone Button" }
];

export function ActionButtonsManager() {
  const [buttons, setButtons] = useState<ActionButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ActionButton | null>(null);

  useEffect(() => {
    fetchActionButtons();
  }, []);

  const fetchActionButtons = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_action_buttons')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setButtons((data || []) as ActionButton[]);
    } catch (error) {
      console.error('Error fetching action buttons:', error);
      toast.error('Failed to fetch action buttons');
    } finally {
      setLoading(false);
    }
  };

  const createButton = async (buttonData: Partial<ActionButton>) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_action_buttons')
        .insert([{
          button_text: buttonData.button_text,
          payload: buttonData.payload,
          button_type: buttonData.button_type || 'reply',
          url: buttonData.url,
          phone_number: buttonData.phone_number,
          domain: buttonData.domain,
          intent: buttonData.intent,
          context_tags: buttonData.context_tags || [],
          priority: buttonData.priority || 5
        }])
        .select()
        .single();

      if (error) throw error;
      
      setButtons(prev => [data as ActionButton, ...prev]);
      setIsCreateOpen(false);
      toast.success('Action button created successfully');
    } catch (error) {
      console.error('Error creating action button:', error);
      toast.error('Failed to create action button');
    }
  };

  const updateButton = async (id: string, updates: Partial<ActionButton>) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_action_buttons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setButtons(prev => prev.map(btn => btn.id === id ? data as ActionButton : btn));
      setIsEditOpen(false);
      toast.success('Action button updated successfully');
    } catch (error) {
      console.error('Error updating action button:', error);
      toast.error('Failed to update action button');
    }
  };

  const toggleButtonStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_action_buttons')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      
      setButtons(prev => prev.map(btn => 
        btn.id === id ? { ...btn, is_active: !isActive } : btn
      ));
      toast.success(`Button ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling button status:', error);
      toast.error('Failed to update button status');
    }
  };

  const filteredButtons = buttons.filter(button => {
    const matchesDomain = selectedDomain === "all" || button.domain === selectedDomain;
    const matchesSearch = button.button_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          button.payload.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          button.intent.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const columns = [
    {
      accessorKey: "button_text",
      header: "Button Text",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.button_text}</span>
          {!row.original.is_active && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "domain",
      header: "Domain",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.domain}</Badge>
      ),
    },
    {
      accessorKey: "intent",
      header: "Intent",
    },
    {
      accessorKey: "usage_count",
      header: "Usage",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-muted-foreground" />
          <span>{row.original.usage_count}</span>
        </div>
      ),
    },
    {
      accessorKey: "success_rate",
      header: "Success Rate",
      cell: ({ row }: any) => {
        const rate = Math.round(row.original.success_rate * 100);
        return (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-muted-foreground" />
            <span>{rate}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }: any) => (
        <Badge variant={row.original.priority >= 8 ? "default" : "secondary"}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: "context_tags",
      header: "Context Tags",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {row.original.context_tags.slice(0, 2).map((tag: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {row.original.context_tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{row.original.context_tags.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedButton(row.original);
              setIsEditOpen(true);
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={row.original.is_active ? "secondary" : "default"}
            onClick={() => toggleButtonStatus(row.original.id, row.original.is_active)}
          >
            {row.original.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Action Buttons Manager</h2>
          <p className="text-muted-foreground">
            Manage dynamic action buttons that agents use based on user context and intent
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Button
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Action Button</DialogTitle>
              <DialogDescription>
                Create a new action button that agents can use dynamically
              </DialogDescription>
            </DialogHeader>
            <ButtonForm
              onSubmit={createButton}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buttons</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buttons.length}</div>
            <p className="text-xs text-muted-foreground">
              {buttons.filter(b => b.is_active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...buttons.map(b => b.usage_count), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {buttons.find(b => b.usage_count === Math.max(...buttons.map(b => b.usage_count)))?.button_text || 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((buttons.reduce((acc, b) => acc + b.success_rate, 0) / buttons.length) * 100) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all buttons
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Learning</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {buttons.filter(b => b.created_by === 'agent_learning').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-generated buttons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search buttons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by domain" />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map(domain => (
              <SelectItem key={domain.value} value={domain.value}>
                {domain.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dynamic Action Buttons</CardTitle>
          <CardDescription>
            Action buttons that the AI agent selects based on user context, intent, and learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredButtons} />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Action Button</DialogTitle>
            <DialogDescription>
              Modify the selected action button
            </DialogDescription>
          </DialogHeader>
          {selectedButton && (
            <ButtonForm
              button={selectedButton}
              onSubmit={(data) => updateButton(selectedButton.id, data)}
              onCancel={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ButtonFormProps {
  button?: ActionButton;
  onSubmit: (data: Partial<ActionButton>) => void;
  onCancel: () => void;
}

function ButtonForm({ button, onSubmit, onCancel }: ButtonFormProps) {
  const [formData, setFormData] = useState({
    button_text: button?.button_text || '',
    payload: button?.payload || '',
    button_type: button?.button_type || 'reply' as const,
    url: button?.url || '',
    phone_number: button?.phone_number || '',
    domain: button?.domain || 'welcome',
    intent: button?.intent || '',
    context_tags: button?.context_tags?.join(', ') || '',
    priority: button?.priority || 5
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      context_tags: formData.context_tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Button Text</label>
          <Input
            value={formData.button_text}
            onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
            placeholder="e.g., 💸 Pay"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Payload</label>
          <Input
            value={formData.payload}
            onChange={(e) => setFormData(prev => ({ ...prev, payload: e.target.value }))}
            placeholder="e.g., PAY"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Button Type</label>
          <Select value={formData.button_type} onValueChange={(value) => setFormData(prev => ({ ...prev, button_type: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Domain</label>
          <Select value={formData.domain} onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOMAINS.filter(d => d.value !== 'all').map(domain => (
                <SelectItem key={domain.value} value={domain.value}>
                  {domain.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Priority (1-10)</label>
          <Input
            type="number"
            min="1"
            max="10"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Intent</label>
        <Input
          value={formData.intent}
          onChange={(e) => setFormData(prev => ({ ...prev, intent: e.target.value }))}
          placeholder="e.g., main_menu, pay_someone"
          required
        />
      </div>

      {formData.button_type === 'url' && (
        <div>
          <label className="text-sm font-medium">URL</label>
          <Input
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://example.com"
            type="url"
          />
        </div>
      )}

      {formData.button_type === 'phone_number' && (
        <div>
          <label className="text-sm font-medium">Phone Number</label>
          <Input
            value={formData.phone_number}
            onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
            placeholder="+250788123456"
            type="tel"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Context Tags</label>
        <Input
          value={formData.context_tags}
          onChange={(e) => setFormData(prev => ({ ...prev, context_tags: e.target.value }))}
          placeholder="e.g., welcome, new_user, payment"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Comma-separated tags for when this button should appear
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {button ? 'Update' : 'Create'} Button
        </Button>
      </div>
    </form>
  );
}