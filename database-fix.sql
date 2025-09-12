-- FLDP GIS Portal - Database Fix for Favorites
-- This fixes the unique constraint issue that's causing 500 errors

-- 1. Drop the old unique constraint
ALTER TABLE favorite_parcels DROP CONSTRAINT IF EXISTS favorite_parcels_user_id_parcel_id_key;

-- 2. Add new unique constraint that includes county
ALTER TABLE favorite_parcels ADD CONSTRAINT favorite_parcels_user_parcel_county_unique 
  UNIQUE(user_id, parcel_id, county);

-- 3. Clean up any duplicate entries that might exist (optional, run if needed)
-- DELETE FROM favorite_parcels 
-- WHERE id NOT IN (
--   SELECT MIN(id) 
--   FROM favorite_parcels 
--   GROUP BY user_id, parcel_id, county
-- );

-- This should resolve the 500 errors when favoriting parcels
