-- Create user roles system first
CREATE TYPE public.app_role AS ENUM ('admin', 'pharmacist', 'driver', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admin function for checking if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Now create pharmacy tables
CREATE TABLE public.pharmacy_shoppers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT,
  whatsapp_number TEXT UNIQUE,
  preferred_lang TEXT DEFAULT 'rw',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pharmacy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id UUID REFERENCES pharmacy_shoppers(id),
  total_amount INTEGER,
  delivery_fee INTEGER,
  status TEXT CHECK (status IN ('draft','pending_payment','paid','preparing','out_for_delivery','delivered','cancelled')),
  delivery_address TEXT,
  delivery_eta TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pharmacy_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES pharmacy_orders(id),
  product_id UUID REFERENCES products(id),
  qty INTEGER,
  unit_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.prescription_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id UUID REFERENCES pharmacy_shoppers(id),
  order_id UUID REFERENCES pharmacy_orders(id),
  storage_path TEXT,
  ocr_text TEXT,
  detected_items JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.shopper_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id UUID REFERENCES pharmacy_shoppers(id),
  promo_code TEXT,
  redeemed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pharmacy_shoppers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopper_promos ENABLE ROW LEVEL SECURITY;

-- RLS Policies using security definer functions
CREATE POLICY "Shoppers can view own profile" ON pharmacy_shoppers
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage shoppers" ON pharmacy_shoppers
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Pharmacists can view all shoppers" ON pharmacy_shoppers
FOR SELECT USING (public.has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Shoppers can view own orders" ON pharmacy_orders
FOR SELECT USING (shopper_id IN (SELECT id FROM pharmacy_shoppers WHERE user_id = auth.uid()));

CREATE POLICY "System can manage orders" ON pharmacy_orders
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Pharmacists can view all orders" ON pharmacy_orders
FOR SELECT USING (public.has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Shoppers can view own order items" ON pharmacy_order_items
FOR SELECT USING (order_id IN (
  SELECT id FROM pharmacy_orders WHERE shopper_id IN (
    SELECT id FROM pharmacy_shoppers WHERE user_id = auth.uid()
  )
));

CREATE POLICY "System can manage order items" ON pharmacy_order_items
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Pharmacists can view all order items" ON pharmacy_order_items
FOR SELECT USING (public.has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Shoppers can view own prescriptions" ON prescription_images
FOR SELECT USING (shopper_id IN (SELECT id FROM pharmacy_shoppers WHERE user_id = auth.uid()));

CREATE POLICY "System can manage prescriptions" ON prescription_images
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Pharmacists can view all prescriptions" ON prescription_images
FOR SELECT USING (public.has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Shoppers can view own promos" ON shopper_promos
FOR SELECT USING (shopper_id IN (SELECT id FROM pharmacy_shoppers WHERE user_id = auth.uid()));

CREATE POLICY "System can manage promos" ON shopper_promos
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Pharmacists can manage promos" ON shopper_promos
FOR ALL USING (public.has_role(auth.uid(), 'pharmacist'::app_role));

-- Indexes
CREATE INDEX idx_pharmacy_shoppers_user_id ON pharmacy_shoppers(user_id);
CREATE INDEX idx_pharmacy_shoppers_whatsapp ON pharmacy_shoppers(whatsapp_number);
CREATE INDEX idx_pharmacy_orders_shopper_id ON pharmacy_orders(shopper_id);
CREATE INDEX idx_pharmacy_orders_status ON pharmacy_orders(status);
CREATE INDEX idx_pharmacy_orders_created_at ON pharmacy_orders(created_at);
CREATE INDEX idx_pharmacy_order_items_order_id ON pharmacy_order_items(order_id);
CREATE INDEX idx_pharmacy_order_items_product_id ON pharmacy_order_items(product_id);
CREATE INDEX idx_prescription_images_shopper_id ON prescription_images(shopper_id);
CREATE INDEX idx_prescription_images_order_id ON prescription_images(order_id);
CREATE INDEX idx_shopper_promos_shopper_id ON shopper_promos(shopper_id);
CREATE INDEX idx_shopper_promos_code ON shopper_promos(promo_code);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pharmacy_shoppers_updated_at
  BEFORE UPDATE ON pharmacy_shoppers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pharmacy_orders_updated_at
  BEFORE UPDATE ON pharmacy_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pharmacy_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE pharmacy_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE prescription_images;