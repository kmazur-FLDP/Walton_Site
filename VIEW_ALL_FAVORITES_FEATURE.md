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
- **Polk County** ⏳ Needs update
- **Hernando County** ⏳ Needs update  
- **Citrus County** ⏳ Needs update

## How to Use

### As an Admin:
1. Go to **Admin Dashboard** → **All Favorites** tab
2. Use the **County Filter** to select a specific county (e.g., "Manatee")
3. Optionally, apply other filters (user, date range, search term)
4. Click the **"View All on Map"** button
5. The map will open with all filtered parcels highlighted in amber/orange
6. A badge shows: "Viewing X parcels"

### Visual Indicators on Map:
- **Amber/Orange** (🟠): Multi-selected parcels (viewing multiple favorites)
- **Blue** (🔵): Individual favorite parcels
- **Green** (🟢): Currently selected parcel (clicked)
- **Yellow** (🟡): Default parcels

## Technical Details

### URL Parameters
- **Single parcel**: `?parcel=PARCEL_ID`
- **Multiple parcels**: `?parcels=ID1,ID2,ID3`

### Implementation Files
- `src/pages/AdminDashboard.jsx`: Added "View All on Map" button
- `src/pages/ManateeMapPage.jsx`: Added multi-parcel support
- `src/pages/PascoMapPage.jsx`: Added multi-parcel support

### State Management
Each map page now has:
```javascript
const [selectedParcels, setSelectedParcels] = useState(new Set())
```

This tracks all parcels that should be highlighted when viewing multiple favorites.

## Next Steps

To complete this feature for all counties, the following map pages need the same updates:
1. **PolkMapPage.jsx**
2. **HernandoMapPage.jsx**
3. **CitrusMapPage.jsx**

Each needs:
1. Add `selectedParcels` state variable
2. Update URL parameter handling to support `parcels` (comma-separated)
3. Update `parcelStyle` function to check `isInMultiSelect`
4. Add UI badge showing count of parcels being viewed

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
