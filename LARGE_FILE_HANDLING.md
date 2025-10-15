# Large GeoJSON File Handling

## Problem
The wetlands and floodplain GeoJSON files are 64MB each, which is too large for efficient browser loading and rendering. This causes:
- Long load times
- Browser memory issues
- Potential timeout errors
- Poor map performance

## Solutions

### Option 1: Simplify the GeoJSON Files (Recommended)
Use the provided script to reduce file size while maintaining visual quality:

```bash
# Simplify wetlands
node scripts/simplify-geojson.js \
  public/data/level2/wetlands.geojson \
  public/data/level2/wetlands_simplified.geojson \
  0.001

# Simplify floodplain
node scripts/simplify-geojson.js \
  public/data/level2/floodplain.geojson \
  public/data/level2/floodplain_simplified.geojson \
  0.001
```

The tolerance parameter (0.001) controls simplification:
- **0.0001** = Very detailed (minimal simplification)
- **0.001** = Good balance (recommended)
- **0.01** = Aggressive simplification

Then update the file paths in `Level2MapPage.jsx`:
```javascript
// Change from:
const wetlandsRes = await fetch('/data/level2/wetlands.geojson')
// To:
const wetlandsRes = await fetch('/data/level2/wetlands_simplified.geojson')
```

### Option 2: Use a Tile Server
For very large datasets, serve them as vector tiles:
1. Convert GeoJSON to MBTiles using [tippecanoe](https://github.com/mapbox/tippecanoe)
2. Serve tiles using a tile server
3. Use Leaflet VectorGrid plugin to display

### Option 3: Filter Features by Viewport
Only load features within the current map view:
```javascript
// Fetch only features in the current bounds
const bounds = map.getBounds()
const filtered = features.filter(feature => {
  // Check if feature intersects with bounds
})
```

### Option 4: Use External Services
Use pre-existing tile services like:
- FEMA National Flood Hazard Layer (for floodplain)
- USGS National Wetlands Inventory (for wetlands)

## File Size Targets
For good browser performance:
- **< 5MB**: Excellent
- **5-10MB**: Good
- **10-20MB**: Acceptable with optimization
- **> 20MB**: Consider alternative approaches

## Testing
After simplification, test the layers to ensure:
1. Visual quality is acceptable at typical zoom levels
2. File loads without errors
3. Map remains responsive when layer is enabled
4. Detail is sufficient for your use case

## Current File Status
- ✅ Citrus Parcels: Working
- ✅ Hernando Parcels: Working
- ✅ Manatee Parcels: Working
- ✅ Pasco Parcels: Working
- ✅ Polk Parcels: Working
- ✅ FLU Layers: Working
- ✅ Zoning Layers: Working
- ❌ Wetlands: 64MB - Needs simplification
- ❌ Floodplain: 64MB - Needs simplification
- ✅ Soils: Working (if present)
- ✅ Topography: Working (if present)
