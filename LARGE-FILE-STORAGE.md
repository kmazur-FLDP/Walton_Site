# Large File Storage Solution

## Problem
Several GeoJSON files exceeded GitHub's 100MB file size limit:
- `Citrus_Zoning.geojson` (209MB)
- `Citrus_FLU.geojson` (206MB)  
- `Hernando_Zoning.geojson` (246MB)

## Solution
Large files are now stored in Supabase Storage and loaded via HTTP requests.

### Storage Location
- **Service**: Supabase Storage
- **Bucket**: `geojson` (public)
- **Base URL**: `https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/geojson/`

### Current Storage Setup

#### Large Files (Supabase Storage)
- `Citrus_Zoning.geojson` → https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/geojson/Citrus_Zoning.geojson
- `Citrus_FLU.geojson` → https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/geojson/Citrus_FLU.geojson
- `Hernando_Zoning.geojson` → https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/geojson/Hernando_Zoning.geojson

#### Small Files (Local)
All files under ~50MB remain in the `/public/data/` directory for faster loading.

### Implementation Details

#### Code Changes
1. **DataService Updates** (`src/services/dataService.js`):
   - Modified `loadCitrusZoning()` to use Supabase URL
   - Modified `loadCitrusFLU()` to use Supabase URL
   - Maintained caching mechanism for performance

2. **Configuration** (`data-sources.json`):
   - Created configuration file documenting all data sources
   - Separates large files from local files
   - Provides metadata about file sizes and descriptions

#### Benefits
- ✅ **Git Compliance**: Repository stays under GitHub's file size limits
- ✅ **Performance**: Large files cached after first load
- ✅ **Reliability**: Supabase provides CDN-backed storage
- ✅ **Scalability**: Easy to add more large files to cloud storage
- ✅ **Transparency**: Clear documentation of data sources

### Adding New Large Files

When adding new GeoJSON files over ~50MB:

1. **Upload to Supabase Storage**:
   ```bash
   # Upload via Supabase CLI or Dashboard
   supabase storage put geojson/new-file.geojson ./path/to/new-file.geojson
   ```

2. **Update DataService**:
   ```javascript
   async loadNewData() {
     try {
       const response = await fetch('https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/geojson/new-file.geojson')
       // ... rest of implementation
     } catch (error) {
       console.error('Error loading new data:', error)
       return null
     }
   }
   ```

3. **Update Configuration**:
   - Add entry to `data-sources.json`
   - Document file size and description

### Backup Strategy
- Large files are backed up locally in `../backup-large-files/` (outside git)
- Supabase Storage provides automatic backups
- Original files maintained separately for data updates

### Monitoring
- Check browser network tab for loading performance
- Monitor Supabase Storage usage in dashboard
- Watch for CORS or connectivity issues

## Future Enhancements

1. **Compression**: Could implement gzip compression for even faster loading
2. **Progressive Loading**: Could implement tile-based loading for very large datasets
3. **Fallback**: Could implement fallback to local storage if CDN fails
4. **Versioning**: Could add versioning support for data updates