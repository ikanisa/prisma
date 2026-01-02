-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS trg_engagements_touch ON engagements;
-- Update existing engagements table to match schema (add missing columns)
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS year int;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS frf text;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS eqr_required boolean DEFAULT false;
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS materiality_set_id uuid;
-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_engagements_touch ON engagements CASCADE;
DROP TRIGGER IF EXISTS trg_engagements_touch ON app CASCADE;
CREATE TRIGGER trg_engagements_touch.touch_updated_at();
-- Update the kams table to use ref_links instead of references
ALTER TABLE kams DROP COLUMN IF EXISTS "references";
ALTER TABLE kams ADD COLUMN IF NOT EXISTS ref_links jsonb;
