-- Add missing business types to the enum (must be in separate transaction)
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'hardware';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'salon';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'cosmetics';