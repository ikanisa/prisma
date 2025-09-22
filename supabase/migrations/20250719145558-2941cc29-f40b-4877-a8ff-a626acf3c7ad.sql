-- Hardware vendor system database schema extensions
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category text DEFAULT 'hardware';

-- Create product versions for price tracking
CREATE TABLE IF NOT EXISTS product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  old_price numeric,
  new_price numeric,
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz DEFAULT now()
);

-- Add vendor_id to carts if not exists
ALTER TABLE carts ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES businesses(id);

-- Create products table if not exists for hardware items
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric,
  stock_quantity integer DEFAULT 0,
  unit text,
  category text,
  vendor_id uuid REFERENCES businesses(id),
  sku text,
  image_url text,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products_draft for import staging
CREATE TABLE IF NOT EXISTS products_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES businesses(id),
  name text,
  price numeric,
  stock_quantity integer DEFAULT 0,
  unit text,
  category text,
  sku text,
  image_url text,
  import_batch_id uuid,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_draft ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_versions
CREATE POLICY "System can manage product_versions" 
ON product_versions FOR ALL 
WITH CHECK (true);

-- RLS policies for products
CREATE POLICY "Admin can manage all products" 
ON products FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "System can manage products" 
ON products FOR ALL 
WITH CHECK (true);

-- RLS policies for products_draft
CREATE POLICY "Admin can manage all product_drafts" 
ON products_draft FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "System can manage product_drafts" 
ON products_draft FOR ALL 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_versions_product_id ON product_versions(product_id);
CREATE INDEX IF NOT EXISTS idx_products_draft_vendor_id ON products_draft(vendor_id);