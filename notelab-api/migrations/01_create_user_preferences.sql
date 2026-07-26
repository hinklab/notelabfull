-- Create user_preferences table in Supabase
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  favorite_genres TEXT[] DEFAULT '{}',
  priority_factor TEXT,
  mood_preference TEXT,
  watch_frequency TEXT,
  preferred_platform TEXT,
  movie_length_preference TEXT,
  era_preference TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was created previously
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS priority_factor TEXT;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS mood_preference TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can insert or update their own preferences
CREATE POLICY "Users can insert or update own preferences"
  ON public.user_preferences
  FOR ALL
  USING (auth.uid() = id);
