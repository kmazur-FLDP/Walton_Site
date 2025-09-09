-- FLDP GIS Portal Database Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create favorite_parcels table for saving favorite parcels
CREATE TABLE IF NOT EXISTS favorite_parcels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  parcel_id TEXT NOT NULL,
  county TEXT NOT NULL,
  parcel_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, parcel_id)
);

-- 3. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_parcels ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for profiles
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 5. Create RLS policies for favorite_parcels
CREATE POLICY "Users can view own favorites" 
  ON favorite_parcels FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" 
  ON favorite_parcels FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites" 
  ON favorite_parcels FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" 
  ON favorite_parcels FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to run function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for profiles updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Setup complete! 
-- Don't forget to:
-- 1. Copy your Supabase URL and anon key to .env file
-- 2. Create a test user in Supabase Auth dashboard or via the app
