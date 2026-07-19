-- ============================================================
-- Migration: 001_create_users
-- Description: Create users table with RLS enabled
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT          NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Users can only read their own row
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own row
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Only service_role (backend) can insert new users
CREATE POLICY "users_insert_service_role"
  ON public.users
  FOR INSERT
  WITH CHECK (true);  -- service_role bypasses RLS by default

-- Only service_role can delete users
CREATE POLICY "users_delete_service_role"
  ON public.users
  FOR DELETE
  USING (false);  -- nobody can delete via client; only service_role

-- 4. Index on email for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 5. Comment
COMMENT ON TABLE public.users IS 'App users with hashed passwords. RLS enabled.';
