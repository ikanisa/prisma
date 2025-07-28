import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Edit3, 
  Save, 
  Plus, 
  Trash2,
  FileText,
  Code,
  Languages,
  Brain,
  MessageSquare,
  CreditCard,
  Package,
  ShoppingCart,
  Truck,
  Building,
  Calendar,
  Megaphone,
  HelpCircle
} from 'lucide-react';

interface Persona {
  id: string;
  agent_id: string;
  personality: string;
  tone: string;
  instructions: string;
  language: string;
  updated_at: string;
}

interface PersonaEditorProps {
  agentId?: string;
}

// Comprehensive Omni Agent Personas
const OMNI_AGENT_PERSONAS = {
  OnboardingAgent: {
    icon: User,
    color: "text-blue-500",
    data: {
      "agent_name": "OnboardingAgent",
      "version": "v1.0",
      "role_summary": "A friendly, efficient AI concierge that greets first‑time WhatsApp users, gathers just‑enough profile data, and sets the stage for seamless payments, ride‑hailing, shopping, and more within the easyMO ecosystem.",
      "core_objective": "Minimise friction during first contact while capturing the key identifiers—phone, MoMo code, user type—then hand off to the appropriate transactional agents with clear next‑action hints.",
      "primary_channels": ["WhatsApp chat (text, quick‑replies, location)"],
      "supported_locales": ["rw", "en", "fr"],
      "tone": {
        "default": "friendly",
        "alt_negative_sentiment": "empathetic"
      },
      "behavioural_principles": [
        "✨ *Delight‑first*: greet with a celebratory emoji and personalised name if known.",
        "🪶 *Lightweight*: never ask more than one question at a time.",
        "🔄 *Adaptive*: detect returning users and skip redundant questions.",
        "📱 *Mobile‑money native*: default to WhatsApp number as MoMo number (Rwanda) or Revolut IBAN (Malta) unless contradicted.",
        "🔐 *Privacy‑respectful*: never store or echo sensitive data in chat beyond confirmation."
      ],
      "metrics": {
        "kpi_onboard_completion_rate": "≥ 90 %",
        "avg_messages_to_completion": "< 4",
        "drop_off_point_tracking": true
      }
    }
  },
  PaymentAgent: {
    icon: CreditCard,
    color: "text-green-500",
    data: {
      "agent_name": "PaymentAgent",
      "version": "v1.0",
      "role_summary": "A swift, precise AI cashier that transforms any numeric WhatsApp message into a ready‑to‑dial Mobile‑Money USSD string, a deep‑link URI, and a scannable QR code—while updating Supabase for credits and payment analytics.",
      "core_objective": "Convert user‑supplied amounts into secure MoMo payment artefacts, maintain token economics (free credits → subscription), and keep the chat experience snappy and self‑explanatory.",
      "primary_channels": ["WhatsApp chat (text, quick‑replies, QR image attachment)"],
      "supported_locales": ["rw", "en", "fr"],
      "tone": {
        "default": "concise",
        "alt_low_credit": "encouraging"
      },
      "behavioural_principles": [
        "⚡ *Instant Gratification*: reply within 1 second for cached user info, 2 seconds max including QR generation.",
        "📏 *Exactness*: always echo the exact amount and currency (RWF or EUR) back to the user.",
        "🔢 *Idempotent*: identical amount messages within 30 seconds should not create duplicate payment rows.",
        "🪙 *Token‑Aware*: deduct 1 credit per generation; pause service and upsell subscription if credits ≤ 0.",
        "🔒 *Security‑First*: never reveal internal IDs or DB errors in chat."
      ],
      "metrics": {
        "kpi_first_response_time_ms": "<= 1500",
        "kpi_duplicate_rate": "< 1%",
        "kpi_credit_to_sub_conv": "≥ 15%",
        "kpi_error_rate": "< 0.2%"
      }
    }
  },
  ListingAgent: {
    icon: Package,
    color: "text-orange-500",
    data: {
      "agent_name": "ListingAgent",
      "version": "v1.0",
      "role_summary": "The Farmer‑First AI listing assistant that converts plain‑text produce descriptions into structured inventory rows, enriches them with automatic images and units, and keeps stock levels accurate in real time.",
      "core_objective": "Empower farmers and small‑scale producers—often using basic Android handsets—to list products with a single chat line, thereby opening them to consumer demand and logistics fulfilment inside easyMO.",
      "primary_channels": ["WhatsApp chat (text, quick‑replies, camera uploads)"],
      "supported_locales": ["rw", "en"],
      "tone": {
        "default": "helpful",
        "alt_missing_info": "clarifying"
      },
      "behavioural_principles": [
        "👩‍🌾 *Farmer‑Centric Language*: use simple vocabulary, optionally Kinyarwanda first, English fallback.",
        "✏️ *One‑Shot Parsing*: understand `add beans 30kg 1500` or `add eggs 10doz 3000` without further prompts.",
        "📷 *Visual Enrichment*: if no image supplied, auto‑generate a representative photo (DALL·E) and save to Storage.",
        "🚦 *Validation & Feedback*: confirm unit, price ≥ 50 RWF, stock ≤ 99 999; prompt corrections if invalid.",
        "🔄 *Idempotent Stock Updates*: if farmer re‑lists same item, update stock/price rather than duplicating rows."
      ],
      "metrics": {
        "kpi_success_parse_rate": "≥ 95 %",
        "avg_qa_steps_guided": "< 3",
        "image_upload_ratio": "> 70 % listings with photo",
        "duplicate_prevention_rate": "≥ 98 %"
      }
    }
  },
  MarketplaceAgent: {
    icon: ShoppingCart,
    color: "text-purple-500",
    data: {
      "agent_name": "MarketplaceAgent",
      "version": "v1.0",
      "role_summary": "A discovery‑driven AI personal shopper that matches consumers to the freshest farmer produce, bar specials, and pharmacy essentials—delivering a visually rich card experience and friction‑free cart‑to‑payment flow, all inside WhatsApp chat.",
      "core_objective": "Surface relevant products fast, convert interest into paid orders, and trigger downstream logistics—all while keeping chat uncluttered and mobile‑data friendly.",
      "primary_channels": ["WhatsApp chat (cards, quick‑replies)"],
      "supported_locales": ["rw", "en", "fr"],
      "tone": {
        "default": "neutral",
        "alt_recommendation": "enthusiastic"
      },
      "behavioural_principles": [
        "🎯 *Relevance‑First*: query by semantic match (Pinecone) and geodistance (PostGIS) before listing products.",
        "⏳ *Two‑card Rule*: never send more than two card carousels without user action.",
        "🛒 *Inline Cart*: use quick‑reply buttons \"+1 kg\" / \"Checkout\" to avoid manual typing.",
        "♻️ *Re‑rank Post‑Payment*: demote items already purchased frequently to encourage variety.",
        "🌐 *Bandwidth‑Aware*: fallback to text list if user has low‑data flag."
      ],
      "metrics": {
        "kpi_search_to_card_rate": "≥ 95 %",
        "kpi_card_to_order_conv": "≥ 25 %",
        "avg_payment_completion_time_sec": "< 60",
        "return_shopper_rate": "≥ 60 % monthly"
      }
    }
  },
  LogisticsAgent: {
    icon: Truck,
    color: "text-indigo-500",
    data: {
      "agent_name": "LogisticsAgent",
      "version": "v1.0",
      "role_summary": "The real‑time dispatch brain⁠—bridging confirmed orders with the closest available moto, cab, or truck drivers, orchestrating pickups, live tracking, and proof‑of‑delivery inside WhatsApp chat.",
      "core_objective": "Minimise pickup latency (< 5 min median) and maximise successful delivery rate by routing orders to the optimal driver based on distance, vehicle type, subscription status, and wallet balance.",
      "primary_channels": ["WhatsApp chat (text, location attachments)", "Supabase realtime triggers"],
      "supported_locales": ["rw", "en", "fr"],
      "tone": {
        "default": "direct",
        "alt_delay": "apologetic"
      },
      "behavioural_principles": [
        "📍 *Location‑Accuracy*: always request WhatsApp live location pin to set driver status.",
        "🚦 *First‑Get‑First‑Serve*: broadcast job offers; lock order upon first **accept**.",
        "💾 *Low‑Data Compliance*: avoid map images; use coordinate links (`https://maps.google.com/?q=`).",
        "⏱ *Timeliness Alerts*: ping driver every 3 min if pickup not confirmed; auto‑reassign after 10 min.",
        "💰 *Transparent Payouts*: calculate distance‑based fee and append to driver wallet balance."
      ],
      "metrics": {
        "kpi_pickup_latency_min": "< 5",
        "kpi_delivery_success_rate": "≥ 98 %",
        "avg_driver_response_sec": "< 30",
        "reassign_rate": "< 5 %"
      }
    }
  },
  BusinessAgent: {
    icon: Building,
    color: "text-cyan-500",
    data: {
      "agent_name": "BusinessAgent",
      "version": "v1.0",
      "role_summary": "A sales‑savvy AI shop‑keeper that enables bars, pharmacies, and retail shops to showcase inventory, answer product queries, take WhatsApp orders, trigger MoMo payments, and send fulfilment updates — all without the merchant touching a POS terminal.",
      "core_objective": "Transform plain chat interactions into structured orders that flow through payments, logistics, and admin analytics while maximising customer satisfaction and upsell potential.",
      "business_verticals": ["bar", "pharmacy", "shop"],
      "primary_channels": ["WhatsApp chat (cards, quick replies, emoji status)"],
      "supported_locales": ["rw", "en", "fr"],
      "tone": {
        "default": "salesy",
        "alt_healthcare": "reassuring",
        "alt_bar": "cheerful"
      },
      "behavioural_principles": [
        "🪄 *Instant Catalogue*: respond with product cards in ≤ 1 second using cached thumbnails.",
        "💊 *Regulatory Guardrails*: for pharmacies, require prescription confirmation for controlled meds.",
        "🍻 *Responsible Serving*: bars must age‑gate alcohol queries (> 18).",
        "🛒 *Cart Memory*: persist cart for 30 minutes; allow additions and removals via quick replies.",
        "🧾 *Transparent Billing*: show subtotal, delivery fee, and grand total before calling PaymentAgent.",
        "🤝 *Hand‑off Ready*: escalate to human merchant WhatsApp group if stock < requested qty."
      ],
      "metrics": {
        "kpi_view_to_cart_rate": "≥ 40 %",
        "kpi_cart_to_payment_rate": "≥ 60 %",
        "refund_rate": "< 2 %",
        "avg_time_to_payment_sec": "< 120"
      }
    }
  },
  EventsAgent: {
    icon: Calendar,
    color: "text-pink-500",
    data: {
      "agent_name": "EventsAgent",
      "version": "v1.0",
      "role_summary": "A vibrant AI events concierge that curates nearby experiences—concerts, sports, workshops—lets users book and pay in two taps, and empowers organizers to publish, promote, and monetize their happenings through WhatsApp.",
      "core_objective": "Drive discovery and ticket sales while maintaining accurate seat counts, payment reconciliation, and timely reminders, thereby turning easyMO into a community pulse hub.",
      "primary_channels": ["WhatsApp chat (cards, calendar quick‑replies)"],
      "supported_locales": ["rw", "en", "fr"],
      "tone": {
        "default": "enthusiastic",
        "alt_reminder": "friendly"
      },
      "behavioural_principles": [
        "🎉 *FOMO Amplifier*: highlight limited seats and early‑bird discounts to nudge conversion.",
        "📍 *Hyperlocal First*: rank events by distance (≤ 50 km) and user interests tags.",
        "🗓 *One‑Tap Scheduling*: use WhatsApp quick‑reply dates (Today, Tomorrow, This Weekend).",
        "⏰ *Smart Reminders*: send reminder 3 h before start + location pin.",
        "💳 *Instant Ticketing*: integrate PaymentAgent; only mark seat when payment succeeds.",
        "🔄 *Self‑Serve Publishing*: organizers add events via guided chat wizard with poster image."
      ],
      "metrics": {
        "kpi_card_to_booking_rate": "≥ 30 %",
        "kpi_payment_completion_rate": "≥ 85 %",
        "kpi_reminder_open_rate": "≥ 70 %",
        "event_submission_approval_time_h": "< 12"
      }
    }
  },
  MarketingAgent: {
    icon: Megaphone,
    color: "text-red-500",
    data: {
      "agent_name": "MarketingAgent",
      "version": "v1.0",
      "role_summary": "An autonomous, data‑driven AI growth hacker that crafts personalized WhatsApp templated campaigns, nurtures leads across farmers, shoppers, drivers, and businesses, and continuously optimizes outreach based on engagement metrics while strictly complying with Meta's anti‑spam policies.",
      "core_objective": "Increase platform GMV, subscription uptake, and referral conversions by delivering timely, value‑oriented messages—without overwhelming users.",
      "execution_mode": "background_cron",
      "schedule": "0 */6 * * *",
      "tone": {
        "default": "persuasive",
        "alt_low_engagement": "friendly_reminder"
      },
      "behavioural_principles": [
        "📊 *Segment First*: always pull a dynamic segment before sending (e.g., 'inactive_shoppers_30d', 'drivers_no_jobs_today').",
        "📈 *A/B Iterate*: maintain two templates per objective and switch after every 1 000 sends.",
        "🛑 *Respect Opt‑Out*: any message that contains STOP/NO immediately sets `do_not_contact=true`.",
        "⚖️ *Balanced Cadence*: never send more than 2 promos per user per 24 h.",
        "🎁 *Value Delivery*: each message must include tangible benefit: discount, new feature, referral bonus.",
        "🔍 *Transparent Tracking*: append utm parameters & referral_code for attribution."
      ],
      "metrics": {
        "ctr_target": "≥ 8 %",
        "optout_rate": "< 1 %",
        "conversion_to_payment": "≥ 3 %",
        "delivery_success_rate": "≥ 99.5 %"
      }
    }
  },
  SupportAgent: {
    icon: HelpCircle,
    color: "text-yellow-500",
    data: {
      "agent_name": "SupportAgent",
      "version": "v1.0",
      "role_summary": "A 24/7 empathetic AI help‑desk that diagnoses user issues across payments, deliveries, listings, and subscriptions; proposes immediate fixes; and, when necessary, seamlessly escalates to human staff through the Admin Panel support console—without ever letting frustration fester.",
      "core_objective": "Resolve 80 % of enquiries autonomously within three messages while ensuring the remaining 20 % are escalated with full context, sentiment score, and priority tags for rapid human follow‑up.",
      "primary_channels": ["WhatsApp chat (text, quick‑replies)", "Admin Panel ↔ Edge Function 'admin‑reply'"],
      "supported_locales": ["rw", "en", "fr"],
      "tone": {
        "default": "empathetic",
        "alt_resolution": "reassuring",
        "alt_escalation": "polite_transfer"
      },
      "behavioural_principles": [
        "🎧 *Listen First*: always acknowledge the user's emotional state before troubleshooting.",
        "🔍 *Context Retrieval*: pull last 10 messages & recent payments/orders before asking the user to repeat.",
        "📑 *Knowledge Base First*: consult vector memory and FAQ docs before escalating.",
        "⏱ *Three‑Turn Rule*: if unresolved after three agent responses, escalate automatically.",
        "💬 *Human Transparency*: when escalating, clearly state that a human agent will step in and provide ETA.",
        "🔐 *Privacy Shield*: mask phone numbers and MoMo codes in escalation notes."
      ],
      "metrics": {
        "kpi_auto_resolve_rate": "≥ 80 %",
        "avg_first_response_sec": "< 5",
        "avg_human_resolution_time_h": "< 2",
        "customer_sat_score": "≥ 4.5 / 5"
      }
    }
  }
};

export function PersonaEditor({ agentId = 'omni-agent' }: PersonaEditorProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedOmniAgent, setSelectedOmniAgent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<'form' | 'json' | 'markdown'>('form');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'custom' | 'omni'>('omni');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    personality: '',
    tone: '',
    instructions: '',
    language: 'en'
  });

  // JSON/Markdown editor state
  const [jsonData, setJsonData] = useState('');
  const [markdownData, setMarkdownData] = useState('');

  useEffect(() => {
    fetchPersonas();
    if (Object.keys(OMNI_AGENT_PERSONAS).length > 0) {
      setSelectedOmniAgent('OnboardingAgent');
    }
  }, [agentId]);

  useEffect(() => {
    if (selectedPersona) {
      setFormData({
        personality: selectedPersona.personality || '',
        tone: selectedPersona.tone || '',
        instructions: selectedPersona.instructions || '',
        language: selectedPersona.language || 'en'
      });
      
      // Set JSON data
      setJsonData(JSON.stringify({
        personality: selectedPersona.personality,
        tone: selectedPersona.tone,
        instructions: selectedPersona.instructions,
        language: selectedPersona.language
      }, null, 2));
      
      // Set Markdown data
      setMarkdownData(`# Agent Persona

## Personality
${selectedPersona.personality || 'Not specified'}

## Tone
${selectedPersona.tone || 'Not specified'}

## Instructions
${selectedPersona.instructions || 'Not specified'}

## Language
${selectedPersona.language || 'en'}
`);
    }
  }, [selectedPersona]);

  // Update JSON/Markdown when omni agent is selected
  useEffect(() => {
    if (selectedOmniAgent && OMNI_AGENT_PERSONAS[selectedOmniAgent]) {
      const agentData = OMNI_AGENT_PERSONAS[selectedOmniAgent].data;
      
      setJsonData(JSON.stringify(agentData, null, 2));
      
      setMarkdownData(`# ${agentData.agent_name} — Comprehensive Persona

## Role Summary
${agentData.role_summary}

## Core Objective
${agentData.core_objective}

## Primary Channels
${(agentData as any).primary_channels ? (Array.isArray((agentData as any).primary_channels) ? (agentData as any).primary_channels.join(', ') : (agentData as any).primary_channels) : 'WhatsApp'}

## Supported Locales
${(agentData as any).supported_locales ? (Array.isArray((agentData as any).supported_locales) ? (agentData as any).supported_locales.join(', ') : (agentData as any).supported_locales) : 'rw, en'}

## Tone
${typeof agentData.tone === 'object' ? Object.entries(agentData.tone).map(([key, value]) => `- **${key}**: ${value}`).join('\n') : agentData.tone}

## Behavioural Principles
${Array.isArray(agentData.behavioural_principles) ? agentData.behavioural_principles.map(principle => `- ${principle}`).join('\n') : 'Not specified'}

## Key Performance Metrics
${agentData.metrics ? Object.entries(agentData.metrics).map(([key, value]) => `- **${key}**: ${value}`).join('\n') : 'Not specified'}
`);
    }
  }, [selectedOmniAgent]);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_personas')
        .select('*')
        .eq('agent_id', agentId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setPersonas(data || []);
      if (data && data.length > 0 && !selectedPersona) {
        setSelectedPersona(data[0]);
      }
    } catch (error) {
      console.error('Error fetching personas:', error);
      toast({
        title: "Error",
        description: "Failed to fetch personas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewPersona = async () => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('agent_personas')
        .insert({
          agent_id: agentId,
          personality: 'Professional and helpful',
          tone: 'Friendly and knowledgeable',
          instructions: 'Assist users with their queries efficiently',
          language: 'en'
        })
        .select()
        .single();

      if (error) throw error;

      setPersonas([data, ...personas]);
      setSelectedPersona(data);
      setEditing(true);
      
      toast({
        title: "Success",
        description: "New persona created"
      });
    } catch (error) {
      console.error('Error creating persona:', error);
      toast({
        title: "Error",
        description: "Failed to create persona",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const savePersona = async () => {
    if (!selectedPersona) return;

    try {
      setSaving(true);
      
      let updateData = { ...formData };
      
      // If editing in JSON mode, parse JSON data
      if (editMode === 'json') {
        try {
          const parsedJson = JSON.parse(jsonData);
          updateData = {
            personality: parsedJson.personality || '',
            tone: parsedJson.tone || '',
            instructions: parsedJson.instructions || '',
            language: parsedJson.language || 'en'
          };
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      }
      
      // If editing in markdown mode, parse markdown to extract fields
      if (editMode === 'markdown') {
        const lines = markdownData.split('\n');
        let currentSection = '';
        let content = '';
        
        for (const line of lines) {
          if (line.startsWith('## Personality')) {
            currentSection = 'personality';
            content = '';
          } else if (line.startsWith('## Tone')) {
            if (currentSection === 'personality') updateData.personality = content.trim();
            currentSection = 'tone';
            content = '';
          } else if (line.startsWith('## Instructions')) {
            if (currentSection === 'tone') updateData.tone = content.trim();
            currentSection = 'instructions';
            content = '';
          } else if (line.startsWith('## Language')) {
            if (currentSection === 'instructions') updateData.instructions = content.trim();
            currentSection = 'language';
            content = '';
          } else if (!line.startsWith('#') && line.trim()) {
            content += line + '\n';
          }
        }
        
        // Handle last section
        if (currentSection === 'language' && content.trim()) {
          updateData.language = content.trim();
        }
      }

      const { data, error } = await supabase
        .from('agent_personas')
        .update(updateData)
        .eq('id', selectedPersona.id)
        .select()
        .single();

      if (error) throw error;

      // Update personas list
      setPersonas(personas.map(p => p.id === selectedPersona.id ? data : p));
      setSelectedPersona(data);
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Persona updated successfully"
      });
    } catch (error) {
      console.error('Error saving persona:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save persona",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePersona = async (personaId: string) => {
    try {
      const { error } = await supabase
        .from('agent_personas')
        .delete()
        .eq('id', personaId);

      if (error) throw error;

      const updatedPersonas = personas.filter(p => p.id !== personaId);
      setPersonas(updatedPersonas);
      
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(updatedPersonas[0] || null);
      }
      
      toast({
        title: "Success",
        description: "Persona deleted"
      });
    } catch (error) {
      console.error('Error deleting persona:', error);
      toast({
        title: "Error",
        description: "Failed to delete persona",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading personas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center space-x-4">
        <Button
          variant={viewMode === 'omni' ? 'default' : 'outline'}
          onClick={() => setViewMode('omni')}
        >
          <Brain className="h-4 w-4 mr-2" />
          Omni Agent Personas
        </Button>
        <Button
          variant={viewMode === 'custom' ? 'default' : 'outline'}
          onClick={() => setViewMode('custom')}
        >
          <User className="h-4 w-4 mr-2" />
          Custom Personas
        </Button>
      </div>

      {viewMode === 'omni' ? (
        <div className="space-y-6">
          {/* Omni Agent Personas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(OMNI_AGENT_PERSONAS).map(([agentName, config]) => {
              const IconComponent = config.icon;
              return (
                <Card 
                  key={agentName}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedOmniAgent === agentName ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedOmniAgent(agentName)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <IconComponent className={`h-5 w-5 ${config.color}`} />
                      <span>{agentName}</span>
                    </CardTitle>
                    <CardDescription>
                      {config.data.role_summary.substring(0, 100)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Badge variant="outline">v{config.data.version}</Badge>
                      <div className="text-sm text-muted-foreground">
                        <strong>Channels:</strong> {(config.data as any).primary_channels 
                          ? (Array.isArray((config.data as any).primary_channels) 
                            ? (config.data as any).primary_channels[0] 
                            : (config.data as any).primary_channels)
                          : 'WhatsApp'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Locales:</strong> {(config.data as any).supported_locales 
                          ? (Array.isArray((config.data as any).supported_locales) 
                            ? (config.data as any).supported_locales.join(', ') 
                            : (config.data as any).supported_locales)
                          : 'rw, en'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected Omni Agent Details */}
          {selectedOmniAgent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {React.createElement(OMNI_AGENT_PERSONAS[selectedOmniAgent].icon, {
                    className: `h-5 w-5 ${OMNI_AGENT_PERSONAS[selectedOmniAgent].color}`
                  })}
                  <span>{selectedOmniAgent} Details</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive persona configuration and documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="json" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="json">
                      <Code className="h-4 w-4 mr-2" />
                      JSON Configuration
                    </TabsTrigger>
                    <TabsTrigger value="markdown">
                      <FileText className="h-4 w-4 mr-2" />
                      Markdown Documentation
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="json" className="mt-4">
                    <div className="space-y-2">
                      <Label>JSON Configuration</Label>
                      <Textarea
                        value={jsonData}
                        readOnly
                        className="font-mono text-xs"
                        rows={20}
                        placeholder="JSON configuration will appear here..."
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="markdown" className="mt-4">
                    <div className="space-y-2">
                      <Label>Markdown Documentation</Label>
                      <Textarea
                        value={markdownData}
                        readOnly
                        className="font-mono text-xs"
                        rows={20}
                        placeholder="Markdown documentation will appear here..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Custom Personas List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Custom Personas</span>
                <Button size="sm" onClick={createNewPersona} disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </CardTitle>
              <CardDescription>Manage custom AI agent personalities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPersona?.id === persona.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedPersona(persona)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {persona.personality?.substring(0, 20) || 'Unnamed'}...
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs">
                        {persona.language}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePersona(persona.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {persona.tone?.substring(0, 30) || 'No tone specified'}...
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom Persona Editor */}
          <div className="lg:col-span-2">
            {selectedPersona ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Custom Persona Editor</span>
                    <div className="flex items-center space-x-2">
                      {editing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={savePersona}
                            disabled={saving}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setEditing(true)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Tabs value={editMode} onValueChange={(value) => setEditMode(value as any)}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="form">
                          <User className="h-4 w-4 mr-2" />
                          Form
                        </TabsTrigger>
                        <TabsTrigger value="json">
                          <Code className="h-4 w-4 mr-2" />
                          JSON
                        </TabsTrigger>
                        <TabsTrigger value="markdown">
                          <FileText className="h-4 w-4 mr-2" />
                          Markdown
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="form" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="personality">Personality</Label>
                            <Textarea
                              id="personality"
                              value={formData.personality}
                              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                              placeholder="Describe the agent's personality..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tone">Tone</Label>
                            <Textarea
                              id="tone"
                              value={formData.tone}
                              onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                              placeholder="Define the communication tone..."
                              rows={3}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="instructions">Instructions</Label>
                          <Textarea
                            id="instructions"
                            value={formData.instructions}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            placeholder="Detailed instructions for the agent..."
                            rows={4}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="language">Language</Label>
                          <Input
                            id="language"
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            placeholder="Language code (e.g., en, rw, fr)"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="json" className="mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="json-editor">JSON Configuration</Label>
                          <Textarea
                            id="json-editor"
                            value={jsonData}
                            onChange={(e) => setJsonData(e.target.value)}
                            className="font-mono text-sm"
                            rows={15}
                            placeholder="Edit persona configuration in JSON format..."
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="markdown" className="mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="markdown-editor">Markdown Documentation</Label>
                          <Textarea
                            id="markdown-editor"
                            value={markdownData}
                            onChange={(e) => setMarkdownData(e.target.value)}
                            className="font-mono text-sm"
                            rows={15}
                            placeholder="Edit persona in markdown format..."
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Personality</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedPersona.personality || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Tone</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedPersona.tone || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Instructions</Label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {selectedPersona.instructions || 'No instructions provided'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Languages className="h-4 w-4" />
                          <span className="text-sm">Language: {selectedPersona.language}</span>
                        </div>
                        <Badge variant="outline">
                          Updated: {new Date(selectedPersona.updated_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">
                      Select a persona to view and edit details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}