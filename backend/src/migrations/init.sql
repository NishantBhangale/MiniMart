-- MiniMart schema
-- Postgres is the durable source of truth. Redis handles live stock counters,
-- cart TTLs, and sessions — never persistent state.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'confirmed',
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed catalog
INSERT INTO products (sku, name, description, price_cents, image_url, category, stock)
VALUES
  ('MM-001', 'Ceramic Pour-Over Kit', 'Slow-brew ceramic dripper with reusable filter.', 3400, 'https://images.unsplash.com/photo-1523904394201-6a5c5b1a6c3d', 'Kitchen', 24),
  ('MM-002', 'Canvas Utility Apron', 'Waxed canvas, brass hardware, one size.', 4200, 'https://images.unsplash.com/photo-1585909695284-32d2985ac9c0', 'Home', 15),
  ('MM-003', 'Enamel Storage Tin Set', 'Set of 3 stacking tins for pantry staples.', 2800, 'https://images.unsplash.com/photo-1584736286279-5d85e6b408e0', 'Kitchen', 40),
  ('MM-004', 'Oak Cutting Board', 'End-grain oak, food-safe finish.', 5600, 'https://images.unsplash.com/photo-1594736797933-d0a9ba5fe4f6', 'Kitchen', 8),
  ('MM-005', 'Linen Market Tote', 'Heavyweight linen, leather straps.', 2200, 'https://images.unsplash.com/photo-1591561954557-26941169b49e', 'Home', 30),
  ('MM-006', 'Cast Iron Skillet 10in', 'Pre-seasoned, made for daily use.', 3900, 'https://images.unsplash.com/photo-1620626011761-996317b8d101', 'Kitchen', 3),
  ('MM-007', 'Wool Throw Blanket', 'Merino wool, woven in small batches.', 6800, 'https://images.unsplash.com/photo-1580301762395-83f9b0b4b6f4', 'Home', 12),
  ('MM-008', 'Glass Pour Bottles (2pk)', 'Borosilicate glass with cork stoppers.', 1900, 'https://images.unsplash.com/photo-1602166242292-8d3a1c5b6c3f', 'Kitchen', 50)
ON CONFLICT (sku) DO NOTHING;
