-- Real Estate & Vehicles Schema Migration

-- Property types and statuses
CREATE TYPE property_status AS ENUM ('draft', 'published', 'archived', 'pending');
CREATE TYPE property_action AS ENUM ('rent', 'sale');

-- Vehicle types and statuses  
CREATE TYPE vehicle_status AS ENUM ('draft', 'published', 'archived', 'pending');
CREATE TYPE vehicle_action AS ENUM ('rent', 'sale');

-- Properties table
CREATE TABLE public.tbl_properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_phone text NOT NULL,
    title text NOT NULL,
    description text,
    action property_action NOT NULL,
    price_month numeric,  -- for rent
    price_total numeric,  -- for sale
    currency text DEFAULT 'RWF',
    district text,
    sector text,
    bedrooms integer,
    bathrooms integer,
    furnished boolean DEFAULT false,
    imgs text[] DEFAULT '{}',
    status property_status DEFAULT 'draft',
    vector_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Vehicles table
CREATE TABLE public.tbl_vehicles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_phone text NOT NULL,
    title text NOT NULL,
    description text,
    action vehicle_action NOT NULL,
    daily_rate numeric,  -- for rent
    sale_price numeric,  -- for sale
    currency text DEFAULT 'RWF',
    make text,
    model text,
    year integer,
    transmission text,  -- Auto/Manual
    fuel_type text,
    mileage_km integer,
    imgs text[] DEFAULT '{}',
    status vehicle_status DEFAULT 'draft',
    vector_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Listing reviews for moderation
CREATE TABLE public.tbl_listing_reviews (
    id bigserial PRIMARY KEY,
    listing_id uuid NOT NULL,
    listing_type text NOT NULL CHECK (listing_type IN ('property', 'vehicle')),
    reviewer_id uuid,
    decision text CHECK (decision IN ('approved', 'rejected', 'needs_fix')),
    notes text,
    decided_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tbl_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tbl_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tbl_listing_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Properties
CREATE POLICY "Owners can manage their properties"
ON public.tbl_properties
FOR ALL
USING (owner_phone = auth.jwt() ->> 'phone')
WITH CHECK (owner_phone = auth.jwt() ->> 'phone');

CREATE POLICY "Admin can manage all properties"
ON public.tbl_properties
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Public can view published properties"
ON public.tbl_properties
FOR SELECT
USING (status = 'published');

-- RLS Policies for Vehicles
CREATE POLICY "Owners can manage their vehicles"
ON public.tbl_vehicles
FOR ALL
USING (owner_phone = auth.jwt() ->> 'phone')
WITH CHECK (owner_phone = auth.jwt() ->> 'phone');

CREATE POLICY "Admin can manage all vehicles"
ON public.tbl_vehicles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Public can view published vehicles"
ON public.tbl_vehicles
FOR SELECT
USING (status = 'published');

-- RLS Policies for Reviews
CREATE POLICY "Admin can manage all reviews"
ON public.tbl_listing_reviews
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "System can create reviews"
ON public.tbl_listing_reviews
FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_properties_status ON public.tbl_properties(status);
CREATE INDEX idx_properties_district ON public.tbl_properties(district);
CREATE INDEX idx_properties_action ON public.tbl_properties(action);
CREATE INDEX idx_properties_owner_phone ON public.tbl_properties(owner_phone);

CREATE INDEX idx_vehicles_status ON public.tbl_vehicles(status);
CREATE INDEX idx_vehicles_make_model ON public.tbl_vehicles(make, model);
CREATE INDEX idx_vehicles_action ON public.tbl_vehicles(action);
CREATE INDEX idx_vehicles_owner_phone ON public.tbl_vehicles(owner_phone);

CREATE INDEX idx_listing_reviews_listing ON public.tbl_listing_reviews(listing_id, listing_type);

-- Create storage bucket for listing media
INSERT INTO storage.buckets (id, name, public) VALUES ('listings_media', 'listings_media', true);

-- Storage policies for listing media
CREATE POLICY "Public can view listing media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'listings_media');

CREATE POLICY "Authenticated can upload listing media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'listings_media' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can manage their listing media"
ON storage.objects
FOR ALL
USING (bucket_id = 'listings_media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin can manage all listing media"
ON storage.objects
FOR ALL
USING (bucket_id = 'listings_media' AND is_admin());