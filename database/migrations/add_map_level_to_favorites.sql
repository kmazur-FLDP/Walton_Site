-- Add map_level column to favorite_parcels table
-- This distinguishes between Level 1 (county-specific maps) and Level 2 (multi-county analysis) favorites

ALTER TABLE favorite_parcels 
ADD COLUMN IF NOT EXISTS map_level TEXT DEFAULT 'level1' CHECK (map_level IN ('level1', 'level2'));

-- Update the unique constraint to include map_level
-- This allows the same parcel to be favorited on both Level 1 and Level 2
ALTER TABLE favorite_parcels DROP CONSTRAINT IF EXISTS favorite_parcels_user_parcel_county_unique;

ALTER TABLE favorite_parcels 
ADD CONSTRAINT favorite_parcels_user_parcel_county_level_unique 
UNIQUE(user_id, parcel_id, county, map_level);

-- Add an index for faster queries by map_level
CREATE INDEX IF NOT EXISTS idx_favorite_parcels_map_level ON favorite_parcels(map_level);
