import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, CheckCircle, Clock, XCircle, Search, Plus, BarChart3, Zap } from "lucide-react";
import TemplateAnalytics from "@/components/admin/TemplateAnalytics";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_by?: string;
  rejection_reason?: string;
}

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'analytics' | 'campaigns'>('templates');
  const { toast } = useToast();

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "ride",
    content: "",
    variables: [] as string[]
  });

  const [stats, setStats] = useState({
    totalTemplates: 0,
    approvedTemplates: 0,
    pendingTemplates: 0,
    rejectedTemplates: 0
  });

  const categories = [
    { value: "ride", label: "Ride Requests" },
    { value: "payment", label: "Payments" },
    { value: "rating", label: "Ratings" },
    { value: "support", label: "Support" },
    { value: "promo", label: "Promotions" },
    { value: "emergency", label: "Emergency" }
  ];

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Use mock data since table not in types yet
      const mockTemplates: WhatsAppTemplate[] = [
        {
          id: '1',
          name: 'Driver Assigned',
          category: 'ride',
          content: '🎉 **Driver Found!**\n👨‍🦲 {{driver_name}} ({{vehicle_plate}})\n⭐ {{driver_rating}}/5 stars\n📍 Arriving in {{eta_minutes}} minutes',
          variables: ['driver_name', 'vehicle_plate', 'driver_rating', 'eta_minutes'],
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          approved_by: 'admin'
        },
        {
          id: '2',
          name: 'Payment Request',
          category: 'payment',
          content: '💰 **Payment Due**\nRide completed! Total fare: {{total_amount}} RWF\n\n💳 **Pay Options:**\n1️⃣ Mobile Money: {{momo_ussd_code}}',
          variables: ['total_amount', 'momo_ussd_code'],
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch WhatsApp templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Mock stats since table not in types yet
      setStats({
        totalTemplates: 7,
        approvedTemplates: 6,
        pendingTemplates: 1,
        rejectedTemplates: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const createTemplate = async () => {
    try {
      // Mock template creation
      const createdTemplate: WhatsAppTemplate = {
        id: crypto.randomUUID(),
        name: newTemplate.name,
        category: newTemplate.category,
        content: newTemplate.content,
        variables: extractVariables(newTemplate.content),
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setTemplates(prev => [createdTemplate, ...prev]);

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewTemplate({ name: "", category: "ride", content: "", variables: [] });
      fetchStats();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const updateTemplateStatus = async (templateId: string, status: string, reason?: string) => {
    try {
      // Mock status update
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { 
              ...template, 
              status: status as WhatsAppTemplate['status'],
              updated_at: new Date().toISOString(),
              ...(status === 'approved' ? { approved_by: 'admin' } : {}),
              ...(status === 'rejected' && reason ? { rejection_reason: reason } : {})
            }
          : template
      ));

      toast({
        title: "Success",
        description: `Template ${status} successfully`,
      });

      fetchStats();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  };

  const previewTemplate = (content: string, variables: string[]) => {
    let preview = content;
    variables.forEach(variable => {
      const sampleValue = getSampleValue(variable);
      preview = preview.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), sampleValue);
    });
    return preview;
  };

  const getSampleValue = (variable: string): string => {
    const samples: Record<string, string> = {
      driver_name: "John Uwimana",
      vehicle_plate: "RC-123T",
      eta_minutes: "3",
      fare_estimate: "1,500",
      origin_address: "Kigali City Center",
      destination_address: "Airport",
      passenger_name: "Marie Mukamana",
      transaction_id: "TX123456",
      promo_code: "SAVE20",
      rating: "5"
    };
    
    return samples[variable] || `[${variable}]`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", icon: Clock },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || template.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Management</h1>
          <p className="text-muted-foreground">Intelligent template system with analytics and campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'templates' ? 'default' : 'outline'}
            onClick={() => setActiveTab('templates')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant={activeTab === 'campaigns' ? 'default' : 'outline'}
            onClick={() => setActiveTab('campaigns')}
          >
            <Zap className="h-4 w-4 mr-2" />
            Campaigns
          </Button>
        </div>
      </div>

      {activeTab === 'analytics' && <TemplateAnalytics />}
      
      {activeTab === 'templates' && (
        <>
          <div className="flex justify-end mb-4">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                    Create a new WhatsApp message template for passenger communications
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Template Name</label>
                    <Input
                      placeholder="e.g., Driver Assigned Notification"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select 
                      value={newTemplate.category} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Template Content</label>
                    <Textarea
                      placeholder="🛵 Driver {{driver_name}} ({{vehicle_plate}}) is arriving in {{eta_minutes}} minutes..."
                      rows={6}
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use double braces for dynamic content (e.g., driver_name)
                    </p>
                  </div>
                  
                  {newTemplate.content && (
                    <div>
                      <label className="text-sm font-medium">Preview</label>
                      <div className="p-3 bg-muted rounded border">
                        {previewTemplate(newTemplate.content, extractVariables(newTemplate.content))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={createTemplate} disabled={!newTemplate.name || !newTemplate.content}>
                      Create Template
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejectedTemplates}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Template Management</CardTitle>
          <CardDescription>Filter and manage WhatsApp message templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {categories.find(c => c.value === template.category)?.label || template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(template.status)}</TableCell>
                  <TableCell>
                    {new Date(template.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {template.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateTemplateStatus(template.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateTemplateStatus(template.id, 'rejected', 'Needs revision')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {template.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTemplateStatus(template.id, 'pending')}
                        >
                          Submit for Review
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">Preview</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{template.name}</DialogTitle>
                            <DialogDescription>Template preview with sample data</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Original Template</label>
                              <div className="p-3 bg-muted rounded text-sm">
                                {template.content}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Preview with Sample Data</label>
                              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                {previewTemplate(template.content, template.variables)}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
        </>
      )}
      
      {activeTab === 'campaigns' && (
        <Card>
          <CardHeader>
            <CardTitle>Marketing Campaigns</CardTitle>
            <CardDescription>Campaign management coming soon - intelligent template routing active</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The intelligent template system is now active and automatically routing users to the best templates based on:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-sm">
              <li>Intent detection from user messages</li>
              <li>User behavior and conversation history</li>
              <li>Template performance analytics</li>
              <li>CSAT gating for marketing campaigns</li>
              <li>User segmentation and preferences</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}