# GeoJSON Data Organization Guide

## 📂 **Recommended Directory Structure**

### **Option 1: Public Directory (Recommended for most cases)**
```
public/data/
├── counties/
│   ├── walton-county.geojson          # County boundaries
│   ├── okaloosa-county.geojson
│   └── santa-rosa-county.geojson
├── parcels/
│   ├── walton-county-parcels.geojson  # Parcel data by county
│   ├── okaloosa-county-parcels.geojson
│   └── santa-rosa-county-parcels.geojson
└── boundaries/
    ├── municipal-boundaries.geojson    # City/town boundaries
    └── special-districts.geojson       # Special districts, utilities, etc.
```

### **Option 2: Source Directory (For smaller datasets)**
```
src/data/
├── counties.js                        # Imported as ES modules
├── parcels.js
└── static/
    └── sample-data.geojson
```

## 🎯 **When to Use Each Approach**

### **Use `public/data/` when:**
- ✅ **Large GeoJSON files** (>1MB)
- ✅ **Dynamic loading** based on user selection
- ✅ **County-specific data** that loads on demand
- ✅ **External API integration** (files can be updated independently)
- ✅ **Production deployment** with CDN serving

### **Use `src/data/` when:**
- ✅ **Small datasets** (<500KB)
- ✅ **Critical data** needed immediately
- ✅ **Configuration data** (county lists, etc.)
- ✅ **Type checking** with TypeScript
- ✅ **Build-time optimization**

## 📁 **File Naming Convention**

### **Counties:**
- `{county-name}-county.geojson`
- Example: `walton-county.geojson`

### **Parcels:**
- `{county-name}-parcels.geojson` (all parcels)
- `{county-name}-parcels-{district}.geojson` (by district)
- Example: `walton-parcels-district-1.geojson`

### **Boundaries:**
- `{type}-boundaries.geojson`
- Example: `municipal-boundaries.geojson`

## 🚀 **Loading Patterns**

### **Public Data (Async Loading):**
```javascript
// Load county data on demand
const loadCountyData = async (countyName) => {
  const response = await fetch(`/data/counties/${countyName}-county.geojson`)
  return await response.json()
}

// Load parcel data for specific county
const loadParcelData = async (countyName) => {
  const response = await fetch(`/data/parcels/${countyName}-parcels.geojson`)
  return await response.json()
}
```

### **Source Data (Import):**
```javascript
// Static import
import waltonCounty from '../data/walton-county.geojson'

// Dynamic import
const loadCountyData = async (countyName) => {
  const module = await import(`../data/${countyName}-county.geojson`)
  return module.default
}
```

## 🎨 **Sample Implementation**

I'll create a data service for you that handles both approaches:

```javascript
// src/services/dataService.js
class DataService {
  async loadCountyBoundary(countyName) {
    try {
      const response = await fetch(`/data/counties/${countyName}-county.geojson`)
      if (!response.ok) throw new Error(`County data not found: ${countyName}`)
      return await response.json()
    } catch (error) {
      console.error('Error loading county boundary:', error)
      return null
    }
  }

  async loadCountyParcels(countyName) {
    try {
      const response = await fetch(`/data/parcels/${countyName}-parcels.geojson`)
      if (!response.ok) throw new Error(`Parcel data not found: ${countyName}`)
      return await response.json()
    } catch (error) {
      console.error('Error loading parcel data:', error)
      return null
    }
  }
}
```

## 📊 **File Size Considerations**

### **Large Files (>5MB):**
- Consider splitting by geographic regions
- Use compressed formats (`.geojson.gz`)
- Implement progressive loading
- Consider using vector tiles instead

### **Medium Files (1-5MB):**
- Load on county selection
- Cache in browser memory
- Show loading indicators

### **Small Files (<1MB):**
- Can be bundled with app
- Preload critical data

## 🔒 **Security Considerations**

### **Public Directory:**
- ✅ Files are publicly accessible
- ✅ No authentication required
- ⚠️ Consider data sensitivity

### **Source Directory:**
- ✅ Bundled with application
- ✅ Minified and obfuscated
- ✅ Same-origin access only

## 🌐 **Deployment Notes**

### **Netlify:**
- Public files served directly from `/public`
- Automatic gzip compression
- CDN distribution included

### **Custom Server:**
- Configure proper CORS headers
- Enable gzip compression
- Set appropriate cache headers

## 📋 **Next Steps**

1. **Place your GeoJSON files** in `public/data/counties/` and `public/data/parcels/`
2. **Use the naming convention** above
3. **Test loading** with the sample code
4. **Monitor performance** and adjust as needed

---

**Recommended approach for Walton Global:**
Use `public/data/` structure for flexibility and performance!
