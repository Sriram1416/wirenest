-- SQL script to modify the order_items table for the Customer Tracking Page
-- Phase 24: Polishing Order Tracking Pictures

-- Add the new column to securely preserve the URL of the basket's image at the time of checkout!
ALTER TABLE public.order_items
ADD COLUMN product_image TEXT;
