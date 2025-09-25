/**
 * Color mapping utilities for GeoJSON layers
 * Generates unique colors based on description attributes
 */

/**
 * Generate a consistent color from a string using hash function
 * @param {string} str - String to generate color from
 * @returns {string} Hex color string
 */
const stringToColor = (str) => {
  if (!str || str.trim() === '') return '#999999' // Gray for empty/null values
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Convert hash to HSL for better color distribution
  const hue = Math.abs(hash) % 360
  const saturation = 60 + (Math.abs(hash) % 30) // 60-90% saturation
  const lightness = 45 + (Math.abs(hash) % 20) // 45-65% lightness
  
  return hslToHex(hue, saturation, lightness)
}

/**
 * Convert HSL to hex color
 */
const hslToHex = (h, s, l) => {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Citrus County Zoning color mappings
 */
export const getCitrusZoningColor = (description) => {
  // Predefined colors for major zoning categories
  const colorMap = {
    // Residential categories - blues/greens
    'LOW DENSITY RESIDENTIAL': '#3B82F6',           // Blue
    'LOW DENSITY RES - MH ALLOWED': '#60A5FA',      // Light blue
    'MEDIUM DENSITY RESIDENTIAL': '#2563EB',        // Dark blue
    'MEDIUM DENSTY RES - MH ALLOWED': '#3B82F6',    // Blue
    'HIGH DENSITY RESIDENTIAL': '#1E40AF',          // Very dark blue
    'HIGH DENSITRY RES - MH ALLOWED': '#2563EB',    // Dark blue (typo in source)
    'RURAL RESIDENTIAL': '#10B981',                 // Green
    'RURAL RESIDENTIAL - MH ALLOWED': '#34D399',    // Light green
    'CENTRAL RIDGE RESIDENTIAL': '#059669',         // Dark green
    'PLANNED DEVELOP. RESIDENTIAL': '#6366F1',      // Indigo
    'PLANNED DEVEL RES - MH ALLOWED': '#8B5CF6',    // Purple
    'COASTAL LAKES RESIDENTIAL': '#0891B2',         // Cyan
    'COASTL/LAKES RESDNTL-MH ALLWED': '#0EA5E9',    // Light cyan
    'LOW INTENSITY COASTAL & LAKES': '#06B6D4',     // Sky blue
    'LOW-INT.COASTL-LAKES-MH ALLWED': '#22D3EE',    // Light sky blue
    'MOBILE HOME PARK': '#A855F7',                  // Purple
    
    // Commercial categories - oranges/reds
    'GENERAL COMMERCIAL': '#EA580C',                // Orange
    'GENERAL COMMERCIAL- MH ALLOWED': '#F97316',    // Light orange
    'NEIGHBORHOOD COMMERCIAL': '#FB923C',           // Lighter orange
    'COASTAL LAKES COMMERCIAL': '#DC2626',          // Red
    'PROFESSIONAL/SERVICE/OFFICE': '#EF4444',       // Light red
    'PROF.SERVICE OFFICE-MH ALLOWED': '#F87171',    // Lighter red
    
    // Industrial categories - grays/browns
    'INDUSTRIAL': '#6B7280',                        // Gray
    'LIGHT INDUSTRIAL': '#9CA3AF',                  // Light gray
    
    // Special use categories - yellows/browns
    'AGRICULTURAL': '#EAB308',                      // Yellow
    'AGRICULTURAL - MH ALLOWED': '#FACC15',         // Light yellow
    'CONSERVATION': '#16A34A',                      // Forest green
    'CONSERVATION MOBILEHOMES ALLOW': '#22C55E',    // Light forest green
    'RECREATIONAL': '#84CC16',                      // Lime green
    'RECREATIONAL VEHICLE PARK': '#A3E635',         // Light lime
    'EXTRACTIVE': '#A3A3A3',                        // Neutral gray
    'EXTRACTIVE - MH ALLOWED': '#D1D5DB',           // Light neutral gray
    
    // Government/Public categories - purples
    'PUBLIC/SEMI-PUBLIC/INSTITUTION': '#7C3AED',    // Violet
    'PUBL/SEMI-PUBL/INST-MH ALLOWED': '#8B5CF6',    // Light violet
    'PORT DISTRICT USE': '#5B21B6',                 // Dark purple
    'CITY LIMITS OF INV. OR C.R.': '#4C1D95',       // Very dark purple
    'TRANSPORT/COMMUNIC/UTILITIES': '#6D28D9',      // Medium purple
    
    // Special overlays - teals
    'PLANNED DEVELOPMENT OVERLAY': '#0D9488',       // Teal
  }

  return colorMap[description] || stringToColor(description)
}

/**
 * Citrus County Future Land Use color mappings
 */
export const getCitrusFLUColor = (description) => {
  // Predefined colors for major FLU categories
  const colorMap = {
    // Residential categories - blues/greens
    'LOW DENSITY RESIDENTIAL': '#3B82F6',           // Blue
    'MEDIUM DENSITY RESIDENTIAL': '#2563EB',        // Dark blue
    'HIGH DENSITY RESIDENTIAL': '#1E40AF',          // Very dark blue
    'RURAL RESIDENTIAL': '#10B981',                 // Green
    'CENTRAL RIDGE RESIDENTIAL': '#059669',         // Dark green
    'LOW INTENSITY COASTAL LAKES': '#06B6D4',       // Sky blue
    'RESIDENTIAL MIXED USE': '#6366F1',             // Indigo
    
    // Commercial categories - oranges/reds
    'GENERAL COMMERCIAL': '#EA580C',                // Orange
    'COASTAL AND LAKES COMMERCIAL': '#DC2626',      // Red
    'PROFESSIONAL SERVICE & OFFICE': '#EF4444',     // Light red
    'RURAL ACTIVITY CENTER': '#F97316',             // Light orange
    
    // Industrial categories - grays
    'INDUSTRIAL': '#6B7280',                        // Gray
    
    // Special use categories - yellows/browns
    'AGRICULTURE': '#EAB308',                       // Yellow
    'CONSERVATION': '#16A34A',                      // Forest green
    'RECREATION': '#84CC16',                        // Lime green
    'EXTRACTIVE': '#A3A3A3',                        // Neutral gray
    'MOBILE HOME PARK': '#A855F7',                  // Purple
    'RECREATIONAL VEHICLE PARK': '#A3E635',         // Light lime
    
    // Government/Public categories - purples
    'PUBLIC/SEMI-PUBLIC INSTITUTION': '#7C3AED',    // Violet
    'PORT DISTRICT USE': '#5B21B6',                 // Dark purple
    'CITY OF INVERNESS OR CR.RIVER': '#4C1D95',     // Very dark purple
    'TRANSP./COMMUNIC./UTILITIES': '#6D28D9',       // Medium purple
  }

  return colorMap[description] || stringToColor(description)
}

/**
 * Get GeoJSON style for Citrus Zoning layer
 */
export const getCitrusZoningStyle = (feature) => {
  const description = feature.properties?.descript || ''
  const color = getCitrusZoningColor(description)
  
  return {
    fillColor: color,
    weight: 1.5,
    opacity: 0.8,
    color: color,
    fillOpacity: 0.6
  }
}

/**
 * Get GeoJSON style for Citrus FLU layer
 */
export const getCitrusFLUStyle = (feature) => {
  const description = feature.properties?.descript || ''
  const color = getCitrusFLUColor(description)
  
  return {
    fillColor: color,
    weight: 1.5,
    opacity: 0.8,
    color: color,
    fillOpacity: 0.6
  }
}

/**
 * Get unique categories and their colors for legend
 */
export const getCitrusZoningLegend = (data) => {
  if (!data || !data.features) return []
  
  const categories = new Set()
  data.features.forEach(feature => {
    const desc = feature.properties?.descript
    if (desc && desc.trim() !== '') {
      categories.add(desc)
    }
  })
  
  return Array.from(categories).sort().map(desc => ({
    label: desc,
    color: getCitrusZoningColor(desc)
  }))
}

/**
 * Get unique categories and their colors for legend
 */
export const getCitrusFLULegend = (data) => {
  if (!data || !data.features) return []
  
  const categories = new Set()
  data.features.forEach(feature => {
    const desc = feature.properties?.descript
    if (desc && desc.trim() !== '') {
      categories.add(desc)
    }
  })
  
  return Array.from(categories).sort().map(desc => ({
    label: desc,
    color: getCitrusFLUColor(desc)
  }))
}