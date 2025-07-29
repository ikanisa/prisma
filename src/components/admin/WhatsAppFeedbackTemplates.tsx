import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Edit, Check, X, Plus, Zap, Car, Home, ShoppingCart, HelpCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WHATSAPP_TEMPLATES } from "@/agent/templates/whatsapp_templates";

interface FeedbackTemplate {
  id: string;
  code: string;
  name_meta: string;
  body: string;
  category: string;
  domain: string;
  intent: string;
  language: string;
  buttons?: any;
  status: string;
  created_at: string;
}

interface PredefinedTemplate {
  id: string;
  name: string;
  domain: string;
  intent: string;
  template_type: string;
  content: any;
  params?: string[];
}

export function WhatsAppFeedbackTemplates() {
  const [dbTemplates, setDbTemplates] = useState<FeedbackTemplate[]>([]);
  const [predefinedTemplates] = useState<PredefinedTemplate[]>(WHATSAPP_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FeedbackTemplate>>({});
  const [newTemplate, setNewTemplate] = useState<Partial<FeedbackTemplate>>({
    code: '',
    name_meta: '',
    body: '',
    category: 'utility',
    domain: 'easymo',
    intent: 'action_menu',
    language: 'en',
    buttons: '[]',
    status: 'draft'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .neq('buttons', '[]')
        .not('buttons', 'is', null)
        .order('domain', { ascending: true })
        .order('intent', { ascending: true });

      if (error) throw error;
      setDbTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      const templateData = {
        code: newTemplate.code!,
        name_meta: newTemplate.name_meta!,
        body: newTemplate.body!,
        category: newTemplate.category!,
        domain: newTemplate.domain!,
        intent: newTemplate.intent!,
        language: newTemplate.language!,
        status: newTemplate.status!,
        buttons: JSON.parse(typeof newTemplate.buttons === 'string' ? newTemplate.buttons : '[]')
      };
      
      const { error } = await supabase
        .from('whatsapp_templates')
        .insert([templateData]);

      if (error) throw error;

      await fetchTemplates();
      setNewTemplate({
        code: '',
        name_meta: '',
        body: '',
        category: 'utility',
        domain: 'easymo',
        intent: 'action_menu',
        language: 'en',
        buttons: '[]',
        status: 'draft'
      });

      toast({
        title: "Success",
        description: "Feedback template created successfully",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create feedback template",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setDbTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const updateTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({
          name_meta: editForm.name_meta,
          body: editForm.body,
          buttons: typeof editForm.buttons === 'string' ? JSON.parse(editForm.buttons) : editForm.buttons,
          status: editForm.status
        })
        .eq('id', templateId);

      if (error) throw error;

      await fetchTemplates();
      setEditingTemplate(null);
      setEditForm({});
      
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    }
  };

  const startEditing = (template: FeedbackTemplate) => {
    setEditingTemplate(template.id);
    setEditForm({
      name_meta: template.name_meta,
      body: template.body,
      buttons: typeof template.buttons === 'string' ? template.buttons : JSON.stringify(template.buttons, null, 2),
      status: template.status
    });
  };

  const renderTemplateButtons = (buttons: any) => {
    try {
      const buttonArray = typeof buttons === 'string' ? JSON.parse(buttons) : buttons;
      if (!Array.isArray(buttonArray)) return null;
      
      return (
        <div className="flex flex-wrap gap-1 mt-2">
          {buttonArray.map((button: any, idx: number) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {button.text || button.title || button.reply?.title || 'Button'}
            </Badge>
          ))}
        </div>
      );
    } catch (error) {
      return <span className="text-xs text-muted-foreground">Invalid button format</span>;
    }
  };

  const renderPredefinedButtons = (content: any) => {
    try {
      if (content?.action?.buttons) {
        return (
          <div className="flex flex-wrap gap-1 mt-2">
            {content.action.buttons.map((button: any, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {button.reply?.title || button.text || 'Button'}
              </Badge>
            ))}
          </div>
        );
      }
      return null;
    } catch (error) {
      return <span className="text-xs text-muted-foreground">No buttons</span>;
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'payments': return <Wallet className="h-4 w-4" />;
      case 'moto': return <Car className="h-4 w-4" />;
      case 'listings': return <Home className="h-4 w-4" />;
      case 'commerce': return <ShoppingCart className="h-4 w-4" />;
      case 'admin_support': return <HelpCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Action Templates</h2>
          <p className="text-muted-foreground">
            Manage all WhatsApp templates with quick action buttons for payments, rides, shopping, and more
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Template */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Code</Label>
                <Input
                  value={newTemplate.code || ''}
                  onChange={(e) => setNewTemplate({
                    ...newTemplate,
                    code: e.target.value
                  })}
                  placeholder="e.g., service_feedback"
                />
              </div>
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={newTemplate.name_meta || ''}
                  onChange={(e) => setNewTemplate({
                    ...newTemplate,
                    name_meta: e.target.value
                  })}
                  placeholder="e.g., Payment Action Menu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                value={newTemplate.body || ''}
                onChange={(e) => setNewTemplate({
                  ...newTemplate,
                  body: e.target.value
                })}
                placeholder="💰 easyMO Payments - How can I help you today?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Buttons (JSON)</Label>
              <Textarea
                value={newTemplate.buttons || '[]'}
                onChange={(e) => setNewTemplate({
                  ...newTemplate,
                  buttons: e.target.value
                })}
                placeholder='[{"type": "reply", "reply": {"id": "get_paid", "title": "📱 Get Paid"}}, {"type": "reply", "reply": {"id": "pay_someone", "title": "💸 Pay Someone"}}]'
                rows={2}
              />
            </div>

            <Button 
              onClick={createTemplate}
              disabled={!newTemplate.code || !newTemplate.name_meta || !newTemplate.body}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>

        {/* Predefined Templates */}
        {predefinedTemplates.filter(t => t.content?.action?.buttons || t.template_type === 'interactive').map((template) => (
          <Card key={template.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getDomainIcon(template.domain)}
                    {template.name}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">Predefined</Badge>
                    <Badge variant="outline">{template.domain}</Badge>
                    <Badge variant="outline">{template.intent}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Message Body</Label>
                  <p className="text-sm mt-1 bg-muted p-2 rounded">
                    {template.content?.body?.text || template.content?.text || 'Interactive template'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Action Buttons</Label>
                  {renderPredefinedButtons(template.content)}
                </div>
                
                {template.params && template.params.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Parameters</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.params.map((param, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {param}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Database Templates */}
        {dbTemplates.map((template) => (
          <Card key={template.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getDomainIcon(template.domain)}
                    {editingTemplate === template.id ? (
                      <Input
                        value={editForm.name_meta || ''}
                        onChange={(e) => setEditForm({...editForm, name_meta: e.target.value})}
                        className="text-lg font-semibold"
                      />
                    ) : (
                      template.name_meta
                    )}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={template.status === 'approved' ? "default" : template.status === 'submitted' ? "secondary" : "outline"}>
                      {editingTemplate === template.id ? (
                        <select 
                          value={editForm.status || template.status}
                          onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                          className="bg-transparent text-xs"
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approved</option>
                        </select>
                      ) : (
                        template.status
                      )}
                    </Badge>
                    <Badge variant="outline">{template.code}</Badge>
                    <Badge variant="outline">{template.domain}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingTemplate === template.id ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateTemplate(template.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(null);
                          setEditForm({});
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startEditing(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Message Body</Label>
                  {editingTemplate === template.id ? (
                    <Textarea
                      value={editForm.body || ''}
                      onChange={(e) => setEditForm({...editForm, body: e.target.value})}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1">{template.body}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Action Buttons JSON</Label>
                  {editingTemplate === template.id ? (
                    <Textarea
                      value={editForm.buttons || ''}
                      onChange={(e) => setEditForm({...editForm, buttons: e.target.value})}
                      rows={4}
                      className="font-mono text-xs"
                    />
                  ) : (
                    <>
                      {renderTemplateButtons(template.buttons)}
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(template.buttons, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
                
                {editingTemplate !== template.id && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
