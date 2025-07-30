import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Send, Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppTemplate {
  id: string;
  name?: string;
  content?: string;
  template_type?: string;
  domain: string;
  intent: string;
  language?: string;
  status?: 'active' | 'draft' | 'pending';
  variables?: string[];
  created_at?: string;
  updated_at?: string;
  // Additional database fields
  body?: string;
  category?: string;
  code?: string;
  components?: any;
  footer?: string;
  header?: any;
  name_meta?: string;
  version?: number;
  buttons?: any;
}

export function TemplateManager() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  const domains = [
    { value: "all", label: "All Domains" },
    { value: "welcome", label: "Welcome" },
    { value: "payment", label: "Payment" },
    { value: "moto", label: "Moto/Transport" },
    { value: "commerce", label: "Commerce/Ordering" },
    { value: "listings", label: "Listings/Properties" },
    { value: "events", label: "Events" },
    { value: "support", label: "Support/Help" },
    { value: "language", label: "Language/Localization" },
    { value: "onboarding", label: "Onboarding" }
  ];

  const templateTypes = [
    { value: "text", label: "Text Message" },
    { value: "quick_reply", label: "Quick Reply" },
    { value: "button", label: "Button Template" },
    { value: "list", label: "List Template" },
    { value: "flow", label: "Flow Template" }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform database templates to match our interface
      const transformedTemplates = data?.map(template => ({
        ...template,
        name: template.name_meta || template.code || 'Untitled',
        content: template.body || '',
        template_type: 'text',
        variables: template.components ? [] : [],
        status: 'active' as const
      })) || [];
      
      setTemplates(transformedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: Partial<WhatsAppTemplate>) => {
    try {
      // Transform our template data to match database schema
      const dbTemplate = {
        name_meta: templateData.name,
        body: templateData.content,
        domain: templateData.domain,
        intent: templateData.intent,
        language: templateData.language || 'en',
        category: templateData.domain,
        code: templateData.name?.toLowerCase().replace(/\s+/g, '_') || 'untitled'
      };

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert([dbTemplate])
        .select()
        .single();

      if (error) throw error;
      
      // Transform back for our state
      const newTemplate = {
        ...data,
        name: data.name_meta,
        content: data.body,
        template_type: 'text' as const,
        variables: [],
        status: 'active' as const
      };
      
      setTemplates(prev => [newTemplate, ...prev]);
      setIsCreateOpen(false);
      toast.success('Template created successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const updateTemplate = async (id: string, updates: Partial<WhatsAppTemplate>) => {
    try {
      // Transform updates to match database schema
      const dbUpdates = {
        name_meta: updates.name,
        body: updates.content,
        domain: updates.domain,
        intent: updates.intent,
        language: updates.language
      };

      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Transform back for our state
      const updatedTemplate = {
        ...data,
        name: data.name_meta,
        content: data.body,
        template_type: 'text' as const,
        variables: [],
        status: 'active' as const
      };
      
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      setIsEditOpen(false);
      toast.success('Template updated successfully');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const sendTestMessage = async (template: WhatsAppTemplate) => {
    try {
      const { error } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'send_test',
          template_id: template.id,
          phone_number: '+250788123456' // Test number
        }
      });

      if (error) throw error;
      toast.success('Test message sent successfully');
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Failed to send test message');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesDomain = selectedDomain === "all" || template.domain === selectedDomain;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Message Templates</h2>
          <p className="text-muted-foreground">
            Manage WhatsApp message templates for all services
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new WhatsApp message template
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              onSubmit={createTemplate}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by domain" />
          </SelectTrigger>
          <SelectContent>
            {domains.map(domain => (
              <SelectItem key={domain.value} value={domain.value}>
                {domain.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredTemplates.map(template => (
          <Card key={template.id} className="group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {template.domain} • {template.intent}
                  </CardDescription>
                </div>
                <Badge 
                  variant={template.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {template.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {template.content}
              </p>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsEditOpen(true);
                  }}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendTestMessage(template)}
                >
                  <Send className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(template.content);
                    toast.success('Template copied to clipboard');
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Modify the selected template
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <TemplateForm
              template={selectedTemplate}
              onSubmit={(data) => updateTemplate(selectedTemplate.id, data)}
              onCancel={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateFormProps {
  template?: WhatsAppTemplate;
  onSubmit: (data: Partial<WhatsAppTemplate>) => void;
  onCancel: () => void;
}

function TemplateForm({ template, onSubmit, onCancel }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    content: template?.content || '',
    template_type: template?.template_type || 'text',
    domain: template?.domain || 'payment',
    intent: template?.intent || 'confirmation',
    language: template?.language || 'en',
    status: template?.status || 'draft' as const,
    variables: template?.variables || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Template Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Payment Confirmation"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Language</label>
          <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="rw">Kinyarwanda</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Domain</label>
          <Select value={formData.domain} onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome">Welcome</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="moto">Moto/Transport</SelectItem>
              <SelectItem value="commerce">Commerce/Ordering</SelectItem>
              <SelectItem value="listings">Listings/Properties</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="support">Support/Help</SelectItem>
              <SelectItem value="language">Language/Localization</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Intent</label>
          <Input
            value={formData.intent}
            onChange={(e) => setFormData(prev => ({ ...prev, intent: e.target.value }))}
            placeholder="e.g., confirmation"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Type</label>
          <Select value={formData.template_type} onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="quick_reply">Quick Reply</SelectItem>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Message Content</label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Enter your message template..."
          rows={6}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use variables like {"{customer_name}"} or {"{amount}"} for dynamic content
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {template ? 'Update' : 'Create'} Template
        </Button>
      </div>
    </form>
  );
}