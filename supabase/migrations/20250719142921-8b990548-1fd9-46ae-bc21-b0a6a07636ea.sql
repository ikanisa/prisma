-- Bar Patron System Schema Migration

-- Create bar_patrons table
CREATE TABLE public.bar_patrons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp TEXT UNIQUE NOT NULL,
  first_seen TIMESTAMPTZ DEFAULT now(),
  preferred_lang TEXT DEFAULT 'rw'
);

-- Create bar_tabs table
CREATE TABLE public.bar_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  patron_id UUID REFERENCES public.bar_patrons(id) ON DELETE CASCADE,
  table_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('open','pending_payment','closed','cancelled')) DEFAULT 'open',
  subtotal INTEGER DEFAULT 0,
  tip INTEGER DEFAULT 0,
  total INTEGER GENERATED ALWAYS AS (subtotal + tip) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Create tab_items table
CREATE TABLE public.tab_items (
  id BIGSERIAL PRIMARY KEY,
  tab_id UUID REFERENCES public.bar_tabs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing','served','cancelled')),
  served_at TIMESTAMPTZ
);

-- Create split_payments table
CREATE TABLE public.split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID REFERENCES public.bar_tabs(id) ON DELETE CASCADE,
  whatsapp TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  momo_ref TEXT,
  paid_at TIMESTAMPTZ
);

-- Create bar_feedback table for ratings
CREATE TABLE public.bar_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID REFERENCES public.bar_tabs(id) ON DELETE CASCADE,
  patron_id UUID REFERENCES public.bar_patrons(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bar_patrons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_feedback ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check bar staff role
CREATE OR REPLACE FUNCTION public.is_bar_staff(bar_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has bar_staff role for this specific bar
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.businesses b ON b.owner_user_id = auth.uid()
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'bar_staff'
    AND b.id = bar_id
  ) OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies for bar_patrons
CREATE POLICY "Bar patrons can view own profile"
  ON public.bar_patrons FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Bar patrons can update own profile"
  ON public.bar_patrons FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can manage bar patrons"
  ON public.bar_patrons FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for bar_tabs
CREATE POLICY "Patrons can view own tabs"
  ON public.bar_tabs FOR SELECT
  USING (patron_id IN (SELECT id FROM public.bar_patrons WHERE user_id = auth.uid()));

CREATE POLICY "Bar staff can view bar tabs"
  ON public.bar_tabs FOR SELECT
  USING (public.is_bar_staff(bar_id));

CREATE POLICY "Bar staff can manage bar tabs"
  ON public.bar_tabs FOR ALL
  USING (public.is_bar_staff(bar_id))
  WITH CHECK (public.is_bar_staff(bar_id));

CREATE POLICY "System can manage bar tabs"
  ON public.bar_tabs FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for tab_items
CREATE POLICY "Patrons can view own tab items"
  ON public.tab_items FOR SELECT
  USING (tab_id IN (
    SELECT bt.id FROM public.bar_tabs bt
    JOIN public.bar_patrons bp ON bt.patron_id = bp.id
    WHERE bp.user_id = auth.uid()
  ));

CREATE POLICY "Bar staff can manage tab items"
  ON public.tab_items FOR ALL
  USING (tab_id IN (
    SELECT id FROM public.bar_tabs WHERE public.is_bar_staff(bar_id)
  ))
  WITH CHECK (tab_id IN (
    SELECT id FROM public.bar_tabs WHERE public.is_bar_staff(bar_id)
  ));

CREATE POLICY "System can manage tab items"
  ON public.tab_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for split_payments
CREATE POLICY "Users can view own split payments"
  ON public.split_payments FOR SELECT
  USING (tab_id IN (
    SELECT bt.id FROM public.bar_tabs bt
    JOIN public.bar_patrons bp ON bt.patron_id = bp.id
    WHERE bp.user_id = auth.uid()
  ));

CREATE POLICY "Bar staff can view split payments"
  ON public.split_payments FOR SELECT
  USING (tab_id IN (
    SELECT id FROM public.bar_tabs WHERE public.is_bar_staff(bar_id)
  ));

CREATE POLICY "System can manage split payments"
  ON public.split_payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for bar_feedback
CREATE POLICY "Patrons can manage own feedback"
  ON public.bar_feedback FOR ALL
  USING (patron_id IN (SELECT id FROM public.bar_patrons WHERE user_id = auth.uid()))
  WITH CHECK (patron_id IN (SELECT id FROM public.bar_patrons WHERE user_id = auth.uid()));

CREATE POLICY "Bar staff can view feedback"
  ON public.bar_feedback FOR SELECT
  USING (tab_id IN (
    SELECT id FROM public.bar_tabs WHERE public.is_bar_staff(bar_id)
  ));

CREATE POLICY "System can manage feedback"
  ON public.bar_feedback FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_bar_patrons_whatsapp ON public.bar_patrons(whatsapp);
CREATE INDEX idx_bar_patrons_user_id ON public.bar_patrons(user_id);
CREATE INDEX idx_bar_tabs_bar_id ON public.bar_tabs(bar_id);
CREATE INDEX idx_bar_tabs_patron_id ON public.bar_tabs(patron_id);
CREATE INDEX idx_bar_tabs_status ON public.bar_tabs(status);
CREATE INDEX idx_bar_tabs_table_code ON public.bar_tabs(table_code);
CREATE INDEX idx_tab_items_tab_id ON public.tab_items(tab_id);
CREATE INDEX idx_tab_items_status ON public.tab_items(status);
CREATE INDEX idx_split_payments_tab_id ON public.split_payments(tab_id);
CREATE INDEX idx_split_payments_status ON public.split_payments(status);

-- Create trigger to update tab subtotal when items change
CREATE OR REPLACE FUNCTION public.update_tab_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.bar_tabs 
  SET subtotal = (
    SELECT COALESCE(SUM(qty * unit_price), 0)
    FROM public.tab_items 
    WHERE tab_id = COALESCE(NEW.tab_id, OLD.tab_id)
    AND status != 'cancelled'
  )
  WHERE id = COALESCE(NEW.tab_id, OLD.tab_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tab_subtotal_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tab_items
  FOR EACH ROW EXECUTE FUNCTION public.update_tab_subtotal();

-- Function to close tab when all split payments are paid
CREATE OR REPLACE FUNCTION public.check_tab_payment_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- If this split payment is now paid, check if all splits for this tab are paid
  IF NEW.status = 'paid' THEN
    -- Check if all split payments for this tab are paid
    IF NOT EXISTS (
      SELECT 1 FROM public.split_payments 
      WHERE tab_id = NEW.tab_id AND status != 'paid'
    ) THEN
      -- All splits paid, close the tab
      UPDATE public.bar_tabs 
      SET status = 'closed', closed_at = now()
      WHERE id = NEW.tab_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_tab_payment_complete_trigger
  AFTER UPDATE ON public.split_payments
  FOR EACH ROW EXECUTE FUNCTION public.check_tab_payment_complete();