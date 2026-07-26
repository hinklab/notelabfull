-- Create user_settings table in Supabase
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  gemini_key TEXT,
  omdb_key TEXT,
  tmdb_key TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert or update their own settings
CREATE POLICY "Users can insert or update own settings"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id);
