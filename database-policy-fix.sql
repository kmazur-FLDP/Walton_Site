-- FLDP GIS Portal - Database Policy Fix
-- This fixes the infinite recursion issue with RLS policies

-- 1. Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all favorites" ON favorite_parcels;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 2. Create a function to check admin status using auth metadata instead
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user's email is in the admin list
  -- You can customize this list or use auth metadata
  RETURN (
    auth.jwt() ->> 'email' IN (
      'kmmazur@fldandp.com',
      'admin@fldandp.com'
      -- Add more admin emails here as needed
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create improved admin policies without circular references
CREATE POLICY "Admins can view all favorites" 
  ON favorite_parcels FOR SELECT 
  USING (
    auth.uid() = user_id OR is_admin_user()
  );

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    auth.uid() = id OR is_admin_user()
  );

-- 4. Also fix the is_admin function to avoid recursion
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Use the same email-based check to avoid circular reference
  RETURN is_admin_user();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the unique constraint as originally planned (check if exists first)
ALTER TABLE favorite_parcels DROP CONSTRAINT IF EXISTS favorite_parcels_user_id_parcel_id_key;
ALTER TABLE favorite_parcels DROP CONSTRAINT IF EXISTS favorite_parcels_user_parcel_county_unique;
ALTER TABLE favorite_parcels ADD CONSTRAINT favorite_parcels_user_parcel_county_unique 
  UNIQUE(user_id, parcel_id, county);

-- This should resolve both the infinite recursion and unique constraint issues
