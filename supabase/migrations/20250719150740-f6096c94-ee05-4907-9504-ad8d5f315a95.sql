-- Create QA test scenarios table
CREATE TABLE IF NOT EXISTS qa_test_scenarios (
  id text PRIMARY KEY,
  scenario_name text NOT NULL,
  description text,
  test_steps text[],
  expected_result text,
  priority text CHECK (priority IN ('low','medium','high')),
  pilot_location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on QA table
ALTER TABLE qa_test_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage QA scenarios" 
ON qa_test_scenarios FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create WhatsApp templates table for hardware vendors
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  category text DEFAULT 'hardware',
  language text DEFAULT 'en',
  template_content text NOT NULL,
  variables text[],
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage WhatsApp templates" 
ON whatsapp_templates FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());