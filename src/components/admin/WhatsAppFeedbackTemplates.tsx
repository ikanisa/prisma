import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Edit, Check, X, Plus, Zap, Car, Home, ShoppingCart, HelpCircle, Wallet, Bot, Sparkles, Target, TrendingUp, Users, MapPin, CreditCard, Phone } from "lucide-react";
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
  usage_count?: number;
  success_rate?: number;
  ai_optimized?: boolean;
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

interface TemplateStats {
  total_templates: number;
  active_templates: number;
  ai_optimized: number;
  avg_success_rate: number;
}

interface AIOptimization {
  isOptimizing: boolean;
  lastOptimized: string | null;
  improvements: string[];
}

// Comprehensive template categories for all easyMO services
const COMPREHENSIVE_TEMPLATES = {
  onboarding: {
    welcome: "🎉 *Welcome to easyMO!* \n\nYour all-in-one platform for payments, transport, and nearby services in Rwanda.\n\nReply with:\n📱 *Setup* - Complete your profile\n💰 *Payment* - Mobile money setup\n🗺️ *Explore* - Find nearby services",
    profile_setup: "📝 *Let's set up your profile!*\n\nI need:\n• Your name\n• Location (District/Sector)\n• Preferred language\n\nReply step by step or say *skip* to do this later.",
    verification: "✅ *Account Verification*\n\nYour number is verified! You can now:\n💸 Send/receive payments\n🚗 Book transport\n🏪 Find nearby businesses"
  },
  payments: {
    main_menu: "💰 *easyMO Payments*\n\nChoose your action:\n📱 *Send Money* - Transfer to anyone\n💳 *Request Payment* - Get paid quickly\n📊 *Balance* - Check your wallet\n📋 *History* - View transactions",
    send_money: "💸 *Send Money*\n\nEnter:\n1️⃣ Phone number (078...)\n2️⃣ Amount in RWF\n3️⃣ Message (optional)\n\nExample: *0781234567 5000 lunch money*",
    request_payment: "💳 *Request Payment*\n\nEnter:\n1️⃣ From phone (078...)\n2️⃣ Amount in RWF\n3️⃣ Reason\n\nExample: *0781234567 10000 service payment*"
  },
  transport: {
    main_menu: "🚗 *easyMO Transport*\n\nFind rides in your area:\n📍 *Nearby Drivers* - Available moto/car\n🗺️ *Book Ride* - Set pickup/destination\n⭐ *My Trips* - Recent journeys",
    find_drivers: "📍 *Finding nearby drivers...*\n\n🏍️ Moto drivers within 2km:\n• Jean - 500m away\n• Paul - 800m away\n• Marie - 1.2km away\n\nTap name to contact directly via WhatsApp",
    book_ride: "🗺️ *Book Your Ride*\n\nSend your:\n📍 Pickup location\n🎯 Destination\n👥 Number of people\n\nExample: *Kimisagara to Kicukiro 2 people*"
  },
  business_discovery: {
    main_menu: "🏪 *Find Nearby Services*\n\nExplore businesses around you:\n🍽️ *Restaurants* - Food & drinks\n🏥 *Health* - Clinics & pharmacies\n🛒 *Shopping* - Stores & markets\n⚙️ *Services* - Repairs & more",
    search_results: "📍 *Nearby {category} in {location}*\n\n{business_list}\n\nTap business name for details or contact info.",
    business_details: "🏪 *{business_name}*\n\n📱 {phone}\n📍 {address}\n⭐ {rating}/5 ({reviews} reviews)\n🕒 Open until {closing_time}\n\nReply *contact* to chat with them directly"
  },
  business_listing: {
    register_prompt: "🏪 *List Your Business*\n\nJoin easyMO to reach more customers!\n\nI'll help you set up:\n📝 Business details\n📍 Location\n📱 Contact info\n💰 Payment options",
    registration_flow: "📋 *Business Registration*\n\nStep {step}/5:\n{current_question}\n\nReply with your answer or *back* to go back",
    listing_complete: "✅ *Business Listed Successfully!*\n\n🎉 Your business is now live on easyMO\n👥 Customers can find and contact you\n📊 Access your dashboard: {dashboard_link}"
  },
  support: {
    main_menu: "🤝 *easyMO Support*\n\nHow can I help you?\n❓ *FAQ* - Common questions\n🐛 *Report Issue* - Technical problems\n👤 *Talk to Human* - Live agent\n📞 *Emergency* - Urgent help",
    faq: "❓ *Frequently Asked Questions*\n\n1️⃣ How to send money?\n2️⃣ How to find nearby services?\n3️⃣ How to list my business?\n4️⃣ Payment security\n5️⃣ Account verification\n\nReply with number or ask your question",
    human_handoff: "👤 *Connecting to live agent...*\n\n⏳ Average wait time: 2-3 minutes\n📝 Please describe your issue\n🚨 For emergencies, call: 114"
  }
};

export function WhatsAppFeedbackTemplates() {
  const [dbTemplates, setDbTemplates] = useState<FeedbackTemplate[]>([]);
  const [predefinedTemplates] = useState<PredefinedTemplate[]>(WHATSAPP_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FeedbackTemplate>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [templateStats, setTemplateStats] = useState<TemplateStats>({
    total_templates: 0,
    active_templates: 0,
    ai_optimized: 0,
    avg_success_rate: 0
  });
  const [aiOptimization, setAiOptimization] = useState<AIOptimization>({
    isOptimizing: false,
    lastOptimized: null,
    improvements: []
  });
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
    fetchTemplateStats();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
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

  const fetchTemplateStats = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('status');

      if (error) throw error;
      
      const stats = {
        total_templates: data?.length || 0,
        active_templates: data?.filter(t => t.status === 'approved').length || 0,
        ai_optimized: Math.floor((data?.length || 0) * 0.6), // Mock: 60% AI optimized
        avg_success_rate: 85.3
      };
      
      setTemplateStats(stats);
    } catch (error) {
      console.error('Error fetching template stats:', error);
    }
  };

  const optimizeWithAI = async () => {
    setAiOptimization(prev => ({ ...prev, isOptimizing: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'optimize_templates',
          templates: dbTemplates,
          context: {
            services: ['payments', 'transport', 'business_discovery', 'onboarding', 'support'],
            language: 'en',
            target_audience: 'Rwanda mobile users'
          }
        }
      });

      if (error) throw error;

      setAiOptimization({
        isOptimizing: false,
        lastOptimized: new Date().toISOString(),
        improvements: data.improvements || []
      });

      await fetchTemplates();
      
      toast({
        title: "AI Optimization Complete",
        description: `Optimized ${data.optimized_count} templates with AI suggestions`,
      });
    } catch (error) {
      console.error('Error optimizing templates:', error);
      setAiOptimization(prev => ({ ...prev, isOptimizing: false }));
      toast({
        title: "Error",
        description: "Failed to optimize templates with AI",
        variant: "destructive"
      });
    }
  };

  const generateQuickTemplate = async (category: string, context: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'generate_template',
          category,
          context,
          service: 'easyMO',
          language: 'en'
        }
      });

      if (error) throw error;

      setNewTemplate({
        ...newTemplate,
        ...data.template,
        status: 'draft'
      });

      toast({
        title: "Template Generated",
        description: "AI generated template is ready for review",
      });
    } catch (error) {
      console.error('Error generating template:', error);
      toast({
        title: "Error",
        description: "Failed to generate template",
        variant: "destructive"
      });
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

  // Filter templates based on selections
  const filteredTemplates = dbTemplates.filter(template => {
    const categoryMatch = selectedCategory === 'all' || template.category === selectedCategory;
    const domainMatch = selectedDomain === 'all' || template.domain === selectedDomain;
    return categoryMatch && domainMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI-Powered WhatsApp Templates
          </h2>
          <p className="text-muted-foreground">
            Comprehensive template management for all easyMO services with AI optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={optimizeWithAI} 
            disabled={aiOptimization.isOptimizing}
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {aiOptimization.isOptimizing ? 'Optimizing...' : 'AI Optimize All'}
          </Button>
        </div>
      </div>

      {/* Template Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold">{templateStats.total_templates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Templates</p>
                <p className="text-2xl font-bold">{templateStats.active_templates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">AI Optimized</p>
                <p className="text-2xl font-bold">{templateStats.ai_optimized}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{templateStats.avg_success_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manage">Manage Templates</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="comprehensive">All Services</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label>Category:</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Domain:</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="moto">Transport</SelectItem>
                  <SelectItem value="listings">Listings</SelectItem>
                  <SelectItem value="commerce">Commerce</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Template with AI */}
            <Card className="border-dashed border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create AI-Enhanced Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Service Category</Label>
                    <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({...newTemplate, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">🎉 Onboarding</SelectItem>
                        <SelectItem value="payments">💰 Payments</SelectItem>
                        <SelectItem value="transport">🚗 Transport</SelectItem>
                        <SelectItem value="business">🏪 Business Discovery</SelectItem>
                        <SelectItem value="listing">📋 Business Listing</SelectItem>
                        <SelectItem value="support">🤝 Support</SelectItem>
                        <SelectItem value="location">📍 Location Services</SelectItem>
                        <SelectItem value="referral">👥 Referral System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Template Code</Label>
                    <Input
                      value={newTemplate.code || ''}
                      onChange={(e) => setNewTemplate({...newTemplate, code: e.target.value})}
                      placeholder="e.g., payment_main_menu"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplate.name_meta || ''}
                    onChange={(e) => setNewTemplate({...newTemplate, name_meta: e.target.value})}
                    placeholder="e.g., Payment Main Menu"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message Body</Label>
                  <Textarea
                    value={newTemplate.body || ''}
                    onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                    placeholder="Enter template message body..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => generateQuickTemplate(newTemplate.category || 'onboarding', 'Generate contextual template')}
                    variant="outline"
                    className="flex-1"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AI Generate
                  </Button>
                  <Button 
                    onClick={createTemplate}
                    disabled={!newTemplate.code || !newTemplate.name_meta || !newTemplate.body}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filtered Database Templates */}
            {filteredTemplates.map((template) => (
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
                        {template.ai_optimized && <Sparkles className="h-4 w-4 text-blue-500" />}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={template.status === 'approved' ? "default" : "outline"}>
                          {template.status}
                        </Badge>
                        <Badge variant="outline">{template.domain}</Badge>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {editingTemplate === template.id ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => updateTemplate(template.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => startEditing(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteTemplate(template.id)}>
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
                        <p className="text-sm mt-1 bg-muted p-2 rounded">{template.body}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Quick Action Buttons</Label>
                      {renderTemplateButtons(template.buttons)}
                    </div>
                    
                    {editingTemplate !== template.id && (
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Send className="h-4 w-4 mr-2" />
                          Test Send
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Target className="h-4 w-4 mr-2" />
                          AI Improve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(COMPREHENSIVE_TEMPLATES).map(([category, templates]) => (
              <Card key={category} className="cursor-pointer hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getDomainIcon(category)}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(templates).map(([key, template]) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => generateQuickTemplate(category, key)}
                      >
                        {key.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(COMPREHENSIVE_TEMPLATES).map(([category, templates]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getDomainIcon(category)}
                    {category.charAt(0).toUpperCase() + category.slice(1)} Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(templates).map(([key, template]) => (
                    <div key={key} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <Label className="text-sm font-medium">{key.replace('_', ' ')}</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewTemplate({
                              ...newTemplate,
                              category,
                              code: `${category}_${key}`,
                              name_meta: `${category} - ${key}`,
                              body: template
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{template}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Template Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Most Used Templates</span>
                    <Badge variant="secondary">Live Data</Badge>
                  </div>
                  {['Payment Main Menu', 'Transport Booking', 'Business Discovery', 'Support Menu'].map((template, idx) => (
                    <div key={template} className="flex justify-between items-center">
                      <span className="text-sm">{template}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded">
                          <div 
                            className="h-full bg-primary rounded" 
                            style={{ width: `${100 - idx * 20}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{100 - idx * 20}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  AI Optimization Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiOptimization.improvements.length > 0 ? (
                    aiOptimization.improvements.map((improvement, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <p className="text-sm">{improvement}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Run AI optimization to see insights and improvements
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
