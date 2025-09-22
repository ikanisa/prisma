-- Create stress test results table
CREATE TABLE public.stress_test_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id uuid NOT NULL UNIQUE,
  config jsonb NOT NULL,
  results jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stress_test_results ENABLE ROW LEVEL SECURITY;

-- Admin can manage all stress test results
CREATE POLICY "Admin can manage stress_test_results" 
ON public.stress_test_results 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Create index for performance
CREATE INDEX idx_stress_test_results_created_at ON public.stress_test_results(created_at);
CREATE INDEX idx_stress_test_results_test_id ON public.stress_test_results(test_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stress_test_results;