-- Enhanced AI Agent Production Tables

-- Model Management and Versioning
CREATE TABLE public.ai_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'gpt-4o', 'gpt-4o-mini', 'claude-3-sonnet', etc.
  configuration JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'deprecated', 'testing'
  cost_per_token NUMERIC(10,8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(name, version)
);

-- A/B Testing Framework
CREATE TABLE public.model_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  model_a_id UUID REFERENCES public.ai_models(id),
  model_b_id UUID REFERENCES public.ai_models(id),
  traffic_split NUMERIC(3,2) DEFAULT 0.5, -- 0.5 = 50/50 split
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running', -- 'draft', 'running', 'completed', 'paused'
  success_metrics JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Model Performance Benchmarking
CREATE TABLE public.model_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.ai_models(id),
  benchmark_type TEXT NOT NULL, -- 'response_time', 'accuracy', 'safety', 'cost'
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  benchmark_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  test_dataset TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enhanced Memory System
CREATE TABLE public.agent_memory_enhanced (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id UUID REFERENCES public.agents(id),
  memory_type TEXT NOT NULL, -- 'preference', 'context', 'skill', 'behavior_pattern'
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 1.0,
  importance_weight NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  vector_embedding VECTOR(1536) -- For semantic search
);

-- Knowledge Base with Versioning
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'json', 'markdown'
  version INTEGER NOT NULL DEFAULT 1,
  source TEXT, -- 'conversation', 'manual', 'external_api'
  confidence NUMERIC(3,2) DEFAULT 1.0,
  validation_status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  vector_embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation Quality Scoring
CREATE TABLE public.conversation_quality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id),
  message_id UUID,
  phone_number TEXT NOT NULL,
  response_text TEXT NOT NULL,
  quality_scores JSONB NOT NULL, -- {accuracy: 0.95, helpfulness: 0.88, safety: 1.0, relevance: 0.92}
  safety_flags JSONB DEFAULT '{}', -- {inappropriate: false, hallucination: false, harmful: false}
  confidence_score NUMERIC(3,2) NOT NULL,
  human_feedback JSONB DEFAULT '{}',
  automated_checks JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Behavior Analytics
CREATE TABLE public.user_behavior_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'communication_style', 'preferences', 'journey_stage'
  pattern_data JSONB NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sample_size INTEGER DEFAULT 1,
  UNIQUE(user_id, pattern_type)
);

-- Advanced Agent Metrics
CREATE TABLE public.agent_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id),
  metric_type TEXT NOT NULL, -- 'response_time', 'success_rate', 'user_satisfaction', 'cost_efficiency'
  metric_value NUMERIC NOT NULL,
  measurement_period TEXT NOT NULL, -- 'hourly', 'daily', 'weekly'
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Circuit Breaker Status
CREATE TABLE public.circuit_breakers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'closed', -- 'closed', 'open', 'half_open'
  failure_count INTEGER DEFAULT 0,
  last_failure_time TIMESTAMP WITH TIME ZONE,
  failure_threshold INTEGER DEFAULT 5,
  recovery_timeout_seconds INTEGER DEFAULT 300,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Content Safety Filters
CREATE TABLE public.content_safety_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL, -- 'keyword_filter', 'sentiment_threshold', 'topic_restriction'
  rule_config JSONB NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  action TEXT NOT NULL DEFAULT 'flag', -- 'flag', 'block', 'escalate', 'modify'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_safety_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage ai_models" ON public.ai_models FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can manage model_experiments" ON public.model_experiments FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can view model_benchmarks" ON public.model_benchmarks FOR SELECT USING (is_admin());
CREATE POLICY "System can manage agent_memory_enhanced" ON public.agent_memory_enhanced FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage knowledge_base" ON public.knowledge_base FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "System can manage conversation_quality" ON public.conversation_quality FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage user_behavior_patterns" ON public.user_behavior_patterns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can view agent_performance_metrics" ON public.agent_performance_metrics FOR SELECT USING (is_admin());
CREATE POLICY "System can manage circuit_breakers" ON public.circuit_breakers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage content_safety_rules" ON public.content_safety_rules FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Indexes for performance
CREATE INDEX idx_agent_memory_enhanced_user_id ON public.agent_memory_enhanced(user_id);
CREATE INDEX idx_agent_memory_enhanced_memory_type ON public.agent_memory_enhanced(memory_type);
CREATE INDEX idx_knowledge_base_vector_embedding ON public.knowledge_base USING ivfflat (vector_embedding vector_cosine_ops);
CREATE INDEX idx_conversation_quality_phone ON public.conversation_quality(phone_number);
CREATE INDEX idx_user_behavior_patterns_user_id ON public.user_behavior_patterns(user_id);
CREATE INDEX idx_agent_performance_metrics_agent_timestamp ON public.agent_performance_metrics(agent_id, timestamp);

-- Functions for enhanced memory management
CREATE OR REPLACE FUNCTION update_agent_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_memory_enhanced_timestamp
  BEFORE UPDATE ON public.agent_memory_enhanced
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();