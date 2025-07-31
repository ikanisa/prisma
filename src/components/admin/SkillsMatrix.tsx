import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, Settings, Zap, Activity, CheckCircle, XCircle, Plus, 
  Brain, RefreshCw, CreditCard, Car, Building, Users, Phone, MapPin,
  MessageCircle, Calendar, Search, Shield, Star, TrendingUp, Globe,
  Smartphone, Database, Bot, Cpu, Network, Lock, Eye, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AgentSkill {
  agent_id: string;
  skill: string;
  enabled: boolean;
  updated_at: string;
  config?: any;
  proficiency_level?: number;
  usage_frequency?: number;
  last_used?: string;
  ai_optimized?: boolean;
}

interface SkillTemplate {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  required_tools: string[];
  default_config: any;
  industry_context: string[];
  ai_learning_enabled: boolean;
  performance_metrics: string[];
  icon: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_impact: number; // 1-10 scale
}

const COMPREHENSIVE_SKILL_TEMPLATES: SkillTemplate[] = [
  // PAYMENT & FINANCIAL SERVICES
  {
    name: "MoMoPaymentSkill",
    description: "Advanced MoMo payment processing, QR generation, transaction verification",
    category: "Financial Services",
    subcategory: "Payment Processing",
    required_tools: ["generatePaymentQR", "processPayment", "verifyTransaction", "handlePaymentCallback"],
    default_config: { 
      max_amount: 2000000, 
      currency: "RWF", 
      auto_verify: true,
      fraud_detection: true,
      retry_attempts: 3
    },
    industry_context: ["Banking", "Retail", "Services", "Transportation", "Food & Beverage"],
    ai_learning_enabled: true,
    performance_metrics: ["success_rate", "processing_time", "fraud_detection_accuracy"],
    icon: CreditCard,
    priority: 'critical',
    estimated_impact: 10
  },
  {
    name: "BillPaymentSkill",
    description: "Utility bill payments, service payments, subscription management",
    category: "Financial Services", 
    subcategory: "Bill Management",
    required_tools: ["processUtilityPayment", "validateBillAccount", "scheduleRecurringPayment"],
    default_config: { 
      supported_utilities: ["RURA", "Eucl", "EDCL", "RECO"], 
      max_bill_amount: 500000,
      auto_schedule: false
    },
    industry_context: ["Utilities", "Telecom", "Government Services", "Insurance"],
    ai_learning_enabled: true,
    performance_metrics: ["payment_success_rate", "bill_verification_accuracy"],
    icon: FileText,
    priority: 'high',
    estimated_impact: 8
  },

  // TRANSPORTATION & MOBILITY
  {
    name: "DriverMatchingSkill",
    description: "Intelligent driver-passenger matching, route optimization, demand prediction",
    category: "Transportation",
    subcategory: "Ride Matching",
    required_tools: ["findNearbyDrivers", "calculateOptimalRoute", "predictDemand", "manageDriverStatus"],
    default_config: { 
      search_radius: 5, 
      max_drivers_shown: 10, 
      route_optimization: true,
      real_time_tracking: true,
      price_estimation: true
    },
    industry_context: ["Transportation", "Logistics", "Delivery Services", "Emergency Services"],
    ai_learning_enabled: true,
    performance_metrics: ["match_success_rate", "average_wait_time", "driver_utilization"],
    icon: Car,
    priority: 'critical',
    estimated_impact: 9
  },
  {
    name: "RideCoordinationSkill",
    description: "Real-time ride coordination, status updates, communication facilitation",
    category: "Transportation",
    subcategory: "Ride Management",
    required_tools: ["trackRideStatus", "facilitateDriverPassengerComm", "handleRideIssues"],
    default_config: {
      auto_status_updates: true,
      emergency_protocols: true,
      rating_system: true
    },
    industry_context: ["Transportation", "Delivery", "Field Services"],
    ai_learning_enabled: true,
    performance_metrics: ["ride_completion_rate", "user_satisfaction", "issue_resolution_time"],
    icon: MapPin,
    priority: 'high',
    estimated_impact: 8
  },

  // BUSINESS DISCOVERY & DIRECTORY SERVICES
  {
    name: "BusinessDiscoverySkill",
    description: "Intelligent business search, recommendation engine, location-based services",
    category: "Business Services",
    subcategory: "Discovery & Search",
    required_tools: ["searchBusinesses", "recommendServices", "filterByLocation", "analyzeBusinessReviews"],
    default_config: {
      search_radius: 10,
      max_results: 20,
      recommendation_algorithm: "collaborative_filtering",
      include_ratings: true,
      real_time_availability: true
    },
    industry_context: ["Retail", "Food & Beverage", "Healthcare", "Professional Services", "Entertainment"],
    ai_learning_enabled: true,
    performance_metrics: ["search_relevance", "user_engagement", "conversion_rate"],
    icon: Search,
    priority: 'critical',
    estimated_impact: 9
  },
  {
    name: "BusinessListingSkill",
    description: "Business registration, profile management, verification processes",
    category: "Business Services",
    subcategory: "Listing Management",
    required_tools: ["registerBusiness", "verifyBusinessInfo", "manageListing", "handleBusinessUpdates"],
    default_config: {
      auto_verification: false,
      required_documents: ["business_license", "tax_certificate"],
      approval_workflow: true
    },
    industry_context: ["All Business Categories", "Government Services", "Compliance"],
    ai_learning_enabled: true,
    performance_metrics: ["listing_quality", "verification_accuracy", "update_frequency"],
    icon: Building,
    priority: 'high',
    estimated_impact: 8
  },

  // USER MANAGEMENT & ONBOARDING
  {
    name: "UserOnboardingSkill",
    description: "Intelligent user onboarding, profile setup, preference learning",
    category: "User Management",
    subcategory: "Onboarding",
    required_tools: ["createUserProfile", "detectLanguagePreference", "personalizeExperience", "trackOnboardingProgress"],
    default_config: {
      multi_language_support: true,
      personalization_enabled: true,
      progress_tracking: true,
      cultural_adaptation: true
    },
    industry_context: ["Technology", "Services", "E-commerce", "Education"],
    ai_learning_enabled: true,
    performance_metrics: ["onboarding_completion_rate", "time_to_value", "user_retention"],
    icon: Users,
    priority: 'critical',
    estimated_impact: 9
  },
  {
    name: "UserAuthenticationSkill",
    description: "Secure user authentication, phone verification, fraud prevention",
    category: "User Management",
    subcategory: "Security & Authentication",
    required_tools: ["verifyPhoneNumber", "detectFraudulentActivity", "manageUserSessions", "handleSecurityIncidents"],
    default_config: {
      two_factor_auth: true,
      fraud_detection: true,
      session_timeout: 3600,
      max_login_attempts: 5
    },
    industry_context: ["Financial Services", "Healthcare", "Government", "E-commerce"],
    ai_learning_enabled: true,
    performance_metrics: ["auth_success_rate", "fraud_detection_accuracy", "security_score"],
    icon: Lock,
    priority: 'critical',
    estimated_impact: 10
  },

  // COMMUNICATION & CONNECTION FACILITATION
  {
    name: "ConnectionFacilitationSkill",
    description: "Intelligent connection matching, introduction facilitation, relationship management",
    category: "Communication",
    subcategory: "Connection Management",
    required_tools: ["facilitateIntroduction", "manageConnectionStatus", "trackInteractionQuality", "optimizeMatching"],
    default_config: {
      smart_matching: true,
      privacy_protection: true,
      interaction_tracking: true,
      success_analytics: true
    },
    industry_context: ["Professional Services", "Networking", "Dating", "Business Development"],
    ai_learning_enabled: true,
    performance_metrics: ["connection_success_rate", "user_satisfaction", "relationship_quality"],
    icon: Phone,
    priority: 'high',
    estimated_impact: 8
  },
  {
    name: "ConversationSkill",
    description: "Advanced conversational AI, context awareness, multi-turn dialogue management",
    category: "Communication",
    subcategory: "Conversation Management",
    required_tools: ["maintainContext", "generateResponses", "detectIntent", "manageConversationFlow"],
    default_config: {
      max_context_length: 8000,
      context_retention: true,
      intent_confidence_threshold: 0.8,
      response_personalization: true
    },
    industry_context: ["Customer Service", "Sales", "Support", "Education", "Healthcare"],
    ai_learning_enabled: true,
    performance_metrics: ["conversation_quality", "intent_accuracy", "user_engagement"],
    icon: MessageCircle,
    priority: 'critical',
    estimated_impact: 10
  },

  // LOCATION & GEOSPATIAL SERVICES
  {
    name: "LocationIntelligenceSkill",
    description: "Advanced location services, geospatial analysis, proximity matching",
    category: "Location Services",
    subcategory: "Geospatial Intelligence",
    required_tools: ["processLocationData", "calculateProximity", "analyzeLocationPatterns", "optimizeRoutes"],
    default_config: {
      gps_accuracy: "high",
      privacy_protection: true,
      caching_enabled: true,
      real_time_updates: true
    },
    industry_context: ["Transportation", "Delivery", "Real Estate", "Tourism", "Emergency Services"],
    ai_learning_enabled: true,
    performance_metrics: ["location_accuracy", "query_response_time", "privacy_compliance"],
    icon: MapPin,
    priority: 'critical',
    estimated_impact: 9
  },

  // SUPPORT & HELP SERVICES
  {
    name: "IntelligentSupportSkill",
    description: "AI-powered customer support, issue resolution, escalation management",
    category: "Support Services",
    subcategory: "Customer Support",
    required_tools: ["categorizeIssues", "provideResolutions", "escalateToHuman", "trackSatisfaction"],
    default_config: {
      auto_categorization: true,
      resolution_database: true,
      escalation_rules: true,
      satisfaction_tracking: true
    },
    industry_context: ["Customer Service", "Technical Support", "Healthcare", "Education"],
    ai_learning_enabled: true,
    performance_metrics: ["resolution_rate", "first_contact_resolution", "user_satisfaction"],
    icon: MessageCircle,
    priority: 'high',
    estimated_impact: 8
  },

  // REFERRAL & LOYALTY SYSTEMS
  {
    name: "ReferralOptimizationSkill",
    description: "Smart referral program management, reward optimization, viral growth tactics",
    category: "Marketing & Growth",
    subcategory: "Referral Management",
    required_tools: ["trackReferrals", "calculateRewards", "optimizeIncentives", "analyzeGrowthPatterns"],
    default_config: {
      reward_tiers: true,
      fraud_detection: true,
      viral_coefficient_tracking: true,
      personalized_incentives: true
    },
    industry_context: ["Marketing", "E-commerce", "Financial Services", "Technology"],
    ai_learning_enabled: true,
    performance_metrics: ["referral_conversion_rate", "viral_coefficient", "customer_acquisition_cost"],
    icon: Star,
    priority: 'medium',
    estimated_impact: 7
  },

  // EVENT & COMMUNITY SERVICES
  {
    name: "EventIntelligenceSkill",
    description: "Event discovery, recommendation, community engagement, local insights",
    category: "Community Services",
    subcategory: "Event Management",
    required_tools: ["discoverEvents", "recommendActivities", "manageRSVPs", "analyzeAttendance"],
    default_config: {
      personal_recommendations: true,
      location_based_filtering: true,
      social_integration: true,
      attendance_tracking: true
    },
    industry_context: ["Entertainment", "Community", "Education", "Sports", "Culture"],
    ai_learning_enabled: true,
    performance_metrics: ["recommendation_accuracy", "user_engagement", "event_attendance"],
    icon: Calendar,
    priority: 'medium',
    estimated_impact: 6
  },

  // MEMORY & INTELLIGENCE SYSTEMS
  {
    name: "ContextualMemorySkill",
    description: "Advanced memory management, context retention, learning optimization",
    category: "AI Intelligence",
    subcategory: "Memory Management",
    required_tools: ["storeContext", "retrieveRelevantMemory", "updateUserPreferences", "optimizeRetention"],
    default_config: {
      memory_retention_days: 365,
      context_similarity_threshold: 0.75,
      auto_memory_cleanup: true,
      privacy_compliant: true
    },
    industry_context: ["AI/ML", "Personalization", "Analytics", "User Experience"],
    ai_learning_enabled: true,
    performance_metrics: ["memory_accuracy", "retrieval_speed", "context_relevance"],
    icon: Brain,
    priority: 'critical',
    estimated_impact: 9
  },

  // ANALYTICS & INSIGHTS
  {
    name: "BehavioralAnalyticsSkill",
    description: "User behavior analysis, pattern recognition, predictive insights",
    category: "Analytics & Intelligence",
    subcategory: "Behavioral Analysis",
    required_tools: ["analyzeUserBehavior", "predictUserNeeds", "generateInsights", "trackPerformance"],
    default_config: {
      real_time_analysis: true,
      predictive_modeling: true,
      privacy_compliant: true,
      insight_generation: true
    },
    industry_context: ["Analytics", "Marketing", "Product Development", "User Experience"],
    ai_learning_enabled: true,
    performance_metrics: ["prediction_accuracy", "insight_quality", "business_impact"],
    icon: TrendingUp,
    priority: 'high',
    estimated_impact: 8
  },

  // SECURITY & FRAUD PREVENTION
  {
    name: "SecurityMonitoringSkill",
    description: "Real-time security monitoring, fraud detection, threat prevention",
    category: "Security & Compliance",
    subcategory: "Security Monitoring",
    required_tools: ["monitorSuspiciousActivity", "detectFraud", "preventThreats", "generateSecurityReports"],
    default_config: {
      real_time_monitoring: true,
      ml_fraud_detection: true,
      automatic_blocking: false,
      incident_reporting: true
    },
    industry_context: ["Financial Services", "Security", "Compliance", "Risk Management"],
    ai_learning_enabled: true,
    performance_metrics: ["threat_detection_rate", "false_positive_rate", "response_time"],
    icon: Shield,
    priority: 'critical',
    estimated_impact: 10
  },

  // CONTENT & COMMUNICATION
  {
    name: "ContentOptimizationSkill", 
    description: "Dynamic content generation, message optimization, cultural adaptation",
    category: "Content & Communication",
    subcategory: "Content Management",
    required_tools: ["generateContent", "optimizeMessages", "adaptCulturally", "personalizeContent"],
    default_config: {
      multi_language_support: true,
      cultural_adaptation: true,
      tone_personalization: true,
      content_a_b_testing: true
    },
    industry_context: ["Marketing", "Communication", "Localization", "User Experience"],
    ai_learning_enabled: true,
    performance_metrics: ["engagement_rate", "content_effectiveness", "cultural_appropriateness"],
    icon: Globe,
    priority: 'high',
    estimated_impact: 7
  },

  // INTEGRATION & API MANAGEMENT
  {
    name: "ExternalIntegrationSkill",
    description: "Third-party API management, system integration, data synchronization",
    category: "Technical Infrastructure",
    subcategory: "System Integration",
    required_tools: ["manageAPIConnections", "synchronizeData", "handleIntegrationErrors", "monitorAPIHealth"],
    default_config: {
      auto_retry: true,
      circuit_breaker: true,
      health_monitoring: true,
      error_handling: "graceful"
    },
    industry_context: ["Technology", "Enterprise Software", "Data Management", "System Integration"],
    ai_learning_enabled: true,
    performance_metrics: ["integration_uptime", "data_sync_accuracy", "error_rate"],
    icon: Network,
    priority: 'high',
    estimated_impact: 8
  }
];

export function SkillsMatrix() {
  const [agentSkills, setAgentSkills] = useState<AgentSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [configDialogSkill, setConfigDialogSkill] = useState<string | null>(null);
  const [skillConfig, setSkillConfig] = useState<any>({});
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAgentSkills();
  }, []);

  const fetchAgentSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_skills')
        .select('*')
        .order('skill');

      if (error) throw error;
      setAgentSkills(data || []);
    } catch (error) {
      console.error('Error fetching agent skills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent skills",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const optimizeSkillsWithAI = async () => {
    setAiOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'optimize_skills',
          current_skills: agentSkills,
          skill_templates: COMPREHENSIVE_SKILL_TEMPLATES,
          optimization_focus: 'performance_and_user_satisfaction'
        }
      });

      if (error) throw error;

      if (data.success && data.optimized_skills) {
        // Update skills based on AI recommendations
        for (const skillUpdate of data.optimized_skills) {
          await toggleSkill(skillUpdate.skill_name, skillUpdate.recommended_enabled);
          if (skillUpdate.optimized_config) {
            await updateSkillConfig(skillUpdate.skill_name, skillUpdate.optimized_config);
          }
        }

        toast({
          title: "AI Optimization Complete",
          description: `Optimized ${data.optimized_skills.length} skills based on usage patterns and performance data`
        });
      }
    } catch (error) {
      console.error('Error optimizing skills with AI:', error);
      toast({
        title: "Error",
        description: "Failed to optimize skills with AI",
        variant: "destructive"
      });
    } finally {
      setAiOptimizing(false);
    }
  };

  const addCustomSkill = async (skillName: string, description: string, category: string) => {
    try {
      const agentId = agentSkills[0]?.agent_id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('agent_skills')
        .insert({
          agent_id: agentId,
          skill: skillName,
          enabled: true,
          config: { 
            description, 
            category, 
            custom_skill: true,
            created_at: new Date().toISOString()
          }
        });

      if (error) throw error;

      await fetchAgentSkills();
      toast({
        title: "Success",
        description: `Custom skill "${skillName}" added successfully`
      });
    } catch (error) {
      console.error('Error adding custom skill:', error);
      toast({
        title: "Error",
        description: "Failed to add custom skill",
        variant: "destructive"
      });
    }
  };

  const toggleSkill = async (skillName: string, enabled: boolean) => {
    setUpdating(skillName);
    try {
      const agentId = agentSkills[0]?.agent_id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('agent_skills')
        .upsert({
          agent_id: agentId,
          skill: skillName,
          enabled: enabled,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await fetchAgentSkills();
      
      toast({
        title: "Success",
        description: `${skillName} ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling skill:', error);
      toast({
        title: "Error",
        description: "Failed to update skill",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const updateSkillConfig = async (skillName: string, config: any) => {
    try {
      const agentId = agentSkills[0]?.agent_id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('agent_skills')
        .upsert({
          agent_id: agentId,
          skill: skillName,
          enabled: true,
          config: config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await fetchAgentSkills();
      setConfigDialogSkill(null);
      
      toast({
        title: "Success",
        description: `${skillName} configuration updated`,
      });
    } catch (error) {
      console.error('Error updating skill config:', error);
      toast({
        title: "Error",
        description: "Failed to update skill configuration",
        variant: "destructive"
      });
    }
  };

  const getSkillStatus = (skillName: string) => {
    const skill = agentSkills.find(s => s.skill === skillName);
    return skill?.enabled || false;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Financial Services': 'hsl(var(--success))',
      'Transportation': 'hsl(var(--primary))', 
      'Business Services': 'hsl(var(--warning))',
      'User Management': 'hsl(var(--info))',
      'Communication': 'hsl(var(--accent))',
      'Location Services': 'hsl(var(--secondary))',
      'Support Services': 'hsl(var(--muted))',
      'Marketing & Growth': 'hsl(var(--destructive))',
      'Community Services': 'hsl(var(--chart-1))',
      'AI Intelligence': 'hsl(var(--chart-2))',
      'Analytics & Intelligence': 'hsl(var(--chart-3))',
      'Security & Compliance': 'hsl(var(--chart-4))',
      'Content & Communication': 'hsl(var(--chart-5))',
      'Technical Infrastructure': 'hsl(var(--border))'
    };
    return colors[category as keyof typeof colors] || 'hsl(var(--muted))';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'critical': 'hsl(var(--destructive))',
      'high': 'hsl(var(--warning))',
      'medium': 'hsl(var(--primary))',
      'low': 'hsl(var(--muted))'
    };
    return colors[priority as keyof typeof colors] || 'hsl(var(--muted))';
  };

  const filteredSkills = COMPREHENSIVE_SKILL_TEMPLATES.filter(template => {
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || template.priority === priorityFilter;
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subcategory.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesPriority && matchesSearch;
  });

  const categories = [...new Set(COMPREHENSIVE_SKILL_TEMPLATES.map(t => t.category))];
  const priorities = ['critical', 'high', 'medium', 'low'];

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

  const enabledSkills = COMPREHENSIVE_SKILL_TEMPLATES.filter(template => 
    getSkillStatus(template.name)
  ).length;

  const totalImpactScore = COMPREHENSIVE_SKILL_TEMPLATES
    .filter(template => getSkillStatus(template.name))
    .reduce((sum, template) => sum + template.estimated_impact, 0);

  const maxPossibleImpact = COMPREHENSIVE_SKILL_TEMPLATES
    .reduce((sum, template) => sum + template.estimated_impact, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">Comprehensive Skills Matrix</h2>
          <p className="text-muted-foreground mt-1">
            AI-powered skill management for easyMO omni-agent across all services and industries
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="text-sm">
            {enabledSkills}/{COMPREHENSIVE_SKILL_TEMPLATES.length} Skills Active
          </Badge>
          <Badge variant="outline" className="text-sm">
            Impact Score: {totalImpactScore}/{maxPossibleImpact}
          </Badge>
          <Progress value={(enabledSkills / COMPREHENSIVE_SKILL_TEMPLATES.length) * 100} className="w-32" />
        </div>
      </div>

      {/* AI Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Skills Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Let AI analyze usage patterns and optimize skill configuration for maximum performance
            </p>
            <p className="text-xs text-muted-foreground">
              Based on user interactions, industry trends, and performance metrics
            </p>
          </div>
          <Button 
            onClick={optimizeSkillsWithAI} 
            disabled={aiOptimizing}
            className="gap-2"
          >
            {aiOptimizing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {aiOptimizing ? 'Optimizing...' : 'AI Optimize Skills'}
          </Button>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Search skills by name, description, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {priorities.map(priority => (
              <SelectItem key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkills.map((template) => {
          const isEnabled = getSkillStatus(template.name);
          const isUpdating = updating === template.name;
          const IconComponent = template.icon;
          
          return (
            <Card key={template.name} className={`transition-all ${
              isEnabled ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:shadow-md'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      {isEnabled ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      {template.name}
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: getCategoryColor(template.category) }}
                        className="text-xs"
                      >
                        {template.category}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: getPriorityColor(template.priority) }}
                        className="text-xs"
                      >
                        {template.priority}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Impact: {template.estimated_impact}/10
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => toggleSkill(template.name, checked)}
                    disabled={isUpdating}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Subcategory: {template.subcategory}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Industry Context
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {template.industry_context.slice(0, 3).map((context) => (
                      <Badge key={context} variant="secondary" className="text-xs">
                        {context}
                      </Badge>
                    ))}
                    {template.industry_context.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.industry_context.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Required Tools ({template.required_tools.length})
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {template.required_tools.slice(0, 2).map((tool) => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                    {template.required_tools.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.required_tools.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>

                {template.ai_learning_enabled && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="h-3 w-3" />
                    AI Learning Enabled
                  </div>
                )}

                {isEnabled && (
                  <div className="pt-2 border-t space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfigDialogSkill(template.name);
                        setSkillConfig(template.default_config);
                      }}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      {configDialogSkill && (
        <Dialog open={!!configDialogSkill} onOpenChange={() => setConfigDialogSkill(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure {configDialogSkill}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {Object.entries(skillConfig).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  {typeof value === 'boolean' ? (
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setSkillConfig(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  ) : typeof value === 'number' ? (
                    <Input
                      id={key}
                      type="number"
                      value={value}
                      onChange={(e) =>
                        setSkillConfig(prev => ({ ...prev, [key]: parseInt(e.target.value) }))
                      }
                    />
                  ) : Array.isArray(value) ? (
                    <Textarea
                      id={key}
                      value={value.join(', ')}
                      onChange={(e) =>
                        setSkillConfig(prev => ({ 
                          ...prev, 
                          [key]: e.target.value.split(',').map(item => item.trim())
                        }))
                      }
                      placeholder="Comma-separated values"
                    />
                  ) : (
                    <Input
                      id={key}
                      value={String(value)}
                      onChange={(e) =>
                        setSkillConfig(prev => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setConfigDialogSkill(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateSkillConfig(configDialogSkill, skillConfig)}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Results Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing {filteredSkills.length} of {COMPREHENSIVE_SKILL_TEMPLATES.length} comprehensive skills
              </p>
              <p className="text-xs text-muted-foreground">
                Covering all easyMO services, industries, and AI-powered optimization
              </p>
            </div>
            <Badge variant="outline">
              Total System Impact: {Math.round((totalImpactScore / maxPossibleImpact) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}