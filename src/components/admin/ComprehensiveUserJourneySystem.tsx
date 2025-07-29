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
      description: "QR code generation, payment requests, MoMo integration",
      journeys: ["payment_qr_generation", "payment_request_creation", "bill_payment_assistance", "payment_verification"]
    },
    {
      name: "Transportation Discovery",
      icon: <Car className="h-5 w-5" />,
      description: "Driver/passenger connection, ride matching, location sharing",
      journeys: ["driver_registration", "passenger_ride_request", "ride_matching", "driver_passenger_connection"]
    },
    {
      name: "Business Discovery",
      icon: <Building className="h-5 w-5" />,
      description: "Finding nearby businesses, services, and vendors",
      journeys: ["business_search", "nearby_services_discovery", "business_details_inquiry", "service_category_browsing"]
    },
    {
      name: "Business Listing",
      icon: <ShoppingCart className="h-5 w-5" />,
      description: "Vendors registering and managing their business presence",
      journeys: ["business_registration", "business_profile_setup", "business_verification", "listing_management"]
    },
    {
      name: "User Onboarding",
      icon: <UserPlus className="h-5 w-5" />,
      description: "New user registration, verification, initial setup",
      journeys: ["user_registration", "phone_verification", "profile_creation", "referral_code_entry"]
    },
    {
      name: "Connection Facilitation",
      icon: <Phone className="h-5 w-5" />,
      description: "Connecting users with businesses for direct communication",
      journeys: ["business_contact_facilitation", "service_inquiry_routing", "vendor_client_introduction", "connection_followup"]
    },
    {
      name: "Location Services",
      icon: <MapPin className="h-5 w-5" />,
      description: "Location sharing, GPS tracking, area-based discovery",
      journeys: ["location_sharing", "nearby_discovery", "area_exploration", "location_verification"]
    },
    {
      name: "Support & Help",
      icon: <MessageCircle className="h-5 w-5" />,
      description: "User assistance, FAQ, issue resolution, escalation",
      journeys: ["help_request", "faq_assistance", "issue_escalation", "feedback_collection"]
    },
    {
      name: "Referral System",
      icon: <Users className="h-5 w-5" />,
      description: "User referrals, credit rewards, growth tracking",
      journeys: ["referral_invitation", "referral_reward_claiming", "credit_management", "referral_tracking"]
    },
    {
      name: "Event Discovery",
      icon: <Calendar className="h-5 w-5" />,
      description: "Finding local events, community activities, announcements",
      journeys: ["event_discovery", "event_details_inquiry", "event_location_sharing", "community_events"]
    }
  ];

  const comprehensiveJourneyTemplates: ComprehensiveUserJourney[] = [
    // PAYMENT SERVICES
    {
      id: "payment_qr_generation",
      journey_name: "Payment QR Code Generation",
      service_category: "Payment Services",
      user_types: ["general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Amount Request",
          description: "User sends payment amount via WhatsApp",
          expected_input: "Numeric amount (e.g., '5000', 'five thousand RWF')",
          ai_response_template: "I'll generate a QR code for {amount} RWF. Please confirm this amount.",
          success_criteria: ["Amount correctly parsed", "User confirmation received"],
          fallback_actions: ["Request clarification", "Provide amount format examples"],
          estimated_time_seconds: 30
        },
        {
          step_number: 2,
          step_name: "QR Code Generation",
          description: "System generates USSD-compatible QR code",
          expected_input: "User confirmation ('yes', 'confirm', 'ok')",
          ai_response_template: "Generating your payment QR code for {amount} RWF...",
          success_criteria: ["QR code generated", "USSD code embedded"],
          fallback_actions: ["Retry generation", "Manual USSD code"],
          estimated_time_seconds: 15
        },
        {
          step_number: 3,
          step_name: "QR Code Delivery",
          description: "Send QR image with instructions via WhatsApp",
          expected_input: "Generated QR image",
          ai_response_template: "Here's your QR code for {amount} RWF. Scan with any MoMo app to complete payment.",
          success_criteria: ["Image delivered", "Instructions provided"],
          fallback_actions: ["Resend image", "Provide USSD text alternative"],
          estimated_time_seconds: 10
        }
      ],
      success_criteria: { completion_threshold: 0.95, satisfaction_target: 4.5, time_limit_seconds: 60 },
      ai_insights: {
        completion_rate: 0.97, success_probability: 0.95,
        optimization_suggestions: ["Reduce generation time", "Add payment tracking"],
        risk_factors: ["Network issues", "Image delivery failures"],
        user_satisfaction: 4.7, avg_completion_time: 45
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["USSD Gateway", "WhatsApp Media API", "MoMo Services"],
      dependencies: ["User Registration", "Amount Validation"]
    },

    // TRANSPORTATION DISCOVERY
    {
      id: "driver_registration",
      journey_name: "Driver Registration & Profile Setup",
      service_category: "Transportation Discovery",
      user_types: ["driver"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Driver Intent Recognition",
          description: "User expresses desire to register as driver",
          expected_input: "'driver on', 'register driver', 'become driver'",
          ai_response_template: "Great! I'll help you register as a driver. First, please share your current location.",
          success_criteria: ["Intent recognized", "Location sharing requested"],
          fallback_actions: ["Clarify driver benefits", "Explain requirements"],
          estimated_time_seconds: 30
        },
        {
          step_number: 2,
          step_name: "Location & Vehicle Details",
          description: "Collect location and vehicle information",
          expected_input: "Location share + vehicle plate number",
          ai_response_template: "Perfect! Vehicle {plate} registered for area {location}. You're now discoverable by passengers!",
          success_criteria: ["Location stored", "Vehicle verified", "Profile activated"],
          fallback_actions: ["Request manual entry", "Verify plate format"],
          estimated_time_seconds: 90
        },
        {
          step_number: 3,
          step_name: "Online Status Activation",
          description: "Set driver as available for ride requests",
          expected_input: "System confirmation",
          ai_response_template: "You're now ONLINE! Passengers can find you. Type 'driver off' when unavailable.",
          success_criteria: ["Status set to online", "Notifications enabled"],
          fallback_actions: ["Manual activation", "Status verification"],
          estimated_time_seconds: 15
        }
      ],
      success_criteria: { completion_threshold: 0.85, satisfaction_target: 4.2, time_limit_seconds: 180 },
      ai_insights: {
        completion_rate: 0.88, success_probability: 0.84,
        optimization_suggestions: ["Simplify vehicle entry", "Add photo verification"],
        risk_factors: ["Location permission denied", "Invalid plate numbers"],
        user_satisfaction: 4.3, avg_completion_time: 135
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Location Services", "Driver Database", "Vehicle Registry"],
      dependencies: ["User Onboarding", "Location Permissions"]
    },

    {
      id: "passenger_ride_request",
      journey_name: "Passenger Ride Request & Driver Matching",
      service_category: "Transportation Discovery",
      user_types: ["passenger", "general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Ride Request Intent",
          description: "User requests transportation assistance",
          expected_input: "'need ride', 'transport', 'taxi', 'moto'",
          ai_response_template: "I'll help you find transportation! Please share your current location.",
          success_criteria: ["Transport intent recognized", "Location requested"],
          fallback_actions: ["Clarify transport type", "Explain process"],
          estimated_time_seconds: 20
        },
        {
          step_number: 2,
          step_name: "Location & Destination",
          description: "Collect pickup and destination details",
          expected_input: "Current location + destination description",
          ai_response_template: "Searching for drivers near {pickup_location} to go to {destination}...",
          success_criteria: ["Both locations captured", "Driver search initiated"],
          fallback_actions: ["Request clearer destination", "Suggest landmarks"],
          estimated_time_seconds: 45
        },
        {
          step_number: 3,
          step_name: "Driver Matching & Connection",
          description: "Find available drivers and facilitate contact",
          expected_input: "Available drivers in area",
          ai_response_template: "Found {count} drivers nearby! Contact {driver_name} at {phone} (Vehicle: {plate})",
          success_criteria: ["Driver found", "Contact information shared"],
          fallback_actions: ["Expand search area", "Wait for drivers to come online"],
          estimated_time_seconds: 30
        }
      ],
      success_criteria: { completion_threshold: 0.90, satisfaction_target: 4.4, time_limit_seconds: 120 },
      ai_insights: {
        completion_rate: 0.91, success_probability: 0.87,
        optimization_suggestions: ["Reduce search time", "Add estimated fares"],
        risk_factors: ["No drivers available", "Location ambiguity"],
        user_satisfaction: 4.5, avg_completion_time: 95
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Driver Database", "Location Services", "Contact Bridge"],
      dependencies: ["Driver Registration", "Location Services"]
    },

    // BUSINESS DISCOVERY
    {
      id: "business_search",
      journey_name: "Business & Service Discovery",
      service_category: "Business Discovery",
      user_types: ["general", "client"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Service/Business Query",
          description: "User searches for specific business type or service",
          expected_input: "Business type (e.g., 'pharmacy', 'restaurant', 'mechanic')",
          ai_response_template: "Looking for {business_type} services. Let me find options near you!",
          success_criteria: ["Service type identified", "Search initiated"],
          fallback_actions: ["Suggest categories", "Ask for more specific description"],
          estimated_time_seconds: 20
        },
        {
          step_number: 2,
          step_name: "Location-Based Discovery",
          description: "Find businesses matching criteria in user's area",
          expected_input: "User location (shared or detected)",
          ai_response_template: "Found {count} {business_type} businesses near {location}:",
          success_criteria: ["Location obtained", "Businesses found and listed"],
          fallback_actions: ["Expand search radius", "Show alternative services"],
          estimated_time_seconds: 30
        },
        {
          step_number: 3,
          step_name: "Business Information & Contact",
          description: "Present business details and facilitate connection",
          expected_input: "Business selection from user",
          ai_response_template: "{business_name} - {address}. Contact: {phone}. Say easyMO referred you!",
          success_criteria: ["Business details shared", "Contact facilitated"],
          fallback_actions: ["Show more options", "Provide directions"],
          estimated_time_seconds: 15
        }
      ],
      success_criteria: { completion_threshold: 0.92, satisfaction_target: 4.3, time_limit_seconds: 90 },
      ai_insights: {
        completion_rate: 0.94, success_probability: 0.90,
        optimization_suggestions: ["Add business hours", "Include ratings"],
        risk_factors: ["Limited business database", "Outdated contact info"],
        user_satisfaction: 4.4, avg_completion_time: 65
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Business Directory", "Location Services", "Contact Bridge"],
      dependencies: ["Business Registration", "Location Data"]
    },

    // BUSINESS LISTING
    {
      id: "business_registration",
      journey_name: "Business Registration & Listing Setup",
      service_category: "Business Listing",
      user_types: ["business_owner", "vendor"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Business Registration Intent",
          description: "Business owner wants to list their business",
          expected_input: "'register business', 'list my business', 'add my shop'",
          ai_response_template: "I'll help you register your business! What type of business do you run?",
          success_criteria: ["Registration intent confirmed", "Business type requested"],
          fallback_actions: ["Explain benefits", "Show registration examples"],
          estimated_time_seconds: 30
        },
        {
          step_number: 2,
          step_name: "Business Details Collection",
          description: "Gather essential business information",
          expected_input: "Business name, type, location, contact details",
          ai_response_template: "Perfect! {business_name} ({business_type}) at {location}. Is this correct?",
          success_criteria: ["All details collected", "Information confirmed"],
          fallback_actions: ["Request missing info", "Clarify location"],
          estimated_time_seconds: 120
        },
        {
          step_number: 3,
          step_name: "Listing Activation",
          description: "Activate business listing for discovery",
          expected_input: "Final confirmation from business owner",
          ai_response_template: "Congratulations! {business_name} is now listed and discoverable by customers!",
          success_criteria: ["Listing activated", "Business searchable"],
          fallback_actions: ["Manual review", "Verification required"],
          estimated_time_seconds: 15
        }
      ],
      success_criteria: { completion_threshold: 0.88, satisfaction_target: 4.2, time_limit_seconds: 200 },
      ai_insights: {
        completion_rate: 0.90, success_probability: 0.86,
        optimization_suggestions: ["Simplify info collection", "Add photo upload"],
        risk_factors: ["Incomplete information", "Duplicate listings"],
        user_satisfaction: 4.3, avg_completion_time: 165
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Business Directory", "Verification System", "Search Index"],
      dependencies: ["User Verification", "Location Services"]
    },

    // USER ONBOARDING
    {
      id: "user_registration",
      journey_name: "New User Onboarding & Setup",
      service_category: "User Onboarding",
      user_types: ["new_user"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Welcome & Introduction",
          description: "First-time user interaction with easyMO",
          expected_input: "Any message from new user",
          ai_response_template: "Welcome to easyMO! 🇷🇼 I'm your AI assistant for payments, transport, and business discovery. What can I help you with?",
          success_criteria: ["Welcome sent", "Service overview provided"],
          fallback_actions: ["Resend welcome", "Provide help menu"],
          estimated_time_seconds: 15
        },
        {
          step_number: 2,
          step_name: "Basic Profile Setup",
          description: "Collect essential user information",
          expected_input: "User's preferred name and location preference",
          ai_response_template: "Nice to meet you, {name}! I'll remember your preferences. You can change them anytime by saying 'settings'.",
          success_criteria: ["Profile created", "Preferences stored"],
          fallback_actions: ["Skip profile setup", "Use minimal defaults"],
          estimated_time_seconds: 45
        },
        {
          step_number: 3,
          step_name: "Service Introduction",
          description: "Brief tour of available services",
          expected_input: "User readiness for tour",
          ai_response_template: "I can help with: 💳 Payment QR codes, 🚗 Finding transport, 🏪 Discovering businesses. Try saying 'payment 5000' or 'need ride'!",
          success_criteria: ["Services explained", "Example interactions provided"],
          fallback_actions: ["Skip tour", "Provide help command"],
          estimated_time_seconds: 30
        }
      ],
      success_criteria: { completion_threshold: 0.95, satisfaction_target: 4.6, time_limit_seconds: 120 },
      ai_insights: {
        completion_rate: 0.96, success_probability: 0.93,
        optimization_suggestions: ["Personalize welcome", "Add quick start guide"],
        risk_factors: ["User overwhelm", "Language barriers"],
        user_satisfaction: 4.7, avg_completion_time: 90
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["User Database", "Preference Manager", "Welcome System"],
      dependencies: ["WhatsApp Integration", "Language Detection"]
    },

    // CONNECTION FACILITATION
    {
      id: "business_contact_facilitation",
      journey_name: "Business Contact & Connection Facilitation",
      service_category: "Connection Facilitation",
      user_types: ["general", "client"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Connection Request",
          description: "User wants to contact a specific business or service",
          expected_input: "'contact [business_name]', 'call [service]', 'reach [vendor]'",
          ai_response_template: "I'll help you connect with {business_name}. Let me find their current contact information.",
          success_criteria: ["Business identified", "Contact search initiated"],
          fallback_actions: ["Clarify business name", "Suggest similar businesses"],
          estimated_time_seconds: 20
        },
        {
          step_number: 2,
          step_name: "Contact Information Retrieval",
          description: "Retrieve current business contact details and availability",
          expected_input: "Business verification and contact data",
          ai_response_template: "Found {business_name}! Contact them at {phone_number}. Available: {business_hours}",
          success_criteria: ["Contact info retrieved", "Business verified as active"],
          fallback_actions: ["Show alternative contacts", "Provide general location info"],
          estimated_time_seconds: 15
        },
        {
          step_number: 3,
          step_name: "Introduction & Follow-up",
          description: "Facilitate introduction and track connection success",
          expected_input: "User acknowledgment of contact information",
          ai_response_template: "Connection facilitated! Mention 'easyMO referred me' when you contact them. Need anything else?",
          success_criteria: ["Introduction completed", "Follow-up scheduled"],
          fallback_actions: ["Provide alternative contact methods", "Schedule callback"],
          estimated_time_seconds: 10
        }
      ],
      success_criteria: { completion_threshold: 0.93, satisfaction_target: 4.4, time_limit_seconds: 60 },
      ai_insights: {
        completion_rate: 0.95, success_probability: 0.91,
        optimization_suggestions: ["Add business availability status", "Include estimated response times"],
        risk_factors: ["Outdated contact information", "Business temporarily closed"],
        user_satisfaction: 4.6, avg_completion_time: 45
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Business Directory", "Contact Verification", "Connection Tracking"],
      dependencies: ["Business Registration", "Contact Database"]
    },

    // LOCATION SERVICES
    {
      id: "location_sharing",
      journey_name: "Location Sharing & Nearby Discovery",
      service_category: "Location Services",
      user_types: ["general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Location Sharing Request",
          description: "User shares location or requests location-based services",
          expected_input: "WhatsApp location share or 'near me', 'around here'",
          ai_response_template: "Location received! I can now show you nearby services. What are you looking for?",
          success_criteria: ["Location captured", "GPS coordinates stored"],
          fallback_actions: ["Request manual location", "Use previous location"],
          estimated_time_seconds: 30
        },
        {
          step_number: 2,
          step_name: "Nearby Services Discovery",
          description: "Find and present nearby businesses and services",
          expected_input: "User service/business inquiry",
          ai_response_template: "Found {count} services near {location}. Here are the closest options:",
          success_criteria: ["Services found", "Results sorted by distance"],
          fallback_actions: ["Expand search radius", "Show popular categories"],
          estimated_time_seconds: 25
        },
        {
          step_number: 3,
          step_name: "Service Selection & Direction",
          description: "Help user select service and provide location guidance",
          expected_input: "User selection of specific service/business",
          ai_response_template: "{business_name} is {distance} away at {address}. Contact: {phone}",
          success_criteria: ["Selection confirmed", "Location details provided"],
          fallback_actions: ["Provide walking directions", "Share exact coordinates"],
          estimated_time_seconds: 15
        }
      ],
      success_criteria: { completion_threshold: 0.91, satisfaction_target: 4.3, time_limit_seconds: 90 },
      ai_insights: {
        completion_rate: 0.93, success_probability: 0.89,
        optimization_suggestions: ["Add real-time business hours", "Include user reviews"],
        risk_factors: ["Location permission denied", "GPS inaccuracy"],
        user_satisfaction: 4.4, avg_completion_time: 70
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["GPS Services", "Business Directory", "Maps Integration"],
      dependencies: ["Location Permissions", "Business Database"]
    },

    // SUPPORT & HELP
    {
      id: "help_request",
      journey_name: "User Support & Help Assistance",
      service_category: "Support & Help",
      user_types: ["general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Help Request Recognition",
          description: "User requests help or encounters an issue",
          expected_input: "'help', 'problem', 'issue', 'not working', 'support'",
          ai_response_template: "I'm here to help! Can you describe what you're trying to do or what issue you're experiencing?",
          success_criteria: ["Help intent recognized", "Issue gathering initiated"],
          fallback_actions: ["Show help menu", "Provide FAQ links"],
          estimated_time_seconds: 15
        },
        {
          step_number: 2,
          step_name: "Issue Diagnosis & Resolution",
          description: "Analyze issue and provide solution or escalate",
          expected_input: "User description of problem or specific question",
          ai_response_template: "I understand the issue. Here's how to resolve it: {solution_steps}",
          success_criteria: ["Issue diagnosed", "Solution provided or escalation initiated"],
          fallback_actions: ["Ask clarifying questions", "Escalate to human support"],
          estimated_time_seconds: 60
        },
        {
          step_number: 3,
          step_name: "Resolution Confirmation",
          description: "Confirm issue is resolved and collect feedback",
          expected_input: "User confirmation of resolution status",
          ai_response_template: "Great! Is your issue resolved? Rate this help session (1-5) to help me improve.",
          success_criteria: ["Resolution confirmed", "Feedback collected"],
          fallback_actions: ["Offer additional help", "Schedule follow-up"],
          estimated_time_seconds: 20
        }
      ],
      success_criteria: { completion_threshold: 0.87, satisfaction_target: 4.2, time_limit_seconds: 120 },
      ai_insights: {
        completion_rate: 0.89, success_probability: 0.84,
        optimization_suggestions: ["Build better FAQ database", "Add visual troubleshooting guides"],
        risk_factors: ["Complex technical issues", "Language barriers"],
        user_satisfaction: 4.3, avg_completion_time: 95
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Knowledge Base", "Support Ticketing", "Feedback System"],
      dependencies: ["FAQ Database", "Support Staff Escalation"]
    },

    // REFERRAL SYSTEM
    {
      id: "referral_invitation",
      journey_name: "User Referral & Reward System",
      service_category: "Referral System",
      user_types: ["general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Referral Intent Recognition",
          description: "User wants to refer friends or claim referral rewards",
          expected_input: "'refer friend', 'invite', 'referral code', 'reward'",
          ai_response_template: "Great! You can earn rewards by referring friends to easyMO. Your referral code is: {referral_code}",
          success_criteria: ["Referral intent recognized", "User code provided"],
          fallback_actions: ["Explain referral benefits", "Show how to share code"],
          estimated_time_seconds: 20
        },
        {
          step_number: 2,
          step_name: "Referral Sharing & Tracking",
          description: "Help user share referral code and track invitations",
          expected_input: "User confirmation to share or request tracking info",
          ai_response_template: "Share this message: 'Join easyMO for payments & transport! Use code {code} for bonuses: [link]'",
          success_criteria: ["Sharing message provided", "Tracking initiated"],
          fallback_actions: ["Provide manual sharing instructions", "Show referral status"],
          estimated_time_seconds: 30
        },
        {
          step_number: 3,
          step_name: "Reward Processing",
          description: "Process successful referrals and award credits",
          expected_input: "New user registration with referral code",
          ai_response_template: "Congratulations! {friend_name} joined using your code. You earned {reward_amount} RWF credit!",
          success_criteria: ["Referral confirmed", "Reward credited"],
          fallback_actions: ["Manual verification", "Credit adjustment"],
          estimated_time_seconds: 15
        }
      ],
      success_criteria: { completion_threshold: 0.85, satisfaction_target: 4.1, time_limit_seconds: 80 },
      ai_insights: {
        completion_rate: 0.87, success_probability: 0.82,
        optimization_suggestions: ["Simplify code sharing", "Add social media integration"],
        risk_factors: ["Code sharing barriers", "Reward processing delays"],
        user_satisfaction: 4.2, avg_completion_time: 65
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Referral Tracking", "Credit System", "Messaging API"],
      dependencies: ["User Registration", "Payment System"]
    },

    // EVENT DISCOVERY
    {
      id: "event_discovery",
      journey_name: "Local Event Discovery & Information",
      service_category: "Event Discovery",
      user_types: ["general"],
      flow_steps: [
        {
          step_number: 1,
          step_name: "Event Interest Recognition",
          description: "User searches for local events or activities",
          expected_input: "'events', 'activities', 'what's happening', 'concerts', 'meetings'",
          ai_response_template: "Looking for local events! Let me find activities happening near you.",
          success_criteria: ["Event interest recognized", "Location-based search initiated"],
          fallback_actions: ["Ask for specific event type", "Show popular categories"],
          estimated_time_seconds: 20
        },
        {
          step_number: 2,
          step_name: "Event Discovery & Filtering",
          description: "Find and present relevant local events",
          expected_input: "User location and event preferences",
          ai_response_template: "Found {count} events near you: {event_list}",
          success_criteria: ["Events found", "Results filtered by relevance"],
          fallback_actions: ["Expand search area", "Show upcoming events"],
          estimated_time_seconds: 30
        },
        {
          step_number: 3,
          step_name: "Event Details & Location Sharing",
          description: "Provide detailed event information and directions",
          expected_input: "User selection of specific event",
          ai_response_template: "{event_name} - {date} at {venue}. Details: {description}. Location: {address}",
          success_criteria: ["Event details provided", "Location information shared"],
          fallback_actions: ["Provide contact info", "Show similar events"],
          estimated_time_seconds: 25
        }
      ],
      success_criteria: { completion_threshold: 0.88, satisfaction_target: 4.0, time_limit_seconds: 90 },
      ai_insights: {
        completion_rate: 0.90, success_probability: 0.85,
        optimization_suggestions: ["Add event calendar integration", "Include RSVP tracking"],
        risk_factors: ["Limited event database", "Outdated event information"],
        user_satisfaction: 4.1, avg_completion_time: 75
      },
      is_active: true, last_updated: new Date().toISOString(), ai_generated: false,
      integration_points: ["Event Database", "Calendar Systems", "Location Services"],
      dependencies: ["Event Registration", "Venue Database"]
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