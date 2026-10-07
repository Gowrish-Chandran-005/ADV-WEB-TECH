-- Fix profile RLS recursion without weakening self-profile access or admin protections.
-- This patch is intended to be applied after the existing Phase 1-5 database work.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing profile policies that may be re-entering the same table during validation.
DROP POLICY IF EXISTS "Profiles users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be read by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profile owners can update profile" ON public.profiles;

-- Security-definer helper used by profile policies without recursively evaluating the same table policy.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.role = 'ADMIN'
    );
$$;

-- Self-profile reads are allowed for the authenticated user only.
CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Admins may read the full profile table, but only through a security-definer helper.
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
USING (public.is_current_user_admin());

-- Users may update only their own profile record.
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins may update profile records only through explicit admin authorization.
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- No direct deletes are allowed from the app.
CREATE POLICY "No profile deletes"
ON public.profiles
FOR DELETE
USING (false);

-- No direct inserts are allowed from the app; profile creation remains controlled by auth and trusted app logic.
CREATE POLICY "No profile inserts"
ON public.profiles
FOR INSERT
WITH CHECK (false);
