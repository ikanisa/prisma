import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  Edit, 
  Plus, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  MapPin, 
  Activity,
  Bot,
  Zap,
  Target,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Car,
  ShoppingCart,
  Calendar,
  Phone,
  Building,
  UserPlus,
  MessageCircle,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ComprehensiveUserJourney {
  id: string;
  journey_name: string;
  service_category: string;
  user_types: string[];
  flow_steps: JourneyStep[];
  success_criteria: Record<string, any>;
  ai_insights: {
    completion_rate: number;
    success_probability: number;
    optimization_suggestions: string[];
    risk_factors: string[];
    user_satisfaction: number;
    avg_completion_time: number;
  };
  is_active: boolean;
  last_updated: string;
  ai_generated: boolean;
  integration_points: string[];
  dependencies: string[];
}

interface JourneyStep {
  step_number: number;
  step_name: string;
  description: string;
  expected_input: string;
  ai_response_template: string;
  success_criteria: string[];
  fallback_actions: string[];
  estimated_time_seconds: number;
}

interface ServiceCategory {
  name: string;
  icon: React.ReactNode;
  description: string;
  journeys: string[];
}

export const ComprehensiveUserJourneySystem = () => {
  const [journeys, setJourneys] = useState<ComprehensiveUserJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedJourney, setSelectedJourney] = useState<ComprehensiveUserJourney | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newJourneyDialogOpen, setNewJourneyDialogOpen] = useState(false);
  const { toast } = useToast();

  const serviceCategories: ServiceCategory[] = [
    {
      name: "Payment Services",
      icon: <CreditCard className="h-5 w-5" />,
      description: "QR generation, bill payments, money transfers",
      journeys: ["payment_qr_generation", "bill_payment", "money_transfer", "payment_verification"]
    },
    {
      name: "Transportation",
      icon: <Car className="h-5 w-5" />,
      description: "Driver registration, ride booking, route optimization",
      journeys: ["driver_onboarding", "passenger_booking", "ride_matching", "trip_completion"]
    },
    {
      name: "Marketplace",
      icon: <ShoppingCart className="h-5 w-5" />,
      description: "Product discovery, vendor registration, order management",
      journeys: ["product_search", "vendor_onboarding", "order_placement", "inventory_management"]
    },
    {
      name: "Events",
      icon: <Calendar className="h-5 w-5" />,
      description: "Event discovery, ticket booking, organizer tools",
      journeys: ["event_discovery", "ticket_booking", "event_creation", "attendee_management"]
    },
    {
      name: "Customer Support",
      icon: <MessageCircle className="h-5 w-5" />,
      description: "Help requests, escalation, FAQ resolution",
      journeys: ["support_request", "issue_escalation", "faq_assistance", "feedback_collection"]
    },
    {
      name: "User Management",
      icon: <Users className="h-5 w-5" />,
      description: "Registration, profile management, preferences",
      journeys: ["user_onboarding", "profile_update", "preference_setting", "account_verification"]
    }
  ];

  const comprehensiveJourneyTemplates: ComprehensiveUserJourney[] = [
    {
      id: "payment_qr_generation",
      journey_name: "Payment QR Generation",
      service_category: "Payment Services",
      user_types: ["general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Amount Input Recognition",
          description: "AI detects payment amount in user message",
          expected_input: "Numeric amount (e.g., '5000', 'five thousand')",
          ai_response_template: "I'll generate a QR code for {amount} RWF. Please confirm the amount.",
          success_criteria: ["Amount correctly parsed", "User confirmation received"],
          fallback_actions: ["Request clarification", "Provide amount format examples"],
          estimated_time_seconds: 30
        },
        {
          step_number: 2,
          step_name: "QR Code Generation",
          description: "System generates USSD QR code image",
          expected_input: "User confirmation",
          ai_response_template: "Processing your QR code for {amount} RWF...",
          success_criteria: ["QR image generated successfully", "USSD code valid"],
          fallback_actions: ["Retry generation", "Escalate to support"],
          estimated_time_seconds: 15
        },
        {
          step_number: 3,
          step_name: "QR Delivery",
          description: "Send QR image to user via WhatsApp",
          expected_input: "Generated QR image",
          ai_response_template: "Here's your QR code for {amount} RWF. Scan with any banking app to pay.",
          success_criteria: ["Image sent successfully", "User acknowledgment"],
          fallback_actions: ["Resend image", "Provide USSD code as text"],
          estimated_time_seconds: 10
        }
      ],
      success_criteria: {
        completion_threshold: 0.95,
        satisfaction_target: 4.5,
        time_limit_seconds: 60
      },
      ai_insights: {
        completion_rate: 0.97,
        success_probability: 0.95,
        optimization_suggestions: ["Reduce QR generation time", "Add payment confirmation tracking"],
        risk_factors: ["Network connectivity issues", "Image delivery failures"],
        user_satisfaction: 4.7,
        avg_completion_time: 45
      },
      is_active: true,
      last_updated: new Date().toISOString(),
      ai_generated: false,
      integration_points: ["USSD Gateway", "WhatsApp Media API", "Payment Verification Service"],
      dependencies: ["User Authentication", "Amount Validation"]
    },
    {
      id: "driver_onboarding",
      journey_name: "Driver Registration & Onboarding",
      service_category: "Transportation",
      user_types: ["driver"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Registration Intent",
          description: "User expresses intent to become a driver",
          expected_input: "'driver on', 'register as driver', 'become driver'",
          ai_response_template: "Great! I'll help you register as a driver. First, I need your current location.",
          success_criteria: ["Intent recognized", "Location request sent"],
          fallback_actions: ["Clarify driver requirements", "Explain benefits"],
          estimated_time_seconds: 30
        },
        {
          step_number: 2,
          step_name: "Location Collection",
          description: "Collect and validate driver's location",
          expected_input: "WhatsApp location share",
          ai_response_template: "Location received! Now I need your vehicle details. What's your plate number?",
          success_criteria: ["Valid GPS coordinates", "Location stored"],
          fallback_actions: ["Request manual location entry", "Provide location sharing guide"],
          estimated_time_seconds: 60
        },
        {
          step_number: 3,
          step_name: "Vehicle Information",
          description: "Collect vehicle plate number and type",
          expected_input: "Vehicle plate number",
          ai_response_template: "Vehicle {plate} registered! You're now online and visible to passengers.",
          success_criteria: ["Plate format validated", "Vehicle profile created"],
          fallback_actions: ["Request correct format", "Manual verification"],
          estimated_time_seconds: 45
        },
        {
          step_number: 4,
          step_name: "Profile Activation",
          description: "Activate driver profile and set online status",
          expected_input: "System confirmation",
          ai_response_template: "Welcome! You'll receive notifications when passengers need rides nearby.",
          success_criteria: ["Profile active", "Location tracking enabled"],
          fallback_actions: ["Retry activation", "Manual profile setup"],
          estimated_time_seconds: 15
        }
      ],
      success_criteria: {
        completion_threshold: 0.85,
        satisfaction_target: 4.0,
        time_limit_seconds: 300
      },
      ai_insights: {
        completion_rate: 0.88,
        success_probability: 0.82,
        optimization_suggestions: ["Streamline vehicle verification", "Add photo capture"],
        risk_factors: ["Location permission issues", "Invalid plate numbers"],
        user_satisfaction: 4.2,
        avg_completion_time: 180
      },
      is_active: true,
      last_updated: new Date().toISOString(),
      ai_generated: false,
      integration_points: ["Location Services", "Vehicle Database", "Driver Management System"],
      dependencies: ["Location Permissions", "User Verification"]
    },
    {
      id: "product_search",
      journey_name: "Product Discovery & Vendor Matching",
      service_category: "Marketplace",
      user_types: ["buyer", "general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Product Query Processing",
          description: "AI understands product search intent",
          expected_input: "Product name or category (e.g., 'rice', 'medicine')",
          ai_response_template: "I'll help you find {product}. Let me search for vendors nearby.",
          success_criteria: ["Product identified", "Search initiated"],
          fallback_actions: ["Request clarification", "Suggest categories"],
          estimated_time_seconds: 20
        },
        {
          step_number: 2,
          step_name: "Location-Based Search",
          description: "Find vendors with product in user's area",
          expected_input: "User location (automatic or requested)",
          ai_response_template: "Found {count} vendors with {product} near you:",
          success_criteria: ["Location obtained", "Vendors found"],
          fallback_actions: ["Expand search radius", "Manual location entry"],
          estimated_time_seconds: 30
        },
        {
          step_number: 3,
          step_name: "Vendor Results Display",
          description: "Present vendor options with details",
          expected_input: "Vendor search results",
          ai_response_template: "Here are vendors selling {product}: [vendor list with contacts]",
          success_criteria: ["Results displayed", "Contact info provided"],
          fallback_actions: ["Show alternative products", "Suggest nearby areas"],
          estimated_time_seconds: 15
        },
        {
          step_number: 4,
          step_name: "Connection Facilitation",
          description: "Help user contact selected vendor",
          expected_input: "Vendor selection",
          ai_response_template: "Contact {vendor_name} at {phone} for {product}. Say easyMO sent you!",
          success_criteria: ["Vendor contact provided", "Connection facilitated"],
          fallback_actions: ["Provide alternative vendors", "Schedule callback"],
          estimated_time_seconds: 10
        }
      ],
      success_criteria: {
        completion_threshold: 0.90,
        satisfaction_target: 4.3,
        time_limit_seconds: 120
      },
      ai_insights: {
        completion_rate: 0.92,
        success_probability: 0.89,
        optimization_suggestions: ["Add price comparison", "Include vendor ratings"],
        risk_factors: ["Limited vendor database", "Outdated inventory"],
        user_satisfaction: 4.4,
        avg_completion_time: 75
      },
      is_active: true,
      last_updated: new Date().toISOString(),
      ai_generated: false,
      integration_points: ["Vendor Database", "Inventory Management", "Location Services"],
      dependencies: ["Vendor Registration", "Product Catalog"]
    }
  ];

  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      // For now, use comprehensive templates with AI enhancements
      const enhancedJourneys = await Promise.all(
        comprehensiveJourneyTemplates.map(async (journey) => {
          // Simulate AI analysis for each journey
          const aiEnhancement = await analyzeJourneyWithAI(journey);
          return {
            ...journey,
            ai_insights: {
              ...journey.ai_insights,
              ...aiEnhancement
            },
            last_updated: new Date().toISOString()
          };
        })
      );
      setJourneys(enhancedJourneys);
    } catch (error) {
      console.error('Error loading journeys:', error);
      toast({
        title: "Error",
        description: "Failed to load user journeys",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeJourneyWithAI = async (journey: ComprehensiveUserJourney) => {
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'analyze_journey',
          journey_id: journey.id,
          journey_data: journey,
          time_window_hours: 24
        }
      });

      if (error) throw error;

      return data.analysis || {};
    } catch (error) {
      console.error('AI analysis failed:', error);
      return {};
    }
  };

  const generateAIJourney = async (category: string) => {
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'generate_ai_journey',
          context: {
            service_category: category,
            existing_journeys: journeys.filter(j => j.service_category === category).length,
            user_feedback: 'optimize_for_completion_rate',
            business_requirements: 'whatsapp_first_approach'
          }
        }
      });

      if (error) throw error;

      if (data.success && data.journey) {
        const newJourney: ComprehensiveUserJourney = {
          id: `ai_journey_${Date.now()}`,
          journey_name: data.journey.name || `AI-Generated ${category} Journey`,
          service_category: category,
          user_types: data.journey.user_types || ['general'],
          flow_steps: data.journey.flow_steps || [],
          success_criteria: data.journey.success_criteria || {},
          ai_insights: data.journey.insights || {
            completion_rate: 0.85,
            success_probability: 0.9,
            optimization_suggestions: [],
            risk_factors: [],
            user_satisfaction: 4.0,
            avg_completion_time: 120
          },
          is_active: true,
          last_updated: new Date().toISOString(),
          ai_generated: true,
          integration_points: data.journey.integration_points || [],
          dependencies: data.journey.dependencies || []
        };

        setJourneys(prev => [...prev, newJourney]);
        toast({
          title: "AI Journey Generated",
          description: `New ${category} journey created with AI insights`
        });
      }
    } catch (error) {
      console.error('Error generating AI journey:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI journey",
        variant: "destructive"
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const updateAllJourneysWithAI = async () => {
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'update_from_interactions',
          time_window_hours: 24,
          learning_focus: 'comprehensive_optimization'
        }
      });

      if (error) throw error;

      if (data.success && data.journey_updates) {
        setJourneys(prev => prev.map(journey => {
          const update = data.journey_updates.find((u: any) => u.journey_name === journey.journey_name);
          return update ? { 
            ...journey, 
            ai_insights: { ...journey.ai_insights, ...update.ai_insights },
            last_updated: new Date().toISOString() 
          } : journey;
        }));

        toast({
          title: "Journeys Updated",
          description: `Updated ${data.journey_updates.length} journeys with AI insights`
        });
      }
    } catch (error) {
      console.error('Error updating journeys:', error);
      toast({
        title: "Error",
        description: "Failed to update journeys with AI",
        variant: "destructive"
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const filteredJourneys = selectedCategory === 'all' 
    ? journeys 
    : journeys.filter(j => j.service_category === selectedCategory);

  const getServiceIcon = (category: string) => {
    const service = serviceCategories.find(s => s.name === category);
    return service?.icon || <Activity className="h-4 w-4" />;
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with AI Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comprehensive User Journey System</h2>
          <p className="text-muted-foreground">AI-powered end-to-end user experience across all services</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={updateAllJourneysWithAI} 
            disabled={aiProcessing}
            variant="outline"
          >
            {aiProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            AI Update All
          </Button>
          <Dialog open={newJourneyDialogOpen} onOpenChange={setNewJourneyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Journey
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New User Journey</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select a service category to generate an AI-powered journey:</p>
                <div className="grid grid-cols-2 gap-3">
                  {serviceCategories.map((category) => (
                    <Button
                      key={category.name}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start space-y-2"
                      onClick={() => {
                        generateAIJourney(category.name);
                        setNewJourneyDialogOpen(false);
                      }}
                      disabled={aiProcessing}
                    >
                      <div className="flex items-center space-x-2">
                        {category.icon}
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground text-left">
                        {category.description}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Service Category Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Services ({journeys.length})
        </Button>
        {serviceCategories.map((category) => (
          <Button
            key={category.name}
            variant={selectedCategory === category.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.name)}
            className="flex items-center space-x-1"
          >
            {category.icon}
            <span>{category.name} ({journeys.filter(j => j.service_category === category.name).length})</span>
          </Button>
        ))}
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Completion Rate</p>
                <p className="text-2xl font-bold">
                  {(filteredJourneys.reduce((acc, j) => acc + j.ai_insights.completion_rate, 0) / filteredJourneys.length * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Success Probability</p>
                <p className="text-2xl font-bold">
                  {(filteredJourneys.reduce((acc, j) => acc + j.ai_insights.success_probability, 0) / filteredJourneys.length * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">User Satisfaction</p>
                <p className="text-2xl font-bold">
                  {(filteredJourneys.reduce((acc, j) => acc + j.ai_insights.user_satisfaction, 0) / filteredJourneys.length).toFixed(1)}/5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">AI Generated</p>
                <p className="text-2xl font-bold">{filteredJourneys.filter(j => j.ai_generated).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journey Cards */}
      <div className="space-y-4">
        {filteredJourneys.map((journey) => (
          <Card key={journey.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getServiceIcon(journey.service_category)}
                  <div>
                    <CardTitle className="text-lg">{journey.journey_name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{journey.service_category}</Badge>
                      {journey.ai_generated && (
                        <Badge variant="secondary" className="text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          AI Generated
                        </Badge>
                      )}
                      <Badge variant={journey.is_active ? 'default' : 'secondary'}>
                        {journey.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button size="sm" variant="ghost">
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Journey Metrics */}
              <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className={`text-lg font-semibold ${getSuccessColor(journey.ai_insights.completion_rate)}`}>
                    {(journey.ai_insights.completion_rate * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Completion</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${getSuccessColor(journey.ai_insights.success_probability)}`}>
                    {(journey.ai_insights.success_probability * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-600">
                    {journey.ai_insights.user_satisfaction.toFixed(1)}/5
                  </p>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-purple-600">
                    {journey.ai_insights.avg_completion_time}s
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                </div>
              </div>

              {/* Flow Steps Preview */}
              <div>
                <p className="text-sm font-medium mb-2">Journey Flow ({journey.flow_steps.length} steps)</p>
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  {journey.flow_steps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-2 flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {step.step_number}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        {step.step_name}
                      </div>
                      {index < journey.flow_steps.length - 1 && (
                        <div className="w-4 h-px bg-gray-300"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* User Types & Integration Points */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {journey.user_types.map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {journey.integration_points.length} integrations
                </div>
              </div>

              {/* AI Insights */}
              <div className="space-y-2">
                {journey.ai_insights.optimization_suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">AI Optimization Suggestions</p>
                    <div className="space-y-1">
                      {journey.ai_insights.optimization_suggestions.slice(0, 2).map((suggestion, index) => (
                        <div key={index} className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {journey.ai_insights.risk_factors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Risk Factors</p>
                    <div className="flex flex-wrap gap-1">
                      {journey.ai_insights.risk_factors.slice(0, 3).map((risk, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {risk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(journey.last_updated).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};