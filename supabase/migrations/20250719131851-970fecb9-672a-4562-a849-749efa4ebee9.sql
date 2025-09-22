-- ===============================================
-- easyMO Unified Ordering System - Part 2g: RLS Policies Only
-- ===============================================

-- RLS Policies for carts (admin and system access)
CREATE POLICY "Admin can manage all carts" ON carts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage carts" ON carts
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for cart_items
CREATE POLICY "Admin can manage cart items" ON cart_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage cart items" ON cart_items
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for deliveries
CREATE POLICY "Admin can manage deliveries" ON deliveries
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage deliveries" ON deliveries
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for contacts
CREATE POLICY "Admin can manage contacts" ON contacts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);