-- schema_v11.sql
-- Fix: /register upsert into voyager_profiles was silently blocked by RLS.
-- voyager_profiles had SELECT + UPDATE policies but NO INSERT policy.
-- PostgreSQL evaluates the INSERT policy's WITH CHECK for INSERT ... ON CONFLICT
-- DO UPDATE (upsert) even when the row already exists, so the whole upsert failed.
-- Add an INSERT policy allowing a user to insert their own profile row.

CREATE POLICY profiles_insert_own ON public.voyager_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
