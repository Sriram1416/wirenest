-- schema.sql
-- WARNING: This will drop existing tables if you already created them, so we can freshly apply the exact columns!
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_details CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart CASCADE;
DROP TABLE IF EXISTS public.stock CASCADE;
DROP TABLE IF EXISTS public.customized_products CASCADE;
DROP TABLE IF EXISTS public.normal_products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- 1. Create Categories Table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Normal Products Table 
CREATE TABLE public.normal_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    short_description TEXT, 
    long_description TEXT,  
    price DECIMAL(10, 2) NOT NULL,
    size TEXT, 
    colors JSONB, 
    images JSONB, 
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Customized Products Table 
CREATE TABLE public.customized_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    short_description TEXT,
    long_description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    customization_options JSONB,
    images JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Stock / Inventory Table
CREATE TABLE public.stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    product_type TEXT CHECK (product_type IN ('normal', 'customized')) NOT NULL,
    quantity INTEGER DEFAULT 0 NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Cart Table (Referred to as 'card')
CREATE TABLE public.cart (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, 
    product_id UUID NOT NULL,
    product_type TEXT CHECK (product_type IN ('normal', 'customized')) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    customization_choices JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Orders Table
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected')),
    shipping_address JSONB,
    payment_screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 7. Create Order Details Table
CREATE TABLE public.order_details (
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

-- 8. Create Order Items Table
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_type TEXT CHECK (product_type IN ('normal', 'customized')) NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    product_image TEXT,
    customization_choices JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Security Policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customized_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on normal_products" ON public.normal_products FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public read access on customized_products" ON public.customized_products FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public read access on order_details" ON public.order_details FOR SELECT USING (true);


---------------------------------------------------------------------------------------------------
-- SEED DATA: Inserting all 16 Products into the normal_products table
---------------------------------------------------------------------------------------------------

WITH new_category AS (
    INSERT INTO public.categories (name, description) 
    VALUES ('Wire Baskets', 'All handcrafted wire baskets')
    RETURNING id
),
new_products AS (
    INSERT INTO public.normal_products (category_id, name, short_description, long_description, price, size, colors, images)
    SELECT
        c.id, p.name, p.desc, p.desc, p.price::numeric, p.size, p.colors::jsonb, p.images::jsonb
    FROM new_category c
    CROSS JOIN (
        VALUES 
        ('Classic Wire Basket', 'Traditional wire basket for everyday use', 200.00, 'medium', '["green", "red"]', '["images/product-images/81IAPiM2jrL._SL1500_.jpg", "https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=3"]'),
        ('Color Weave Basket', 'Colorful woven wire basket', 100.00, 'small', '["blue", "yellow"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=4", "https://picsum.photos/300/300?random=5", "https://picsum.photos/300/300?random=6"]'),
        ('Storage Wire Basket', 'Large storage wire basket', 300.00, 'large', '["yellow", "black"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=101", "https://picsum.photos/300/300?random=102", "https://picsum.photos/300/300?random=103"]'),
        ('Kitchen Utility Basket', 'Practical wire basket for kitchen organization', 200.00, 'medium', '["green"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=104", "https://picsum.photos/300/300?random=105", "https://picsum.photos/300/300?random=106"]'),
        ('Sivankan Classic Wire Basket', 'Traditional Sivankan design handcrafted wire basket', 150.00, 'small', '["red", "blue"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=107", "https://picsum.photos/300/300?random=108", "https://picsum.photos/300/300?random=109"]'),
        ('Sivankan Premium Wire Basket', 'Premium quality Sivankan design with enhanced durability', 700.00, 'large', '["green", "yellow", "red"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=110", "https://picsum.photos/300/300?random=111", "https://picsum.photos/300/300?random=112"]'),
        ('Sivankan Decorative Basket', 'Beautiful decorative Sivankan wire basket', 500.00, 'medium', '["white"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=113", "https://picsum.photos/300/300?random=114", "https://picsum.photos/300/300?random=115"]'),
        ('Sivankan Gift Basket', 'Elegant Sivankan gift basket for special occasions', 150.00, 'small', '["pink", "green"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=116", "https://picsum.photos/300/300?random=117", "https://picsum.photos/300/300?random=118"]'),
        ('Cross Pattern Wire Basket', 'Intricate cross pattern wire basket', 600.00, 'large', '["yellow", "black"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=119", "https://picsum.photos/300/300?random=120", "https://picsum.photos/300/300?random=121"]'),
        ('Cross Weave Storage Basket', 'Cross weave pattern storage solution', 350.00, 'medium', '["red"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=122", "https://picsum.photos/300/300?random=123", "https://picsum.photos/300/300?random=124"]'),
        ('Cross Design Gift Basket', 'Elegant cross design gift basket', 180.00, 'small', '["green", "blue", "yellow"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=125", "https://picsum.photos/300/300?random=126", "https://picsum.photos/300/300?random=127"]'),
        ('Cross Utility Basket', 'Functional cross pattern utility basket', 600.00, 'large', '["pink"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=128", "https://picsum.photos/300/300?random=129", "https://picsum.photos/300/300?random=130"]'),
        ('Premium Classic Wire Basket', 'Premium classic wire basket with superior craftsmanship', 450.00, 'medium', '["black", "red"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=131", "https://picsum.photos/300/300?random=132", "https://picsum.photos/300/300?random=133"]'),
        ('Premium Designer Basket', 'Designer premium wire basket for modern homes', 250.00, 'small', '["blue", "green"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=134", "https://picsum.photos/300/300?random=135", "https://picsum.photos/300/300?random=136"]'),
        ('Premium Luxury Basket', 'Luxury premium wire basket with exclusive design', 800.00, 'large', '["gold", "silver", "black"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=137", "https://picsum.photos/300/300?random=138", "https://picsum.photos/300/300?random=139"]'),
        ('Premium Executive Basket', 'Executive premium wire basket for professional use', 450.00, 'medium', '["white"]', '["https://picsum.photos/150/150?random=100", "https://picsum.photos/300/300?random=140", "https://picsum.photos/300/300?random=141", "https://picsum.photos/300/300?random=142"]')
    ) AS p(name, "desc", price, size, colors, images)
    RETURNING id
)
-- Add 50 stock to every single new product automatically
INSERT INTO public.stock (product_id, product_type, quantity)
SELECT id, 'normal', 50 FROM new_products;
