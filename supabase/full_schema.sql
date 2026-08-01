-- ============================================================
-- NOTELAB FULL SUPABASE DATABASE SCHEMA & MIGRATIONS
-- Run this script in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT          NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_users" ON public.users;
CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true);

-- 2. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  icon        TEXT DEFAULT '📝',
  type        TEXT DEFAULT 'custom',
  is_movie    BOOLEAN DEFAULT false,
  position    INT DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_notes" ON public.notes;
CREATE POLICY "allow_all_notes" ON public.notes FOR ALL USING (true);

-- 3. NOTE GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.note_groups (
  id          BIGSERIAL PRIMARY KEY,
  note_id     BIGINT REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#a78bfa',
  section_key TEXT,
  position    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.note_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_note_groups" ON public.note_groups;
CREATE POLICY "allow_all_note_groups" ON public.note_groups FOR ALL USING (true);

-- 4. NOTE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.note_items (
  id          BIGSERIAL PRIMARY KEY,
  group_id    BIGINT REFERENCES public.note_groups(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  title       TEXT,
  note        TEXT,
  content     TEXT,
  cover_url   TEXT,
  position    INT DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.note_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_note_items" ON public.note_items;
CREATE POLICY "allow_all_note_items" ON public.note_items FOR ALL USING (true);

-- 5. MOVIES TABLE
CREATE TABLE IF NOT EXISTS public.movies (
  id           BIGSERIAL PRIMARY KEY,
  note_id      BIGINT REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL,
  poster_path  TEXT,
  rating       NUMERIC,
  vote_count   INT,
  release_date TEXT,
  release_year TEXT,
  genre        TEXT,
  director     TEXT,
  overview     TEXT,
  seasons      TEXT DEFAULT '-',
  section      TEXT DEFAULT 'futured',
  position     INT DEFAULT 0,
  tmdb_id      BIGINT,
  imdb_id      TEXT,
  media_type   TEXT DEFAULT 'movie',
  note         TEXT,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_movies" ON public.movies;
CREATE POLICY "allow_all_movies" ON public.movies FOR ALL USING (true);

-- 6. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  settings    JSONB DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_user_settings" ON public.user_settings;
CREATE POLICY "allow_all_user_settings" ON public.user_settings FOR ALL USING (true);

-- 7. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT,
  favorite_genres         JSONB DEFAULT '[]'::jsonb,
  priority_factor         JSONB DEFAULT '[]'::jsonb,
  mood_preference         JSONB DEFAULT '[]'::jsonb,
  movie_length_preference JSONB DEFAULT '[]'::jsonb,
  era_preference          JSONB DEFAULT '[]'::jsonb,
  updated_at              TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_user_preferences" ON public.user_preferences;
CREATE POLICY "allow_all_user_preferences" ON public.user_preferences FOR ALL USING (true);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  movie_data  JSONB,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_notifications" ON public.notifications;
CREATE POLICY "allow_all_notifications" ON public.notifications FOR ALL USING (true);
