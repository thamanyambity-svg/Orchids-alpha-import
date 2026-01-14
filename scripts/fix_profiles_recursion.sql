-- Fix Infinite Recursion on Profiles Table

-- 1. Create a secure function to check admin role without triggering RLS
-- SECURITY DEFINER ensures this function runs with the privileges of the creator (superuser/owner),
-- bypassing RLS on the 'profiles' table within the function body.
CREATE OR REPLACE FUNCTION public.custom_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.custom_is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_is_admin TO service_role;

-- 2. Enable RLS (ensure it is on)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies on profiles to ensure clean slate and remove recursive ones
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Buyers can view own profile" ON profiles;
DROP POLICY IF EXISTS "Reviewer can view applications" ON profiles;

-- 4. Re-create optimized, non-recursive policies

-- SELECT: Users can see their own profile OR Admins can see everyone
-- Using custom_is_admin() bypasses the recursion.
CREATE POLICY "Users can view own profile or admins view all"
ON profiles FOR SELECT
USING (
  auth.uid() = id 
  OR 
  custom_is_admin()
);

-- UPDATE: Users can update their own profile OR Admins can update everyone
CREATE POLICY "Users can update own profile or admins update all"
ON profiles FOR UPDATE
USING (
  auth.uid() = id 
  OR 
  custom_is_admin()
);

-- INSERT: Users can insert their own profile (e.g. on sign up) OR Admins
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (
  auth.uid() = id 
  OR 
  custom_is_admin()
);

-- DELETE: Admins only (optional, but good for safety)
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
USING (custom_is_admin());
