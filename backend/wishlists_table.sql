-- SQL script to create the database for the Customer Wishlist feature
-- Phase 25: Customer Wishlist & Save For Later

-- 1. Create the new wishlists table
-- (Using TEXT for product_id because "Customized" products use string IDs like 'custom-normal' 
-- rather than strict UUIDs. If it was UUID, customized baskets would crash the save.)
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_type TEXT CHECK (product_type IN ('normal', 'customized')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add a unique constraint so a user can't accidentally save the exact same basket 10 times in a row
ALTER TABLE public.wishlists 
ADD CONSTRAINT unique_user_product UNIQUE (user_id, product_id, product_type);
