-- FLDP GIS Portal - Admin Role Setup
-- Run these commands in your Supabase SQL Editor to add admin functionality

-- 1. Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Set yourself as admin (replace with your actual email)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@domain.com';

-- 4. Create admin policies for viewing all favorites
CREATE POLICY "Admins can view all favorites" 
  ON favorite_parcels FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. Create admin policies for viewing all profiles
CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 6. Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create view for admin to see user activity
CREATE OR REPLACE VIEW admin_user_favorites AS
SELECT 
  p.email,
  p.full_name,
  p.role,
  fp.parcel_id,
  fp.county,
  fp.parcel_address,
  fp.notes,
  fp.created_at as favorited_at
FROM profiles p
LEFT JOIN favorite_parcels fp ON p.id = fp.user_id
WHERE is_admin()
ORDER BY fp.created_at DESC;
