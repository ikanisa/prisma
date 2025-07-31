-- ===============================================
-- easyMO Unified Ordering System - Part 1: Enum Updates
-- ===============================================

-- Update the existing business_type enum to include all categories
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'produce';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'pharmacy';  
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'bar';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'hardware';