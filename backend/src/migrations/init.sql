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
('MM-001', 'Ceramic Pour-Over Kit', 'Slow-brew ceramic dripper with reusable filter.', 3400, 'https://images.unsplash.com/photo-1758221052634-33f352d1318b?w=800&auto=format&fit=crop', 'Kitchen', 24),
('MM-002', 'Canvas Utility Apron', 'Waxed canvas, brass hardware, one size.', 4200, 'https://images.unsplash.com/photo-1732565649629-eb4932a1ec09?w=800&auto=format&fit=crop', 'Home', 15),
('MM-003', 'Enamel Storage Tin Set', 'Set of 3 stacking tins for pantry staples.', 2800, 'https://images.unsplash.com/photo-1776219189350-728ddf739d6d?w=800&auto=format&fit=crop', 'Kitchen', 40),
('MM-004', 'Oak Cutting Board', 'End-grain oak, food-safe finish.', 5600, 'https://images.unsplash.com/photo-1721934081906-a92cdc010b75?w=800&auto=format&fit=crop', 'Kitchen', 8),
('MM-005', 'Linen Market Tote', 'Heavyweight linen, leather straps.', 2200, 'https://images.unsplash.com/photo-1535981444082-2a5dc0548ef3?w=800&auto=format&fit=crop', 'Home', 30),
('MM-006', 'Cast Iron Skillet 10in', 'Pre-seasoned, made for daily use.', 3900, 'https://images.unsplash.com/photo-1483737778139-63dff4421d43?w=800&auto=format&fit=crop', 'Kitchen', 3),
('MM-007', 'Wool Throw Blanket', 'Merino wool, woven in small batches.', 6800, 'https://images.unsplash.com/photo-1637819976869-928427bd7380?w=800&auto=format&fit=crop', 'Home', 12),
('MM-008', 'Glass Pour Bottles (2pk)', 'Borosilicate glass with cork stoppers.', 1900, 'https://images.unsplash.com/photo-1515879128292-964efc3ebb25?w=800&auto=format&fit=crop', 'Kitchen', 50)
ON CONFLICT (sku) DO NOTHING;
