-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adding RLS policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow public read access to reviews
CREATE POLICY "Enable read access for all users" ON public.reviews FOR SELECT USING (true);

-- Allow authenticated users to insert their own reviews
CREATE POLICY "Enable insert for authenticated users only" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
CREATE POLICY "Enable update for users based on user_id" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reviews
CREATE POLICY "Enable delete for users based on user_id" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
