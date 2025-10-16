# Level 2 Map Favorites - Map Level Separation

## Overview
This update separates favorites between Level 1 (county-specific) and Level 2 (multi-county analysis) maps. Previously, favorites from all maps were mixed together, making it impossible for admins to see only Level 2 favorites.

## Database Changes

### Migration Required
Run the migration to add the `map_level` column:

```bash
node scripts/run-migration.js database/migrations/add_map_level_to_favorites.sql
```

This migration:
1. Adds a `map_level` column with values 'level1' or 'level2' (defaults to 'level1')
2. Updates the unique constraint to include `map_level`, allowing the same parcel to be favorited on both levels
3. Adds an index for faster queries

### Existing Data
All existing favorites will be marked as 'level1' by default. This is correct since Level 2 favorites functionality is being added now.

## Code Changes

### favoritesService.js
Updated all methods to accept and use `mapLevel` parameter:
- `getFavoritesByCounty(county, mapLevel = 'level1')` - Filter by map level
- `addFavorite(..., mapLevel = 'level1')` - Save with map level
- `removeFavorite(..., mapLevel = 'level1')` - Delete specific to map level
- `isFavorite(..., mapLevel = 'level1')` - Check specific to map level
- `toggleFavorite(..., mapLevel = 'level1')` - Toggle specific to map level
- `getAllFavoritesByCounty(county, mapLevel = 'level1')` - Admin queries filter by map level

### Level2MapPage.jsx
Updated to use 'level2' for all favorites operations:
- Loading favorites: `getFavoritesByCounty(county, 'level2')`
- Admin loading: `getAllFavoritesByCounty(county, 'level2')`
- Toggling favorites: `toggleFavorite(parcelId, county, null, 'level2')`

## Functionality

### For Regular Users
- Level 1 maps: See and manage favorites specific to that county map
- Level 2 map: See and manage favorites specific to the multi-county analysis map
- Same parcel can be favorited in both Level 1 and Level 2 independently

### For Admins
- Level 1 maps: See all users' Level 1 favorites for that county
- Level 2 map: See all users' Level 2 favorites across all counties
- Clear separation allows admins to understand which map clients are using for analysis

## Testing
1. **Run the migration first** - This adds the required database column
2. Test as regular user:
   - Favorite parcels on Level 2 map
   - Verify they appear highlighted in cyan
   - Verify Level 1 favorites are separate
3. Test as admin:
   - Verify you see all users' Level 2 favorites
   - Verify Level 1 favorites are not mixed in

## Backwards Compatibility
The changes are backwards compatible with default parameters. All existing Level 1 map code continues to work with `mapLevel = 'level1'` as the default.
