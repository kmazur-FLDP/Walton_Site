# View All Favorites Feature

## Overview
This feature allows administrators to view all favorited parcels for a specific county on the map at once, with special highlighting to distinguish them from other parcels.

## What's New

### Admin Dashboard
- **"View All on Map" Button**: A new button appears in the "All Favorites" tab when there are filtered favorites
  - Shows the count of parcels that will be displayed: `View All on Map (X)`
  - Only works when filtering by a single county
  - If multiple counties are in the filtered results, it shows an alert asking you to filter by a specific county

### Map Pages
Updated map pages now support viewing multiple parcels at once:
- **Manatee County** ✅ Updated
- **Pasco County** ✅ Updated
- **Polk County** ✅ Updated
- **Hernando County** ✅ Updated
- **Citrus County** ✅ Updated

## How to Use

### As an Admin:
1. Go to **Admin Dashboard** → **All Favorites** tab
2. Use the **County Filter** to select a specific county (e.g., "Manatee")
3. Optionally, apply other filters (user, date range, search term)
4. Click the **"View All on Map"** button
5. The map will open with all filtered parcels highlighted in amber/orange
6. A badge shows: "Viewing X parcels"

### Visual Indicators on Map:
- **Amber/Orange** (🟠): Multi-selected parcels (viewing multiple favorites) - `fillOpacity: 0.5`
- **Blue** (🔵): Individual favorite parcels - `fillOpacity: 0.4` (increased for better visibility)
- **Green** (🟢): Currently selected parcel (clicked) - `fillOpacity: 0.4`
- **Yellow** (🟡): Default parcels - `fillOpacity: 0.15`

## Technical Details

### URL Parameters
- **Single parcel**: `?parcel=PARCEL_ID`
- **Multiple parcels**: `?parcels=ID1,ID2,ID3`

### Implementation Files
- `src/pages/AdminDashboard.jsx`: Added "View All on Map" button
- `src/pages/ManateeMapPage.jsx`: Added multi-parcel support + increased favorite opacity
- `src/pages/PascoMapPage.jsx`: Added multi-parcel support + increased favorite opacity
- `src/pages/PolkMapPage.jsx`: Added multi-parcel support + increased favorite opacity
- `src/pages/HernandoMapPage.jsx`: Added multi-parcel support + increased favorite opacity
- `src/pages/CitrusMapPage.jsx`: Added multi-parcel support + increased favorite opacity

### State Management
Each map page now has:
```javascript
const [selectedParcels, setSelectedParcels] = useState(new Set())
```

This tracks all parcels that should be highlighted when viewing multiple favorites.

## Next Steps

✅ **All counties are now complete!** The feature is ready to use across:
- Manatee County
- Pasco County  
- Polk County
- Hernando County
- Citrus County

No additional updates needed. Just test and enjoy!

## Benefits
- **Faster Analysis**: View all favorites for a county at once
- **Better Overview**: See spatial distribution of favorited parcels
- **Admin Efficiency**: Quickly audit user favorites
- **Visual Clarity**: Color-coded highlighting makes it easy to see which parcels are selected

## Example Use Cases
- View all parcels favorited by users in the last month for Manatee County
- Compare spatial distribution of favorites across different users
- Audit which areas are getting the most attention from users
- Export favorites and then visually review them on the map
