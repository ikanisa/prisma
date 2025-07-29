import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Send, Edit, Trash2, Eye, MessageSquare, Settings, BarChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppTemplate {
  id: string;
  code: string;
  domain: string;
  intent_ids: string[];
  description: string;
  is_active: boolean;
  ab_group: string;
  created_at: string;
  whatsapp_template_versions: any[];
}

interface TemplateComponent {
  id?: string;
  component_type: 'HEADER' | 'BODY' | 'FOOTER';
  text: string;
  format: string;
  position: number;
}

interface TemplateButton {
  id?: string;
  btn_type: 'QUICK_REPLY' | 'URL' | 'CALL_PHONE' | 'COPY_CODE' | 'FLOW';
  text: string;
  url?: string;
  phone_number?: string;
  payload_key?: string;
  position: number;
}

export default function WhatsAppTemplatesManagement() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const { toast } = useToast();

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    code: '',
    domain: 'system',
    intent_ids: [],
    description: '',
    language: 'en',
    meta_name: '',
    category: 'UTILITY',
    components: [] as TemplateComponent[],
    buttons: [] as TemplateButton[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, flowsRes, listsRes, variablesRes] = await Promise.all([
        supabase.functions.invoke('whatsapp-templates-manager', {
          body: { action: 'list' }
        }),
        supabase.functions.invoke('whatsapp-flows-handler', {
          body: { action: 'list_flows' }
        }),
        fetch('/api/whatsapp-lists').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/whatsapp-variables').then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      if (templatesRes.data?.templates) {
        setTemplates(templatesRes.data.templates);
      }
      if (flowsRes.data?.flows) {
        setFlows(flowsRes.data.flows);
      }
      setLists([]);
      setVariables([]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch templates data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      const { data } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'create',
          template_data: {
            template: {
              code: newTemplate.code,
              domain: newTemplate.domain,
              intent_ids: newTemplate.intent_ids,
              description: newTemplate.description
            },
            version: {
              language: newTemplate.language,
              meta_name: newTemplate.meta_name,
              category: newTemplate.category,
              status: 'PENDING'
            },
            components: newTemplate.components,
            buttons: newTemplate.buttons
          }
        }
      });

      if (data) {
        toast({
          title: "Success",
          description: "Template created successfully"
        });
        setShowCreateDialog(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      });
    }
  };

  const sendTemplate = async (template: WhatsAppTemplate, phone: string) => {
    try {
      const { data } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'send',
          template_id: template.id,
          recipient_phone: phone,
          variables: {} // Add variable mapping UI later
        }
      });

      if (data?.success) {
        toast({
          title: "Success",
          description: "Template sent successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send template",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewTemplate({
      code: '',
      domain: 'system',
      intent_ids: [],
      description: '',
      language: 'en',
      meta_name: '',
      category: 'UTILITY',
      components: [],
      buttons: []
    });
  };

  const addComponent = () => {
    setNewTemplate(prev => ({
      ...prev,
      components: [...prev.components, {
        component_type: 'BODY',
        text: '',
        format: 'TEXT',
        position: prev.components.length + 1
      }]
    }));
  };

  const addButton = () => {
    setNewTemplate(prev => ({
      ...prev,
      buttons: [...prev.buttons, {
        btn_type: 'QUICK_REPLY',
        text: '',
        position: prev.buttons.length + 1
      }]
    }));
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || template.domain === selectedDomain;
    const matchesLanguage = selectedLanguage === 'all' || 
                           template.whatsapp_template_versions.some(v => v.language === selectedLanguage);
    
    return matchesSearch && matchesDomain && matchesLanguage;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAUSED: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">WhatsApp Templates Management</h1>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New WhatsApp Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Template Code</Label>
                    <Input
                      id="code"
                      value={newTemplate.code}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="TPL_WELCOME_MAIN"
                    />
                  </div>
                  <div>
                    <Label htmlFor="domain">Domain</Label>
                    <Select value={newTemplate.domain} onValueChange={(value) => 
                      setNewTemplate(prev => ({ ...prev, domain: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="mobility">Mobility</SelectItem>
                        <SelectItem value="listings">Listings</SelectItem>
                        <SelectItem value="commerce">Commerce</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={newTemplate.language} onValueChange={(value) => 
                      setNewTemplate(prev => ({ ...prev, language: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="rw">Kinyarwanda</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newTemplate.category} onValueChange={(value) => 
                      setNewTemplate(prev => ({ ...prev, category: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTILITY">Utility</SelectItem>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the template purpose"
                  />
                </div>

                <div>
                  <Label htmlFor="meta_name">Meta Name</Label>
                  <Input
                    id="meta_name"
                    value={newTemplate.meta_name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, meta_name: e.target.value }))}
                    placeholder="easymo_welcome_main_en"
                  />
                </div>

                {/* Components Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Components</Label>
                    <Button variant="outline" size="sm" onClick={addComponent}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Component
                    </Button>
                  </div>
                  {newTemplate.components.map((component, index) => (
                    <Card key={index} className="mb-4">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={component.component_type}
                              onValueChange={(value) => {
                                const newComponents = [...newTemplate.components];
                                newComponents[index].component_type = value as 'HEADER' | 'BODY' | 'FOOTER';
                                setNewTemplate(prev => ({ ...prev, components: newComponents }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HEADER">Header</SelectItem>
                                <SelectItem value="BODY">Body</SelectItem>
                                <SelectItem value="FOOTER">Footer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Format</Label>
                            <Select
                              value={component.format}
                              onValueChange={(value) => {
                                const newComponents = [...newTemplate.components];
                                newComponents[index].format = value;
                                setNewTemplate(prev => ({ ...prev, components: newComponents }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TEXT">Text</SelectItem>
                                <SelectItem value="IMAGE">Image</SelectItem>
                                <SelectItem value="VIDEO">Video</SelectItem>
                                <SelectItem value="DOCUMENT">Document</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const newComponents = newTemplate.components.filter((_, i) => i !== index);
                                setNewTemplate(prev => ({ ...prev, components: newComponents }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Label>Text</Label>
                          <Textarea
                            value={component.text}
                            onChange={(e) => {
                              const newComponents = [...newTemplate.components];
                              newComponents[index].text = e.target.value;
                              setNewTemplate(prev => ({ ...prev, components: newComponents }));
                            }}
                            placeholder="Enter component text (use {{1}}, {{2}} for variables)"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Buttons Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Buttons</Label>
                    <Button variant="outline" size="sm" onClick={addButton}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Button
                    </Button>
                  </div>
                  {newTemplate.buttons.map((button, index) => (
                    <Card key={index} className="mb-4">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={button.btn_type}
                              onValueChange={(value) => {
                                const newButtons = [...newTemplate.buttons];
                                newButtons[index].btn_type = value as any;
                                setNewTemplate(prev => ({ ...prev, buttons: newButtons }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                                <SelectItem value="URL">URL</SelectItem>
                                <SelectItem value="CALL_PHONE">Call Phone</SelectItem>
                                <SelectItem value="COPY_CODE">Copy Code</SelectItem>
                                <SelectItem value="FLOW">Flow</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Text</Label>
                            <Input
                              value={button.text}
                              onChange={(e) => {
                                const newButtons = [...newTemplate.buttons];
                                newButtons[index].text = e.target.value;
                                setNewTemplate(prev => ({ ...prev, buttons: newButtons }));
                              }}
                              placeholder="Button text"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const newButtons = newTemplate.buttons.filter((_, i) => i !== index);
                                setNewTemplate(prev => ({ ...prev, buttons: newButtons }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {(button.btn_type === 'URL' || button.btn_type === 'CALL_PHONE') && (
                          <div className="mt-4">
                            <Label>{button.btn_type === 'URL' ? 'URL' : 'Phone Number'}</Label>
                            <Input
                              value={button.btn_type === 'URL' ? button.url || '' : button.phone_number || ''}
                              onChange={(e) => {
                                const newButtons = [...newTemplate.buttons];
                                if (button.btn_type === 'URL') {
                                  newButtons[index].url = e.target.value;
                                } else {
                                  newButtons[index].phone_number = e.target.value;
                                }
                                setNewTemplate(prev => ({ ...prev, buttons: newButtons }));
                              }}
                              placeholder={button.btn_type === 'URL' ? 'https://example.com' : '+250123456789'}
                            />
                          </div>
                        )}
                        {button.btn_type === 'QUICK_REPLY' && (
                          <div className="mt-4">
                            <Label>Payload Key</Label>
                            <Input
                              value={button.payload_key || ''}
                              onChange={(e) => {
                                const newButtons = [...newTemplate.buttons];
                                newButtons[index].payload_key = e.target.value;
                                setNewTemplate(prev => ({ ...prev, buttons: newButtons }));
                              }}
                              placeholder="PAY, GET_PAID, etc."
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTemplate}>
                    Create Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Flows</p>
                <p className="text-2xl font-bold">{flows.filter(f => f.status === 'APPROVED').length}</p>
              </div>
              <Settings className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interactive Lists</p>
                <p className="text-2xl font-bold">{lists.length}</p>
              </div>
              <BarChart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variables</p>
                <p className="text-2xl font-bold">{variables.length}</p>
              </div>
              <Eye className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="flows">Flows</TabsTrigger>
          <TabsTrigger value="lists">Interactive Lists</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="mobility">Mobility</SelectItem>
                <SelectItem value="listings">Listings</SelectItem>
                <SelectItem value="commerce">Commerce</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="rw">Kinyarwanda</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="sw">Swahili</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.code}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </div>
                    <Badge variant="outline">{template.domain}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Language versions */}
                    <div>
                      <p className="text-sm font-medium mb-2">Versions:</p>
                      <div className="flex flex-wrap gap-2">
                        {template.whatsapp_template_versions?.map((version) => (
                          <div key={version.id} className="flex items-center gap-2">
                            <Badge variant="secondary">{version.language}</Badge>
                            {getStatusBadge(version.status)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Intents */}
                    {template.intent_ids?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Intents:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.intent_ids.map((intent) => (
                            <Badge key={intent} variant="outline" className="text-xs">
                              {intent}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Send className="h-4 w-4 mr-2" />
                            Test Send
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Test Send Template</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="phone">Phone Number</Label>
                              <Input
                                id="phone"
                                placeholder="+250123456789"
                                type="tel"
                              />
                            </div>
                            <Button 
                              onClick={() => sendTemplate(template, '+250123456789')}
                              className="w-full"
                            >
                              Send Test Message
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flows">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flows.map((flow) => (
              <Card key={flow.id}>
                <CardHeader>
                  <CardTitle>{flow.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{flow.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Domain:</span>
                      <Badge variant="outline">{flow.domain}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      {getStatusBadge(flow.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Code:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{flow.code}</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lists">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lists.map((list) => (
              <Card key={list.id}>
                <CardHeader>
                  <CardTitle>{list.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{list.body}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Code:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{list.code}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Sections:</span>
                      <Badge variant="secondary">{list.sections?.length || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="variables">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {variables.map((variable) => (
              <Card key={variable.id}>
                <CardHeader>
                  <CardTitle className="text-sm font-mono">
                    {`{{${variable.var_key}}}`}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{variable.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Required:</span>
                      <Badge variant={variable.required ? "destructive" : "secondary"}>
                        {variable.required ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {variable.example_value && (
                      <div>
                        <span className="text-sm font-medium">Example:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded ml-2">
                          {variable.example_value}
                        </code>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}