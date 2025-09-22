-- ────────────────────────────────────────────────────────────
--  1.  Add gdrive support columns
-- ────────────────────────────────────────────────────────────
alter table public.agent_documents
  add column drive_file_id text,
  add column drive_mime    text;

-- ────────────────────────────────────────────────────────────
--  2.  Extend enum value for learning
-- ────────────────────────────────────────────────────────────
-- First check if the type exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
        CREATE TYPE public.source_type AS ENUM ('manual', 'upload', 'url', 'gdrive');
    ELSE
        -- Add value if it doesn't exist
        BEGIN
            ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'gdrive';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END$$;