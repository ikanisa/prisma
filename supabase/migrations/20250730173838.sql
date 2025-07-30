-- Phase 4: Marketing Template Strategy Infrastructure

-- Create marketing campaigns table
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  segment_criteria JSONB NOT NULL DEFAULT '{}',
  timing_config JSONB NOT NULL DEFAULT '{}', -- scheduling, frequency, etc.
  csat_threshold NUMERIC DEFAULT 3.5, -- minimum CSAT score to send
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing campaigns
CREATE POLICY "Admin can manage marketing campaigns" 
ON public.marketing_campaigns 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Create user segments table
CREATE TABLE public.user_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  segment_sql TEXT NOT NULL, -- SQL query to identify users in segment
  criteria JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  user_count INTEGER DEFAULT 0,
  last_refresh_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;

-- RLS policies for user segments
CREATE POLICY "Admin can manage user segments" 
ON public.user_segments 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Create CSAT scores table
CREATE TABLE public.csat_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  feedback_text TEXT,
  context_type TEXT, -- 'conversation', 'transaction', 'support'
  context_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  agent_id UUID,
  campaign_id UUID
);

-- Enable RLS
ALTER TABLE public.csat_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for CSAT scores
CREATE POLICY "System can manage CSAT scores" 
ON public.csat_scores 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create marketing send log table
CREATE TABLE public.marketing_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.marketing_campaigns(id),
  phone_number TEXT NOT NULL,
  template_name TEXT NOT NULL,
  segment_id UUID REFERENCES public.user_segments(id),
  user_csat_score NUMERIC,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed', 'responded')),
  error_details TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.marketing_send_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing send log
CREATE POLICY "System can manage marketing send log" 
ON public.marketing_send_log 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create frequency controls table
CREATE TABLE public.marketing_frequency_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  daily_limit INTEGER DEFAULT 2,
  weekly_limit INTEGER DEFAULT 5,
  monthly_limit INTEGER DEFAULT 15,
  daily_count INTEGER DEFAULT 0,
  weekly_count INTEGER DEFAULT 0,
  monthly_count INTEGER DEFAULT 0,
  last_reset_daily DATE DEFAULT CURRENT_DATE,
  last_reset_weekly DATE DEFAULT CURRENT_DATE,
  last_reset_monthly DATE DEFAULT CURRENT_DATE,
  opt_out_at TIMESTAMP WITH TIME ZONE,
  is_opted_out BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone_number, campaign_type)
);

-- Enable RLS
ALTER TABLE public.marketing_frequency_controls ENABLE ROW LEVEL SECURITY;

-- RLS policies for frequency controls
CREATE POLICY "System can manage frequency controls" 
ON public.marketing_frequency_controls 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_timing ON public.marketing_campaigns(starts_at, ends_at);
CREATE INDEX idx_user_segments_active ON public.user_segments(is_active);
CREATE INDEX idx_csat_scores_phone_date ON public.csat_scores(phone_number, created_at DESC);
CREATE INDEX idx_csat_scores_score ON public.csat_scores(score);
CREATE INDEX idx_marketing_send_log_scheduled ON public.marketing_send_log(scheduled_for, status);
CREATE INDEX idx_marketing_send_log_phone ON public.marketing_send_log(phone_number);
CREATE INDEX idx_frequency_controls_phone ON public.marketing_frequency_controls(phone_number);

-- Create function to get user's average CSAT score
CREATE OR REPLACE FUNCTION public.get_user_avg_csat(user_phone TEXT, days_back INTEGER DEFAULT 30)
RETURNS NUMERIC AS $$
DECLARE
  avg_score NUMERIC;
BEGIN
  SELECT AVG(score) INTO avg_score
  FROM public.csat_scores
  WHERE phone_number = user_phone
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL;
  
  RETURN COALESCE(avg_score, 3.0); -- Default to neutral if no scores
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check marketing frequency limits
CREATE OR REPLACE FUNCTION public.check_marketing_frequency(
  user_phone TEXT,
  campaign_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  controls RECORD;
  can_send BOOLEAN := true;
BEGIN
  -- Get or create frequency controls for this user/campaign type
  INSERT INTO public.marketing_frequency_controls (phone_number, campaign_type)
  VALUES (user_phone, campaign_type)
  ON CONFLICT (phone_number, campaign_type) DO NOTHING;
  
  -- Get current controls
  SELECT * INTO controls
  FROM public.marketing_frequency_controls
  WHERE phone_number = user_phone AND campaign_type = campaign_type;
  
  -- Check if opted out
  IF controls.is_opted_out THEN
    RETURN false;
  END IF;
  
  -- Reset counters if needed
  IF controls.last_reset_daily < CURRENT_DATE THEN
    UPDATE public.marketing_frequency_controls
    SET daily_count = 0, last_reset_daily = CURRENT_DATE
    WHERE phone_number = user_phone AND campaign_type = campaign_type;
    controls.daily_count := 0;
  END IF;
  
  IF controls.last_reset_weekly < CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER THEN
    UPDATE public.marketing_frequency_controls
    SET weekly_count = 0, last_reset_weekly = CURRENT_DATE
    WHERE phone_number = user_phone AND campaign_type = campaign_type;
    controls.weekly_count := 0;
  END IF;
  
  IF controls.last_reset_monthly < DATE_TRUNC('month', CURRENT_DATE)::DATE THEN
    UPDATE public.marketing_frequency_controls
    SET monthly_count = 0, last_reset_monthly = CURRENT_DATE
    WHERE phone_number = user_phone AND campaign_type = campaign_type;
    controls.monthly_count := 0;
  END IF;
  
  -- Check limits
  IF controls.daily_count >= controls.daily_limit OR
     controls.weekly_count >= controls.weekly_limit OR
     controls.monthly_count >= controls.monthly_limit THEN
    can_send := false;
  END IF;
  
  RETURN can_send;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment marketing frequency counters
CREATE OR REPLACE FUNCTION public.increment_marketing_frequency(
  user_phone TEXT,
  campaign_type TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.marketing_frequency_controls
  SET 
    daily_count = daily_count + 1,
    weekly_count = weekly_count + 1,
    monthly_count = monthly_count + 1,
    updated_at = NOW()
  WHERE phone_number = user_phone AND campaign_type = campaign_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;