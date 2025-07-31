-- Phase 1: Schema Alignment for Contact & Conversation Bootstrap (Fixed)

-- Add missing columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS wa_id text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- Create unique index on wa_id for upserts
CREATE UNIQUE INDEX IF NOT EXISTS contacts_wa_id_unique ON public.contacts(wa_id);

-- Add missing columns to conversations table  
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone DEFAULT now();

-- Create index for conversation lookups (after column is added)
CREATE INDEX IF NOT EXISTS conversations_contact_id_started_at_idx ON public.conversations(contact_id, started_at DESC);