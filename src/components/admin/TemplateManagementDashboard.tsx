import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  BarChart3, 
  Play, 
  Plus, 
  Edit, 
  Trash, 
  Send, 
  Eye,
  TrendingUp,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import TemplateAnalytics from './TemplateAnalytics';

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected' | 'draft';
  components: any[];
  created_at: string;
  updated_at: string;
  click_rate?: number;
  conversion_rate?: number;
  engagement_score?: number;
}

interface TemplateMetrics {
  total_sends: number;
  unique_opens: number;
  clicks: number;
  conversions: number;
  click_rate: number;
  conversion_rate: number;
  engagement_score: number;
  last_sent: string;
}

export default function TemplateManagementDashboard() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templateMetrics, setTemplateMetrics] = useState<Record<string, TemplateMetrics>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testVariables, setTestVariables] = useState('{}');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'marketing',
    language: 'en',
    header_text: '',
    body_text: '',
    footer_text: '',
    buttons: [] as any[]
  });

  useEffect(() => {
    loadTemplates();
    loadTemplateMetrics();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: { action: 'list' }
      });

      if (error) throw error;

      if (data?.templates) {
        setTemplates(data.templates);
      } else {
        // Mock data for development
        const mockTemplates: WhatsAppTemplate[] = [
          {
            id: '1',
            name: 'tpl_welcome_quick_v1',
            category: 'utility',
            language: 'en',
            status: 'approved',
            components: [
              { type: 'HEADER', text: 'Welcome to easyMO!' },
              { type: 'BODY', text: 'Welcome to easyMO! 🇷🇼 Your all-in-one platform for payments, transport, and business discovery.' },
              { type: 'FOOTER', text: 'easyMO - Making life easier' },
              { type: 'BUTTONS', buttons: [
                { type: 'QUICK_REPLY', text: 'Pay', payload: 'PAY_QR' },
                { type: 'QUICK_REPLY', text: 'Transport', payload: 'GET_RIDE' },
                { type: 'QUICK_REPLY', text: 'Business', payload: 'FIND_BUSINESS' }
              ]}
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            click_rate: 45.2,
            conversion_rate: 12.8,
            engagement_score: 8.7
          },
          {
            id: '2',
            name: 'tpl_payment_confirmation_v1',
            category: 'transactional',
            language: 'en',
            status: 'approved',
            components: [
              { type: 'HEADER', text: 'Payment Confirmed' },
              { type: 'BODY', text: 'Your payment of {{amount}} RWF has been confirmed. Reference: {{ref_number}}' },
              { type: 'FOOTER', text: 'Thank you for using easyMO' }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            click_rate: 67.3,
            conversion_rate: 89.1,
            engagement_score: 9.2
          }
        ];
        setTemplates(mockTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('template-performance-monitor', {
        body: { action: 'metrics', period: '30d' }
      });

      if (error) throw error;

      if (data?.metrics) {
        const metricsMap: Record<string, TemplateMetrics> = {};
        data.metrics.forEach((metric: any) => {
          metricsMap[metric.template_name] = metric;
        });
        setTemplateMetrics(metricsMap);
      }
    } catch (error) {
      console.error('Error loading template metrics:', error);
    }
  };

  const createTemplate = async () => {
    try {
      const components = [
        ...(newTemplate.header_text ? [{ type: 'HEADER', text: newTemplate.header_text }] : []),
        { type: 'BODY', text: newTemplate.body_text },
        ...(newTemplate.footer_text ? [{ type: 'FOOTER', text: newTemplate.footer_text }] : []),
        ...(newTemplate.buttons.length > 0 ? [{ type: 'BUTTONS', buttons: newTemplate.buttons }] : [])
      ];

      const { data, error } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'create',
          template: {
            name: newTemplate.name,
            category: newTemplate.category,
            language: newTemplate.language,
            components
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template created successfully'
      });

      setCreateDialogOpen(false);
      setNewTemplate({
        name: '',
        category: 'marketing',
        language: 'en',
        header_text: '',
        body_text: '',
        footer_text: '',
        buttons: []
      });
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive'
      });
    }
  };

  const testTemplate = async (template: WhatsAppTemplate) => {
    if (!testPhone.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number for testing',
        variant: 'destructive'
      });
      return;
    }

    try {
      let variables = {};
      if (testVariables.trim()) {
        variables = JSON.parse(testVariables);
      }

      const { data, error } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'send',
          templateName: template.name,
          recipientPhone: testPhone,
          variables
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Test message sent to ${testPhone}`
      });

      setTestPhone('');
      setTestVariables('{}');
    } catch (error) {
      console.error('Error sending test message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test message',
        variant: 'destructive'
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'delete',
          templateId
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template deleted successfully'
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    }
  };

  const addButton = () => {
    setNewTemplate(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '', payload: '' }]
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setNewTemplate(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) => 
        i === index ? { ...btn, [field]: value } : btn
      )
    }));
  };

  const removeButton = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const renderTemplatePreview = (template: WhatsAppTemplate) => {
    const headerComponent = template.components?.find(c => c.type === 'HEADER');
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    const footerComponent = template.components?.find(c => c.type === 'FOOTER');
    const buttonsComponent = template.components?.find(c => c.type === 'BUTTONS');

    return (
      <div className="border rounded-lg p-4 bg-green-50 max-w-sm">
        {headerComponent && (
          <div className="font-semibold text-sm mb-2 text-green-800">
            {headerComponent.text}
          </div>
        )}
        
        {bodyComponent && (
          <div className="text-sm mb-2 whitespace-pre-wrap">
            {bodyComponent.text}
          </div>
        )}
        
        {footerComponent && (
          <div className="text-xs text-gray-600 mb-2">
            {footerComponent.text}
          </div>
        )}
        
        {buttonsComponent?.buttons && (
          <div className="space-y-1">
            {buttonsComponent.buttons.map((btn: any, index: number) => (
              <div key={index} className="bg-white border rounded px-3 py-1 text-sm text-center">
                {btn.text}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      draft: 'outline'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground">Manage WhatsApp templates, analytics, and testing</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new WhatsApp message template for your campaigns
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., welcome_message_v1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                      <SelectItem value="transactional">Transactional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Header Text (Optional)</label>
                <Input
                  value={newTemplate.header_text}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, header_text: e.target.value }))}
                  placeholder="Welcome to easyMO!"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Body Text</label>
                <Textarea
                  value={newTemplate.body_text}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, body_text: e.target.value }))}
                  placeholder="Your message body here..."
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Footer Text (Optional)</label>
                <Input
                  value={newTemplate.footer_text}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, footer_text: e.target.value }))}
                  placeholder="easyMO - Making life easier"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Quick Reply Buttons</label>
                  <Button variant="outline" size="sm" onClick={addButton}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Button
                  </Button>
                </div>
                
                {newTemplate.buttons.map((button, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="Button text"
                      value={button.text}
                      onChange={(e) => updateButton(index, 'text', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Payload"
                        value={button.payload}
                        onChange={(e) => updateButton(index, 'payload', e.target.value)}
                      />
                      <Button variant="outline" size="sm" onClick={() => removeButton(index)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTemplate} disabled={!newTemplate.name || !newTemplate.body_text}>
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{templates.length}</p>
                    <p className="text-sm text-muted-foreground">Total Templates</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {templates.filter(t => t.status === 'approved').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {templates.reduce((sum, t) => sum + (t.engagement_score || 0), 0) / templates.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Manage your WhatsApp message templates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.category}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(template.status)}</TableCell>
                      <TableCell>{template.language.toUpperCase()}</TableCell>
                      <TableCell>{template.click_rate?.toFixed(1)}%</TableCell>
                      <TableCell>{template.conversion_rate?.toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${Math.min((template.engagement_score || 0) * 10, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{template.engagement_score?.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setPreviewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <TemplateAnalytics />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Testing</CardTitle>
              <CardDescription>Test your templates before sending to users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Template</label>
                    <Select 
                      value={selectedTemplate?.id || ''} 
                      onValueChange={(value) => {
                        const template = templates.find(t => t.id === value);
                        setSelectedTemplate(template || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template to test" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Test Phone Number</label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="250788123456"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Template Variables (JSON)</label>
                    <Textarea
                      value={testVariables}
                      onChange={(e) => setTestVariables(e.target.value)}
                      placeholder='{"amount": "5000", "name": "John"}'
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={() => selectedTemplate && testTemplate(selectedTemplate)}
                    disabled={!selectedTemplate || !testPhone}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Message
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Preview</label>
                  {selectedTemplate ? (
                    renderTemplatePreview(selectedTemplate)
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Select a template to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
              <CardDescription>Recent template tests and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2" />
                <p>Test history will appear here after sending test messages</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - {selectedTemplate?.category}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {selectedTemplate && renderTemplatePreview(selectedTemplate)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}