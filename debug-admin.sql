-- Debug Admin Setup
-- Run these queries in Supabase SQL Editor to verify admin setup

-- 1. Check if role column exists and has data
SELECT email, role, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 2. Check if your user has admin role (replace with your email)
SELECT email, role 
FROM profiles 
WHERE email = 'your-email@domain.com';

-- 3. Check if admin policies exist
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'favorite_parcels')
ORDER BY tablename, policyname;

-- 4. Test the is_admin function (should return true if you're admin)
SELECT is_admin();

-- 5. Check if you can see the admin view (should work if you're admin)
SELECT COUNT(*) as total_favorites 
FROM admin_user_favorites;

-- 6. Manually set admin role (replace with your actual email)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@domain.com';

-- 7. Verify the update worked
-- SELECT email, role FROM profiles WHERE email = 'your-email@domain.com';
