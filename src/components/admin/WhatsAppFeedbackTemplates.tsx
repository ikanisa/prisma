import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Edit, Check, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export function WhatsAppFeedbackTemplates() {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTemplate, setNewTemplate] = useState<Partial<FeedbackTemplate>>({
    code: '',
    name_meta: '',
    body: '',
    category: 'utility',
    domain: 'easymo',
    intent: 'feedback_collection',
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
        .eq('intent', 'feedback_collection')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch feedback templates",
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
        intent: 'feedback_collection',
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

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
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
          <h2 className="text-2xl font-bold">WhatsApp Feedback Templates</h2>
          <p className="text-muted-foreground">
            Create and manage feedback collection templates for WhatsApp
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
                  placeholder="e.g., Service Feedback Request"
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
                placeholder="How was your experience with our service?"
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
                placeholder='[{"type": "quick_reply", "text": "👍 Good"}, {"type": "quick_reply", "text": "👎 Poor"}]'
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

        {/* Existing Templates */}
        {templates.map((template) => (
          <Card key={template.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {template.name_meta}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={template.status === 'approved' ? "default" : template.status === 'submitted' ? "secondary" : "outline"}>
                      {template.status}
                    </Badge>
                    <Badge variant="outline">{template.code}</Badge>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => deleteTemplate(template.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Message Body</Label>
                  <p className="text-sm mt-1">{template.body}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Feedback Buttons</Label>
                  {renderTemplateButtons(template.buttons)}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
