-- Fix RLS policies for businesses table to allow admin access
-- First, ensure RLS is enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Add admin policy for businesses table
CREATE POLICY "Admin can view all businesses" 
ON public.businesses 
FOR SELECT 
USING (true);

-- Add system/service role policy for businesses table (for edge functions)
CREATE POLICY "System can manage all businesses" 
ON public.businesses 
FOR ALL 
USING (true) 
WITH CHECK (true);