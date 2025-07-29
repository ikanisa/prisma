import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Edit, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackTemplate {
  id: string;
  template_name: string;
  template_type: string;
  content: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATES = [
  {
    template_name: "rating_request",
    template_type: "interactive",
    content: {
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: "How was my help today? Your feedback helps me improve! 🤖"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "feedback_helpful",
                title: "👍 Helpful"
              }
            },
            {
              type: "reply", 
              reply: {
                id: "feedback_not_helpful",
                title: "👎 Needs work"
              }
            }
          ]
        }
      }
    },
    is_active: true
  },
  {
    template_name: "detailed_feedback_request",
    template_type: "text",
    content: {
      type: "text",
      text: "Thanks for the feedback! Could you tell me what I could improve? Just reply with your suggestions."
    },
    is_active: true
  },
  {
    template_name: "satisfaction_survey",
    template_type: "interactive",
    content: {
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: "How satisfied are you with easyMO services?"
        },
        action: {
          button: "Rate Experience",
          sections: [
            {
              title: "Rating",
              rows: [
                { id: "rating_5", title: "⭐⭐⭐⭐⭐ Excellent" },
                { id: "rating_4", title: "⭐⭐⭐⭐ Good" },
                { id: "rating_3", title: "⭐⭐⭐ Average" },
                { id: "rating_2", title: "⭐⭐ Poor" },
                { id: "rating_1", title: "⭐ Very Poor" }
              ]
            }
          ]
        }
      }
    },
    is_active: false
  },
  {
    template_name: "feature_feedback",
    template_type: "interactive",
    content: {
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: "Which feature would you like feedback on?"
        },
        action: {
          button: "Select Feature",
          sections: [
            {
              title: "Features",
              rows: [
                { id: "feedback_payments", title: "💰 Payment System" },
                { id: "feedback_transport", title: "🏍️ Transport Booking" },
                { id: "feedback_shopping", title: "🛒 Shopping Experience" },
                { id: "feedback_general", title: "💬 General Service" }
              ]
            }
          ]
        }
      }
    },
    is_active: false
  }
];

export function WhatsAppFeedbackTemplates() {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<any>({});
  const [previewTemplate, setPreviewTemplate] = useState<FeedbackTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbackTemplates();
  }, []);

  const fetchFeedbackTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('id, template_name, template_type, content, is_active, created_at, updated_at')
        .in('template_name', DEFAULT_TEMPLATES.map(t => t.template_name))
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no templates exist, create defaults
      if (!data || data.length === 0) {
        await createDefaultTemplates();
        return;
      }

      setTemplates(data);
    } catch (error) {
      console.error('Error fetching feedback templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch WhatsApp feedback templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const templatesForInsert = DEFAULT_TEMPLATES.map(t => ({
        template_name: t.template_name,
        template_type: t.template_type,
        content: t.content,
        is_active: t.is_active
      }));
      
      const { error } = await supabase
        .from('whatsapp_templates')
        .insert(templatesForInsert);

      if (error) throw error;
      
      await fetchFeedbackTemplates();
      
      toast({
        title: "Success",
        description: "Default feedback templates created",
      });
    } catch (error) {
      console.error('Error creating default templates:', error);
      toast({
        title: "Error",
        description: "Failed to create default templates",
        variant: "destructive"
      });
    }
  };

  const toggleTemplate = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ is_active: isActive } as any)
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, is_active: isActive } : t
      ));

      toast({
        title: "Success",
        description: `Template ${isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    }
  };

  const updateTemplate = async (templateId: string, content: any) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ 
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, content: content } : t
      ));

      setEditingTemplate(null);
      
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

  const testTemplate = async (template: FeedbackTemplate) => {
    try {
      const { error } = await supabase.functions.invoke('whatsapp-webhook', {
        body: {
          action: 'send_template',
          template_name: template.template_name,
          to: '+250788123456', // Test number
          content: template.content
        }
      });

      if (error) throw error;

      toast({
        title: "Test Sent",
        description: `Test message sent using ${template.template_name} template`,
      });
    } catch (error) {
      console.error('Error testing template:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test message",
        variant: "destructive"
      });
    }
  };

  const renderTemplatePreview = (template: FeedbackTemplate) => {
    const content = template.content;
    
    if (content.type === 'text') {
      return (
        <div className="bg-primary/10 p-3 rounded-lg">
          <p className="text-sm">{content.text}</p>
        </div>
      );
    }
    
    if (content.type === 'interactive' && content.interactive?.type === 'button') {
      return (
        <div className="bg-primary/10 p-3 rounded-lg space-y-3">
          <p className="text-sm">{content.interactive.body.text}</p>
          <div className="flex gap-2">
            {content.interactive.action.buttons?.map((button: any, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {button.reply.title}
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    
    if (content.type === 'interactive' && content.interactive?.type === 'list') {
      return (
        <div className="bg-primary/10 p-3 rounded-lg space-y-3">
          <p className="text-sm">{content.interactive.body.text}</p>
          <Badge variant="outline" className="text-xs">
            {content.interactive.action.button}
          </Badge>
          <div className="space-y-1">
            {content.interactive.action.sections?.[0]?.rows?.map((row: any, index: number) => (
              <div key={index} className="text-xs text-muted-foreground">
                • {row.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-muted p-3 rounded-lg">
        <p className="text-xs text-muted-foreground">Preview not available</p>
      </div>
    );
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
            Interactive templates for collecting user feedback via WhatsApp
          </p>
        </div>
        <Button onClick={createDefaultTemplates} variant="outline">
          Reset to Defaults
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className={`transition-all ${
            template.is_active ? 'ring-2 ring-primary/20 bg-primary/5' : ''
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.template_type === 'interactive' ? (
                      <MessageSquare className="h-5 w-5 text-primary" />
                    ) : (
                      <Send className="h-5 w-5 text-secondary" />
                    )}
                    {template.template_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </CardTitle>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <Switch
                  checked={template.is_active}
                  onCheckedChange={(checked) => toggleTemplate(template.id, checked)}
                />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Preview
                </Label>
                {renderTemplatePreview(template)}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(template.id);
                    setEditContent(template.content);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testTemplate(template)}
                  disabled={!template.is_active}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingTemplate && (
        <Card className="fixed inset-4 z-50 max-w-4xl mx-auto my-auto bg-background border shadow-lg">
          <CardHeader>
            <CardTitle>Edit Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label>Template Content (JSON)</Label>
                <Textarea
                  value={JSON.stringify(editContent, null, 2)}
                  onChange={(e) => {
                    try {
                      setEditContent(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, keep current state
                    }
                  }}
                  className="font-mono text-sm min-h-[300px]"
                />
              </div>
              
              <div className="space-y-4">
                <Label>Live Preview</Label>
                <div className="border rounded-lg p-4 min-h-[300px] bg-muted/50">
                  {renderTemplatePreview({ 
                    id: '', 
                    template_name: '', 
                    template_type: '', 
                    content: editContent,
                    is_active: true,
                    created_at: '',
                    updated_at: ''
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingTemplate(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => updateTemplate(editingTemplate, editContent)}
              >
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
