-- 🚨 EMERGENCY FIX: INFINITE RECURSION ON PROFILES 🚨

-- 1. Create (or Update) the Secure Helper Function
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

GRANT EXECUTE ON FUNCTION public.custom_is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_is_admin TO service_role;

-- 2. DYNAMICALLY DROP ALL POLICIES ON 'profiles'
-- This block loops through all existing policies for the 'profiles' table and drops them one by one.
-- This ensures that even if I didn't guess the policy name correctly, it gets removed.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' 
      AND schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
  END LOOP;
END $$;

-- 3. ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. RE-CREATE CLEAN, OPTIMIZED POLICIES

-- SELECT: Users see themselves OR Admin sees all (using the helper function)
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
USING ( auth.uid() = id OR custom_is_admin() );

-- UPDATE: Users update themselves OR Admin updates all
CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
USING ( auth.uid() = id OR custom_is_admin() );

-- INSERT: Users insert themselves OR Admin inserts
CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
WITH CHECK ( auth.uid() = id OR custom_is_admin() );

-- DELETE: Admin only
CREATE POLICY "profiles_delete_policy"
ON profiles FOR DELETE
USING ( custom_is_admin() );


-- 5. SAFETY CHECK FOR IMPORT REQUESTS (Just in case)
ALTER TABLE import_requests ENABLE ROW LEVEL SECURITY;
-- Ensure buyers can select/insert their own requests without weird joins
DROP POLICY IF EXISTS "Buyers can view their own requests" ON import_requests;
CREATE POLICY "Buyers can view their own requests"
ON import_requests FOR SELECT
USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can insert their own requests" ON import_requests;
CREATE POLICY "Buyers can insert their own requests"
ON import_requests FOR INSERT
WITH CHECK (auth.uid() = buyer_id);
