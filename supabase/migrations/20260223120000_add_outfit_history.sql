-- ── OUTFIT HISTORY ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outfit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit JSONB NOT NULL DEFAULT '[]'::jsonb,
  occasion TEXT,
  worn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outfit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.outfit_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.outfit_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" ON public.outfit_history
  FOR DELETE USING (auth.uid() = user_id);
