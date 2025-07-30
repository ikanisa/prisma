-- Phase 3: Add template_eligible column to action_buttons
ALTER TABLE action_buttons ADD COLUMN IF NOT EXISTS template_eligible BOOLEAN DEFAULT true;