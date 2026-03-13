-- SQL script to patch the product_id type mismatch in the Wishlists table
-- Phase 25 Bug Fix

-- 1. Drop the unique constraint first since it depends on product_id
ALTER TABLE public.wishlists DROP CONSTRAINT IF EXISTS unique_user_product;

-- 2. Alter the product_id column type from UUID to TEXT
-- Since there might be data, use USING to cast it, though it should be empty if all inserts failed
ALTER TABLE public.wishlists ALTER COLUMN product_id TYPE TEXT USING product_id::TEXT;

-- 3. Re-apply the unique constraint
ALTER TABLE public.wishlists ADD CONSTRAINT unique_user_product UNIQUE (user_id, product_id, product_type);
