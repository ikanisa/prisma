-- Create table to store multi-AI code review results
CREATE TABLE IF NOT EXISTS public.code_review_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_responses JSONB NOT NULL DEFAULT '[]',
  consolidated_issues JSONB NOT NULL DEFAULT '[]',
  overall_score INTEGER NOT NULL DEFAULT 0,
  project_analysis JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.code_review_results ENABLE ROW LEVEL SECURITY;

-- Create policy for system access
CREATE POLICY "System can manage code review results" 
ON public.code_review_results
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create table for automated code quality monitoring
CREATE TABLE IF NOT EXISTS public.code_quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  file_path TEXT,
  measurement_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ai_model TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.code_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for system access
CREATE POLICY "System can manage quality metrics" 
ON public.code_quality_metrics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to trigger automated reviews
CREATE OR REPLACE FUNCTION trigger_automated_review()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function can be called by cron jobs to trigger reviews
  PERFORM net.http_post(
    url := 'https://ijblirphkrrsnxazohwt.functions.supabase.co/multi-ai-code-reviewer',
    body := '{"action": "full_review", "files": []}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END;
$$;