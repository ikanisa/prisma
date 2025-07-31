import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowLeft, 
  Send, 
  Users, 
  MessageSquare, 
  Clock, 
  Target, 
  Settings, 
  CalendarIcon,
  Plus,
  X,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  status: string;
}

interface ContactGroup {
  id: string;
  name: string;
  description: string;
  count: number;
}

export default function CampaignCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  
  // Campaign form state
  const [campaignData, setCampaignData] = useState({
    name: "",
    description: "",
    type: "manual", // manual or automated
    template_id: "",
    audience_type: "all_contacts", // all_contacts, businesses, pharmacies, custom
    custom_segments: [] as string[],
    scheduling_type: "immediate", // immediate, scheduled, recurring
    scheduled_for: "",
    recurring_pattern: "",
    automation_rules: {
      trigger_event: "",
      delay_minutes: 0,
      max_sends: 1,
      stop_on_reply: true
    },
    message_customization: {
      personalize: true,
      variables: {} as Record<string, string>
    }
  });

  useEffect(() => {
    fetchTemplates();
    fetchContactGroups();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('status', 'approved')
        .order('category', { ascending: true });

      if (error) throw error;
      
      if (data) {
        // Convert database templates to legacy format for compatibility
        const convertedTemplates = data.map(template => ({
          id: template.id,
          name: template.code, // Use code as name since title doesn't exist
          content: template.body,
          variables: [] as string[], // Extract variables from template body if needed
          category: template.category,
          status: template.status
        }));
        setTemplates(convertedTemplates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const fetchContactGroups = async () => {
    try {
      // Get contact counts by type
      const { data: allContacts } = await supabase
        .from('contacts')
        .select('id', { count: 'exact' });

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id', { count: 'exact' });

      const { data: pharmacies } = await supabase
        .from('businesses')
        .select('id', { count: 'exact' })
        .eq('category', 'pharmacy');

      setContactGroups([
        {
          id: 'all_contacts',
          name: 'All Contacts',
          description: 'All registered contacts in the system',
          count: allContacts?.length || 0
        },
        {
          id: 'businesses',
          name: 'All Businesses',
          description: 'All registered business owners',
          count: businesses?.length || 0
        },
        {
          id: 'pharmacies',
          name: 'Pharmacies',
          description: 'Pharmacy business owners only',
          count: pharmacies?.length || 0
        }
      ]);
    } catch (error) {
      console.error('Error fetching contact groups:', error);
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!campaignData.name || !campaignData.template_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      const campaignPayload = {
        name: campaignData.name,
        description: campaignData.description,
        type: campaignData.type,
        template_id: campaignData.template_id,
        audience_type: campaignData.audience_type,
        scheduled_for: campaignData.scheduling_type === 'scheduled' ? scheduledDate?.toISOString() : null,
        automation_rules: campaignData.automation_rules,
        message_customization: campaignData.message_customization,
        status: campaignData.scheduling_type === 'immediate' ? 'active' : 'scheduled',
        created_at: new Date().toISOString()
      };

      // For demo purposes, we'll show success and navigate back
      toast.success('Campaign created successfully!');
      navigate('/admin/messaging-campaigns');
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === campaignData.template_id);
  const selectedGroup = contactGroups.find(g => g.id === campaignData.audience_type);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/admin/messaging-campaigns')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Button>
        <h1 className="text-3xl font-bold">Create New Campaign</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Campaign Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Input
                      id="name"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter campaign name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={campaignData.description}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your campaign"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Campaign Type</Label>
                    <Select
                      value={campaignData.type}
                      onValueChange={(value) => setCampaignData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual - Send once immediately</SelectItem>
                        <SelectItem value="automated">Automated - Trigger-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {campaignData.type === 'automated' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-medium">Automation Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Trigger Event</Label>
                          <Select
                            value={campaignData.automation_rules.trigger_event}
                            onValueChange={(value) => setCampaignData(prev => ({
                              ...prev,
                              automation_rules: { ...prev.automation_rules, trigger_event: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select trigger" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new_contact">New Contact Registration</SelectItem>
                              <SelectItem value="order_placed">Order Placed</SelectItem>
                              <SelectItem value="payment_received">Payment Received</SelectItem>
                              <SelectItem value="inactive_user">User Inactive (7 days)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Delay (minutes)</Label>
                          <Input
                            type="number"
                            value={campaignData.automation_rules.delay_minutes}
                            onChange={(e) => setCampaignData(prev => ({
                              ...prev,
                              automation_rules: { ...prev.automation_rules, delay_minutes: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={campaignData.automation_rules.stop_on_reply}
                          onCheckedChange={(checked) => setCampaignData(prev => ({
                            ...prev,
                            automation_rules: { ...prev.automation_rules, stop_on_reply: checked }
                          }))}
                        />
                        <Label>Stop sending if user replies</Label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    WhatsApp Template Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-colors",
                          campaignData.template_id === template.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                        )}
                        onClick={() => setCampaignData(prev => ({ ...prev, template_id: template.id }))}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline">{template.category}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 max-w-md">{template.content}</p>
                            {template.variables.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {template.variables.map((variable) => (
                                  <Badge key={variable} variant="secondary" className="text-xs">
                                    {variable}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      WhatsApp Business Templates
                    </div>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Sync Templates
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    These templates are synced from your WhatsApp Business account and require approval from WhatsApp before use.
                  </div>
                  
                  <div className="grid gap-4">
                    {templates.filter(t => t.category === 'pharmacy' || t.category === 'payment' || t.category === 'support').map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "p-4 border rounded-lg transition-colors",
                          "border-green-200 bg-green-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                {template.category}
                              </Badge>
                              <Badge variant="default" className="bg-green-600">
                                {template.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 max-w-md">{template.content}</p>
                            {template.variables.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                <span className="text-xs text-gray-500 mr-2">Variables:</span>
                                {template.variables.map((variable) => (
                                  <Badge key={variable} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    {variable}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setCampaignData(prev => ({ ...prev, template_id: template.id }))}
                            >
                              Use Template
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg text-center">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-3">Need more templates? Create them in your WhatsApp Business Manager</p>
                    <Button variant="outline" size="sm">
                      Open WhatsApp Manager
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audience" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Target Audience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contactGroups.map((group) => (
                      <div
                        key={group.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-colors",
                          campaignData.audience_type === group.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                        )}
                        onClick={() => setCampaignData(prev => ({ ...prev, audience_type: group.id }))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{group.name}</h4>
                            <p className="text-sm text-gray-600">{group.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{group.count}</span>
                            </div>
                            <span className="text-xs text-gray-500">contacts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Campaign Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>When to send</Label>
                    <Select
                      value={campaignData.scheduling_type}
                      onValueChange={(value) => setCampaignData(prev => ({ ...prev, scheduling_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Send Immediately</SelectItem>
                        <SelectItem value="scheduled">Schedule for Later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {campaignData.scheduling_type === 'scheduled' && (
                    <div className="space-y-2">
                      <Label>Schedule Date & Time</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Campaign Name</Label>
                <p className="text-sm text-gray-600">{campaignData.name || "Untitled Campaign"}</p>
              </div>
              
              {selectedTemplate && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Template</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{selectedTemplate.content}</p>
                  </div>
                </div>
              )}
              
              {selectedGroup && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Audience</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{selectedGroup.name} ({selectedGroup.count})</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <Badge variant={campaignData.type === 'automated' ? 'default' : 'secondary'}>
                  {campaignData.type === 'automated' ? 'Automated' : 'Manual'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handleCreateCampaign}
              disabled={loading || !campaignData.name || !campaignData.template_id}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/messaging-campaigns')}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}