-- Order Details Architecture Migration
-- Run this directly in the Supabase SQL Editor to append the new table

CREATE TABLE IF NOT EXISTS public.order_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS to prevent unauthorized access
ALTER TABLE public.order_details ENABLE ROW LEVEL SECURITY;

-- Allow public read access to ensure the Admin Dashboard can fetch the records
DROP POLICY IF EXISTS "Allow public read access on order_details" ON public.order_details;
CREATE POLICY "Allow public read access on order_details" ON public.order_details FOR SELECT USING (true);
