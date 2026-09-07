-- Migration: Add dedup_key index / column support for Notifications Table

-- 1. If dedup_key column doesn't exist, we can add it (optional if using JSONB movie_data->>'dedup_key')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'dedup_key'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN dedup_key TEXT;
  END IF;
END $$;

-- 2. Create unique index on dedup_key column or JSONB expression (to guarantee 0 duplicates at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key_expr
  ON public.notifications ((COALESCE(dedup_key, movie_data->>'dedup_key')))
  WHERE (COALESCE(dedup_key, movie_data->>'dedup_key')) IS NOT NULL;
