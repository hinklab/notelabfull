-- ============================================================
-- NOTELAB FULL SUPABASE DATABASE SCHEMA & MIGRATIONS
-- Run this in Supabase Dashboard → SQL Editor
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

-- Ensure first_name and last_name columns exist if table was created previously
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2. ROW LEVEL SECURITY (RLS) FOR USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_users" ON public.users;
CREATE POLICY "allow_all_select_users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_insert_users" ON public.users;
CREATE POLICY "allow_all_insert_users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_users" ON public.users;
CREATE POLICY "allow_all_update_users" ON public.users FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 3. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '📝',
  type        TEXT DEFAULT 'custom',
  is_movie    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_notes" ON public.notes;
CREATE POLICY "allow_all_notes" ON public.notes FOR ALL USING (true);

-- 4. NOTE GROUPS TABLE
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

-- 5. NOTE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.note_items (
  id          BIGSERIAL PRIMARY KEY,
  group_id    BIGINT REFERENCES public.note_groups(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  content     TEXT NOT NULL,
  position    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.note_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_note_items" ON public.note_items;
CREATE POLICY "allow_all_note_items" ON public.note_items FOR ALL USING (true);

-- 6. MOVIES TABLE
CREATE TABLE IF NOT EXISTS public.movies (
  id           BIGSERIAL PRIMARY KEY,
  note_id      BIGINT REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL,
  poster       TEXT,
  year         TEXT,
  genre        TEXT,
  rating       TEXT,
  description  TEXT,
  section      TEXT DEFAULT 'futured',
  position     INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_movies" ON public.movies;
CREATE POLICY "allow_all_movies" ON public.movies FOR ALL USING (true);

-- 7. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT UNIQUE NOT NULL,
  gemini_key  TEXT,
  tmdb_key    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_user_settings" ON public.user_settings;
CREATE POLICY "allow_all_user_settings" ON public.user_settings FOR ALL USING (true);
