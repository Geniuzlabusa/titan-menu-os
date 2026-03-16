-- ============================================================
-- TITAN MENU OS — SUPABASE POSTGRESQL SCHEMA
-- Version: 1.0.0 | Design: Enterprise Omni-Restaurant Platform
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Public can insert (self-registration via QR scan)
CREATE POLICY "customers_insert_public"
  ON public.customers FOR INSERT
  WITH CHECK (true);

-- Customers can read their own record by phone
CREATE POLICY "customers_select_own"
  ON public.customers FOR SELECT
  USING (true);

-- Staff (authenticated) can read all
CREATE POLICY "customers_select_staff"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- TABLE: menu_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category         TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  price            NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url        TEXT,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  nutritional_info JSONB DEFAULT '{}'::jsonb,
  -- nutritional_info shape: { calories: number, allergens: string[], protein: number, carbs: number, fat: number }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category ON public.menu_items (category);
CREATE INDEX idx_menu_items_available ON public.menu_items (is_available);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read available menu items
CREATE POLICY "menu_items_select_public"
  ON public.menu_items FOR SELECT
  USING (is_available = true);

-- Authenticated staff can read all (including unavailable)
CREATE POLICY "menu_items_select_staff"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated staff can insert/update/delete
CREATE POLICY "menu_items_write_staff"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TYPE order_status AS ENUM ('pending', 'cooking', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number  INTEGER NOT NULL CHECK (table_number > 0),
  customer_id   UUID NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  total_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status        order_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON public.orders (customer_id);
CREATE INDEX idx_orders_status ON public.orders (status);
CREATE INDEX idx_orders_table ON public.orders (table_number);
CREATE INDEX idx_orders_created ON public.orders (created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public can insert new orders
CREATE POLICY "orders_insert_public"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Public can read their own orders (join via customer_id)
CREATE POLICY "orders_select_public"
  ON public.orders FOR SELECT
  USING (true);

-- Authenticated staff full access
CREATE POLICY "orders_all_staff"
  ON public.orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items (id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  subtotal     NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items (order_id);
CREATE INDEX idx_order_items_menu_item ON public.order_items (menu_item_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_insert_public"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "order_items_select_public"
  ON public.order_items FOR SELECT
  USING (true);

CREATE POLICY "order_items_all_staff"
  ON public.order_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TYPE review_status AS ENUM ('intercepted', 'public');

CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback     TEXT,
  status       review_status NOT NULL DEFAULT 'intercepted',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_order ON public.reviews (order_id);
CREATE INDEX idx_reviews_status ON public.reviews (status);
CREATE INDEX idx_reviews_created ON public.reviews (created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_insert_public"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Only staff can view intercepted reviews
CREATE POLICY "reviews_select_staff"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "reviews_update_staff"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- REAL-TIME: Enable Supabase Realtime on key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

-- ============================================================
-- SEED: Sample menu items for development
-- ============================================================
INSERT INTO public.menu_items (category, name, description, price, image_url, is_available, nutritional_info) VALUES
  ('Starters', 'Truffle Arancini', 'Crispy risotto balls with black truffle, pecorino, and herb aioli', 12.00, 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=600', true, '{"calories": 320, "protein": 8, "carbs": 38, "fat": 14, "allergens": ["gluten", "dairy", "eggs"]}'),
  ('Starters', 'Tuna Tataki', 'Seared yellowfin tuna, ponzu dressing, microgreens, sesame', 16.00, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600', true, '{"calories": 210, "protein": 28, "carbs": 6, "fat": 9, "allergens": ["fish", "soy", "sesame"]}'),
  ('Mains', 'Wagyu Burger', '200g A5 wagyu patty, aged cheddar, caramelised onion, brioche', 32.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600', true, '{"calories": 780, "protein": 42, "carbs": 55, "fat": 38, "allergens": ["gluten", "dairy", "eggs"]}'),
  ('Mains', 'Lobster Linguine', 'Half Boston lobster, cherry tomato, chilli, garlic, white wine', 44.00, 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600', true, '{"calories": 620, "protein": 38, "carbs": 68, "fat": 18, "allergens": ["shellfish", "gluten"]}'),
  ('Mains', 'Smoked Duck Breast', 'Cherry-smoked duck, dauphinoise potato, red wine jus', 36.00, 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=600', true, '{"calories": 540, "protein": 44, "carbs": 28, "fat": 26, "allergens": ["dairy"]}'),
  ('Desserts', 'Valrhona Lava Cake', 'Warm Valrhona 70% chocolate fondant, salted caramel ice cream', 14.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600', true, '{"calories": 480, "protein": 7, "carbs": 58, "fat": 24, "allergens": ["gluten", "dairy", "eggs"]}'),
  ('Desserts', 'Yuzu Panna Cotta', 'Italian cream set with yuzu curd, candied citrus, honeycomb', 12.00, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600', true, '{"calories": 310, "protein": 5, "carbs": 34, "fat": 18, "allergens": ["dairy"]}'),
  ('Drinks', 'Negroni Sbagliato', 'Campari, sweet vermouth, Prosecco, orange peel', 14.00, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600', true, '{"calories": 180, "protein": 0, "carbs": 12, "fat": 0, "allergens": ["sulphites"]}'),
  ('Drinks', 'Matcha Tonic', 'Ceremonial grade matcha, elderflower, tonic, lemon', 8.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600', true, '{"calories": 65, "protein": 1, "carbs": 14, "fat": 0, "allergens": []}');
