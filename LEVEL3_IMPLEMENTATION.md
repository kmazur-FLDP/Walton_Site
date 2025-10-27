# Level 3 - Cortez Parcel Implementation

## Overview
Successfully created the Level 3 Analysis section with the Cortez Parcel map page. Level 3 maps provide detailed, parcel-specific analysis with comprehensive site data layers.

## Files Created

### 1. `/src/pages/Level3CortezMapPage.jsx`
- **Purpose**: Detailed single-parcel analysis map for the Cortez property in Hernando County
- **Features**:
  - 8 data layers with individual toggle controls
  - Dynamic layer visibility management
  - Interactive popups for all layers
  - Auto-zoom to parcel extent
  - Print functionality
  - Dynamic legend based on active layers
  - Loading state indicator
  
**Data Layers**:
1. **Parcel** (always visible) - Highlighted in gold/orange
2. **Floodplain** - FEMA flood zones with color-coded styling
3. **Future Land Use (FLU)** - County planning designations
4. **Zoning** - Zoning districts and classifications
5. **Topography** - Contour lines showing elevation
6. **Wetlands** - Wetland boundaries and types
7. **Pressure Pipes** - Utility infrastructure (red lines)
8. **Water Pipes** - Water utility infrastructure (blue lines)

## Files Modified

### 1. `/src/pages/LandingPage.jsx`
Added **Level 3 Analysis** section between Level 2 and the Level 1 divider:
- Purple-themed card design to distinguish from other levels
- Compact grid layout (1-3 columns responsive)
- Shows 8 data layers available
- Feature highlights with bullet points
- Direct navigation to Cortez parcel map

### 2. `/src/App.jsx`
- **Import**: Added `Level3CortezMapPage` import
- **Route**: Added protected route at `/level3/cortez`

## Data Files Used
All files located in `/public/data/level3/`:
- `Level_3_Cortez_Parcel.geojson`
- `Level_3_Cortez_Floodplain.geojson`
- `Level_3_Cortez_FLU.geojson`
- `Level_3_Cortez_Zoning.geojson`
- `Level_3_Cortez_Topo.geojson`
- `Level_3_Cortez_Wetlands.geojson`
- `Level_3_Cortez_Pressure_Pipes.geojson`
- `Level_3_Cortez_Water_Pipes.geojson`

## Design & Theming

### Visual Hierarchy
- **Level 1**: County-specific maps (existing)
- **Level 2**: Multi-county regional analysis (blue gradient)
- **Level 3**: Parcel-specific detailed analysis (purple gradient) ⭐ NEW

### Component Structure
The Level 3 map page follows the same architectural patterns as other maps:
- Header with navigation and print button
- Left sidebar layer controls with Eye icons
- Bottom-left legend (auto-generated)
- Full-screen map container
- React Leaflet with GeoJSON layers
- Loading state management

### Styling Consistency
- Uses existing color maps (`getHernandoFLUStyle`, `getHernandoZoningStyle`)
- Tailwind CSS classes matching other pages
- Blue gradient header (consistent with site theme)
- White control panels with shadows
- Responsive grid layouts

## User Experience

### Dashboard Navigation
1. User logs in and sees dashboard
2. Three analysis levels displayed:
   - **Level 2**: Multi-county analysis (prominent card)
   - **Level 3**: Parcel-specific maps (new section with grid) ⭐
   - **Level 1**: County selection (below divider)
3. Click "Cortez Parcel" card → navigates to `/level3/cortez`

### Map Interaction
1. Map loads all 8 layers simultaneously (parallel fetch)
2. Auto-zooms to parcel boundaries
3. Floodplain shown by default
4. Toggle any layer on/off with checkboxes
5. Click features for detailed popup information
6. Legend updates dynamically based on visible layers
7. Print button preserves current layer visibility

## Technical Implementation

### State Management
```javascript
// Layer data states (8 layers)
const [parcelData, setParcelData] = useState(null)
const [floodplainData, setFloodplainData] = useState(null)
// ... etc

// Layer visibility states (7 toggleable + 1 always visible)
const [showFloodplain, setShowFloodplain] = useState(true)
const [showFLU, setShowFLU] = useState(false)
// ... etc
```

### Data Loading
- **Parallel fetch** using `Promise.all()` for fast loading
- Error handling with try/catch
- Loading spinner during data fetch
- Auto-zoom after data loads

### Layer Rendering
- Conditional rendering based on visibility state
- Unique `key` props for React reconciliation
- Custom styling functions for each layer type
- `onEachFeature` handlers for interactive popups

## Future Expansion

### Adding More Level 3 Parcels
To add additional Level 3 parcels:

1. **Add GeoJSON files** to `/public/data/level3/`
2. **Create new map page** (copy `Level3CortezMapPage.jsx`)
3. **Update data file paths** in fetch calls
4. **Customize parcel name** and county
5. **Add card to dashboard** in `LandingPage.jsx` Level 3 section
6. **Add route** in `App.jsx`

### Example for a new parcel:
```javascript
// In LandingPage.jsx, add another card in the Level 3 grid
<motion.div onClick={() => navigate('/level3/newparcel')}>
  <h3>New Parcel Name</h3>
  <p>County Name</p>
</motion.div>

// In App.jsx
import Level3NewParcelMapPage from './pages/Level3NewParcelMapPage'
<Route path="/level3/newparcel" element={<ProtectedRoute><Level3NewParcelMapPage /></ProtectedRoute>} />
```

## Testing Checklist
- [x] All 8 data files load successfully
- [x] Parcel displays on map
- [x] Layer toggles work for all 7 toggleable layers
- [x] Popups show correct information
- [x] Legend updates when layers toggled
- [x] Auto-zoom to parcel extent works
- [x] Print button functions
- [x] Navigation from dashboard works
- [x] Back button returns to dashboard
- [x] Responsive design works on different screen sizes
- [x] Loading spinner appears during data fetch
- [x] No console errors

## Summary
Successfully implemented Level 3 Analysis with the Cortez Parcel map. The implementation follows existing patterns and theming while introducing a new analysis level for detailed, parcel-specific site analysis. The modular design makes it easy to add additional Level 3 parcels in the future.
