-- ============================================================
-- Full schema migration for StyleVault
-- Safe to run even if some tables already exist
-- ============================================================

-- ── PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  location TEXT,
  occupation TEXT,
  styles TEXT[] DEFAULT '{}',
  budget TEXT,
  favorites JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Add favorites column if table already existed without it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorites JSONB DEFAULT '[]'::jsonb;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── CLOSET ITEMS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.closet_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT,
  season TEXT DEFAULT 'All',
  image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.closet_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own items" ON public.closet_items;
DROP POLICY IF EXISTS "Users can insert own items" ON public.closet_items;
DROP POLICY IF EXISTS "Users can update own items" ON public.closet_items;
DROP POLICY IF EXISTS "Users can delete own items" ON public.closet_items;

CREATE POLICY "Users can view own items" ON public.closet_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON public.closet_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.closet_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON public.closet_items FOR DELETE USING (auth.uid() = user_id);


-- ── STYLE PHOTOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.style_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.style_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own photos" ON public.style_photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON public.style_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON public.style_photos;

CREATE POLICY "Users can view own photos" ON public.style_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own photos" ON public.style_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON public.style_photos FOR DELETE USING (auth.uid() = user_id);


-- ── STORAGE BUCKETS ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('style-photos', 'style-photos', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('closet-items', 'closet-items', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload style photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view style photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own style photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload closet items" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view closet items" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own closet items" ON storage.objects;

CREATE POLICY "Users can upload style photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'style-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view style photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'style-photos');
CREATE POLICY "Users can delete own style photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'style-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload closet items" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view closet items" ON storage.objects
  FOR SELECT USING (bucket_id = 'closet-items');
CREATE POLICY "Users can delete own closet items" ON storage.objects
  FOR DELETE USING (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);
