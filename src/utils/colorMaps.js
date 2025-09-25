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

/**
 * Pasco County Zoning color mappings
 */
export const getPascoZoningColor = (znType) => {
  // Predefined colors for major zoning categories
  const colorMap = {
    // Residential categories - blues/greens
    'RSF-1': '#3B82F6',       // Single Family Residential - Blue
    'RSF-2': '#60A5FA',       // Single Family Residential - Light blue
    'RSF-3': '#2563EB',       // Single Family Residential - Dark blue
    'RSF-4': '#1E40AF',       // Single Family Residential - Very dark blue
    'RSF-5': '#1D4ED8',       // Single Family Residential - Medium blue
    'RTH': '#10B981',         // Townhouse Residential - Green
    'RMF-1': '#34D399',       // Multi-Family Residential - Light green
    'RMF-2': '#059669',       // Multi-Family Residential - Dark green
    'RMF-3': '#047857',       // Multi-Family Residential - Forest green
    'RMH': '#A855F7',         // Mobile Home - Purple
    'PUD': '#6366F1',         // Planned Unit Development - Indigo
    'RR': '#16A34A',          // Rural Residential - Forest green
    
    // Commercial categories - oranges/reds
    'C-1': '#EA580C',         // Neighborhood Commercial - Orange
    'C-2': '#F97316',         // General Commercial - Light orange
    'C-3': '#FB923C',         // Highway Commercial - Lighter orange
    'C-4': '#DC2626',         // Service Commercial - Red
    'C-5': '#EF4444',         // Professional Office - Light red
    'CC': '#F87171',          // Community Commercial - Lighter red
    'TC': '#FCA5A5',          // Tourist Commercial - Very light red
    
    // Industrial categories - grays/browns
    'I-1': '#6B7280',         // Light Industrial - Gray
    'I-2': '#4B5563',         // General Industrial - Dark gray
    'I-3': '#374151',         // Heavy Industrial - Very dark gray
    'BP': '#9CA3AF',          // Business Park - Light gray
    
    // Agricultural/Rural categories - yellows/browns
    'A-1': '#EAB308',         // Agricultural - Yellow
    'A-2': '#FACC15',         // Agricultural Intensive - Light yellow
    'AR': '#F59E0B',          // Agricultural Residential - Amber
    
    // Special use categories - various
    'PF': '#7C3AED',          // Public Facilities - Violet
    'CON': '#16A34A',         // Conservation - Forest green
    'REC': '#84CC16',         // Recreation - Lime green
    'EX': '#A3A3A3',          // Extractive - Neutral gray
    'T': '#6D28D9',           // Transportation - Medium purple
    'W': '#0891B2',           // Water - Cyan
    'RV': '#A3E635',          // Recreational Vehicle - Light lime
    
    // Mixed use categories
    'MU': '#F472B6',          // Mixed Use - Pink
    'MUD': '#EC4899',         // Mixed Use Development - Dark pink
    'DRI': '#BE185D',         // Development of Regional Impact - Very dark pink
  }

  return colorMap[znType] || stringToColor(znType)
}

/**
 * Pasco County Future Land Use color mappings
 */
export const getPascoFLUColor = (description) => {
  // Predefined colors for major FLU categories
  const colorMap = {
    // Residential categories - blues/greens
    'Low Density Residential': '#3B82F6',           // Blue
    'Medium Density Residential': '#2563EB',        // Dark blue
    'High Density Residential': '#1E40AF',          // Very dark blue
    'Rural Residential': '#10B981',                 // Green
    'Estate Residential': '#059669',                // Dark green
    'Mobile Home Residential': '#A855F7',           // Purple
    'Planned Residential Development': '#6366F1',   // Indigo
    
    // Commercial categories - oranges/reds
    'Neighborhood Commercial': '#EA580C',           // Orange
    'Community Commercial': '#F97316',              // Light orange
    'General Commercial': '#FB923C',                // Lighter orange
    'Highway Commercial': '#DC2626',                // Red
    'Tourist Commercial': '#EF4444',                // Light red
    'Professional Office': '#F87171',               // Lighter red
    'Service Commercial': '#FCA5A5',                // Very light red
    
    // Industrial categories - grays
    'Light Industrial': '#9CA3AF',                  // Light gray
    'General Industrial': '#6B7280',                // Gray
    'Heavy Industrial': '#4B5563',                  // Dark gray
    'Business Park': '#374151',                     // Very dark gray
    
    // Mixed use categories
    'Mixed Use': '#F472B6',                         // Pink
    'Mixed Use Development': '#EC4899',             // Dark pink
    'Town Center': '#BE185D',                       // Very dark pink
    
    // Agricultural/Rural categories - yellows/browns
    'Agriculture': '#EAB308',                       // Yellow
    'Agricultural Residential': '#FACC15',          // Light yellow
    'Silviculture': '#F59E0B',                      // Amber
    'Rural Activity Center': '#D97706',             // Dark amber
    
    // Special use categories
    'Public Facilities': '#7C3AED',                 // Violet
    'Conservation': '#16A34A',                      // Forest green
    'Recreation': '#84CC16',                        // Lime green
    'Extractive': '#A3A3A3',                        // Neutral gray
    'Transportation': '#6D28D9',                    // Medium purple
    'Water': '#0891B2',                             // Cyan
    'Wellfield Protection': '#06B6D4',              // Sky blue
    'Airport': '#5B21B6',                           // Dark purple
    'Port District': '#4C1D95',                     // Very dark purple
  }

  return colorMap[description] || stringToColor(description)
}

/**
 * Get GeoJSON style for Pasco Zoning layer
 */
export const getPascoZoningStyle = (feature) => {
  const znType = feature.properties?.ZN_TYPE || ''
  const color = getPascoZoningColor(znType)
  
  return {
    fillColor: color,
    weight: 1.5,
    opacity: 0.8,
    color: color,
    fillOpacity: 0.6
  }
}

/**
 * Get GeoJSON style for Pasco FLU layer
 */
export const getPascoFLUStyle = (feature) => {
  const description = feature.properties?.DESCRIPTION || ''
  const color = getPascoFLUColor(description)
  
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
export const getPascoZoningLegend = (data) => {
  if (!data || !data.features) return []
  
  const categories = new Set()
  data.features.forEach(feature => {
    const znType = feature.properties?.ZN_TYPE
    if (znType && znType.trim() !== '') {
      categories.add(znType)
    }
  })
  
  return Array.from(categories).sort().map(znType => ({
    label: znType,
    color: getPascoZoningColor(znType)
  }))
}

/**
 * Get unique categories and their colors for legend
 */
export const getPascoFLULegend = (data) => {
  if (!data || !data.features) return []
  
  const categories = new Set()
  data.features.forEach(feature => {
    const desc = feature.properties?.DESCRIPTION
    if (desc && desc.trim() !== '') {
      categories.add(desc)
    }
  })
  
  return Array.from(categories).sort().map(desc => ({
    label: desc,
    color: getPascoFLUColor(desc)
  }))
}

/**
 * Hernando County Zoning color mappings
 */
export const getHernandoZoningColor = (zoneDesc) => {
  // Predefined colors for major zoning categories
  const colorMap = {
    // Residential categories - blues/greens
    'Residential Single Family Low Density': '#3B82F6',          // Blue
    'Residential Single Family Medium Density': '#2563EB',       // Dark blue
    'Residential Single Family High Density': '#1E40AF',         // Very dark blue
    'Residential Multi-Family Low Density': '#10B981',           // Green
    'Residential Multi-Family Medium Density': '#059669',        // Dark green
    'Residential Multi-Family High Density': '#047857',          // Forest green
    'Residential Estate': '#16A34A',                             // Forest green
    'Residential Rural': '#22C55E',                              // Light green
    'Residential Mobile Home': '#A855F7',                        // Purple
    'Planned Unit Development': '#6366F1',                       // Indigo
    'Traditional Neighborhood Development': '#8B5CF6',           // Light purple
    
    // Commercial categories - oranges/reds
    'Commercial Neighborhood': '#EA580C',                        // Orange
    'Commercial General': '#F97316',                             // Light orange
    'Commercial Highway': '#FB923C',                             // Lighter orange
    'Commercial Professional': '#EF4444',                        // Light red
    'Commercial Tourist': '#F87171',                             // Lighter red
    'Commercial Recreation': '#FCA5A5',                          // Very light red
    'Mixed Use': '#F472B6',                                      // Pink
    
    // Industrial categories - grays
    'Industrial Light': '#9CA3AF',                               // Light gray
    'Industrial General': '#6B7280',                             // Gray
    'Industrial Heavy': '#4B5563',                               // Dark gray
    'Business Park': '#374151',                                  // Very dark gray
    
    // Agricultural/Rural categories - yellows/browns
    'Agricultural': '#EAB308',                                   // Yellow
    'Agricultural Intensive': '#FACC15',                         // Light yellow
    'Forestry': '#F59E0B',                                       // Amber
    'Rural Activity Center': '#D97706',                          // Dark amber
    
    // Special use categories - various
    'Public/Semi-Public': '#7C3AED',                             // Violet
    'Conservation': '#16A34A',                                   // Forest green
    'Recreation': '#84CC16',                                     // Lime green
    'Extractive': '#A3A3A3',                                     // Neutral gray
    'Transportation': '#6D28D9',                                 // Medium purple
    'Utilities': '#5B21B6',                                      // Dark purple
    'Water': '#0891B2',                                          // Cyan
    'Wellfield Protection': '#06B6D4',                           // Sky blue
  }

  return colorMap[zoneDesc] || stringToColor(zoneDesc)
}

/**
 * Hernando County Future Land Use color mappings
 */
export const getHernandoFLUColor = (label) => {
  // Predefined colors for major FLU categories
  const colorMap = {
    // Residential categories - blues/greens
    'Low Density Residential': '#3B82F6',                        // Blue
    'Medium Density Residential': '#2563EB',                     // Dark blue
    'High Density Residential': '#1E40AF',                       // Very dark blue
    'Estate Residential': '#10B981',                             // Green
    'Rural Residential': '#059669',                              // Dark green
    'Mobile Home Residential': '#A855F7',                        // Purple
    'Planned Residential Development': '#6366F1',                // Indigo
    'Traditional Neighborhood Development': '#8B5CF6',           // Light purple
    
    // Commercial categories - oranges/reds
    'Neighborhood Commercial': '#EA580C',                        // Orange
    'Community Commercial': '#F97316',                           // Light orange
    'General Commercial': '#FB923C',                             // Lighter orange
    'Highway Commercial': '#DC2626',                             // Red
    'Tourist Commercial': '#EF4444',                             // Light red
    'Professional Office': '#F87171',                            // Lighter red
    'Recreation Commercial': '#FCA5A5',                          // Very light red
    
    // Mixed use categories
    'Mixed Use': '#F472B6',                                      // Pink
    'Mixed Use Development': '#EC4899',                          // Dark pink
    'Town Center': '#BE185D',                                    // Very dark pink
    
    // Industrial categories - grays
    'Light Industrial': '#9CA3AF',                               // Light gray
    'General Industrial': '#6B7280',                             // Gray
    'Heavy Industrial': '#4B5563',                               // Dark gray
    'Business Park': '#374151',                                  // Very dark gray
    
    // Agricultural/Rural categories - yellows/browns
    'Agriculture': '#EAB308',                                    // Yellow
    'Agricultural Intensive': '#FACC15',                         // Light yellow
    'Silviculture': '#F59E0B',                                   // Amber
    'Rural Activity Center': '#D97706',                          // Dark amber
    'Forestry': '#92400E',                                       // Brown
    
    // Special use categories
    'Public/Semi-Public': '#7C3AED',                             // Violet
    'Conservation': '#16A34A',                                   // Forest green
    'Recreation': '#84CC16',                                     // Lime green
    'Extractive': '#A3A3A3',                                     // Neutral gray
    'Transportation': '#6D28D9',                                 // Medium purple
    'Utilities': '#5B21B6',                                      // Dark purple
    'Water': '#0891B2',                                          // Cyan
    'Wellfield Protection': '#06B6D4',                           // Sky blue
  }

  return colorMap[label] || stringToColor(label)
}

/**
 * Get GeoJSON style for Hernando Zoning layer
 */
export const getHernandoZoningStyle = (feature) => {
  const zoneDesc = feature.properties?.ZONEDESC || ''
  const color = getHernandoZoningColor(zoneDesc)
  
  return {
    fillColor: color,
    weight: 1.5,
    opacity: 0.8,
    color: color,
    fillOpacity: 0.6
  }
}

/**
 * Get GeoJSON style for Hernando FLU layer
 */
export const getHernandoFLUStyle = (feature) => {
  const label = feature.properties?.LABEL || ''
  const color = getHernandoFLUColor(label)
  
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
export const getHernandoZoningLegend = (data) => {
  if (!data || !data.features) return []
  
  const categories = new Set()
  data.features.forEach(feature => {
    const zoneDesc = feature.properties?.ZONEDESC
    if (zoneDesc && zoneDesc.trim() !== '') {
      categories.add(zoneDesc)
    }
  })
  
  return Array.from(categories).sort().map(zoneDesc => ({
    label: zoneDesc,
    color: getHernandoZoningColor(zoneDesc)
  }))
}

/**
 * Get unique categories and their colors for legend
 */
export const getHernandoFLULegend = (data) => {
  if (!data || !data.features) return []
  
  const categories = new Set()
  data.features.forEach(feature => {
    const label = feature.properties?.LABEL
    if (label && label.trim() !== '') {
      categories.add(label)
    }
  })
  
  return Array.from(categories).sort().map(label => ({
    label: label,
    color: getHernandoFLUColor(label)
  }))
}

/**
 * Polk County Future Land Use color mappings
 */
export const getPolkFLUColor = (fluName) => {
  // Predefined colors for Polk County FLU categories (actual category names)
  const colorMap = {
    // Residential categories - blues/greens
    'RL-1': '#3B82F6',          // Low Density Residential - Blue
    'RL-2': '#2563EB',          // Low Density Residential 2 - Dark blue  
    'RL-3': '#1E40AF',          // Low Density Residential 3 - Very dark blue
    'RL-4': '#1D4ED8',          // Low Density Residential 4 - Navy blue
    'RM': '#10B981',            // Medium Density Residential - Green
    'RS': '#059669',            // Residential Single Family - Dark green
    'RH': '#6366F1',            // High Density Residential - Indigo
    'A/RR': '#22C55E',          // Agriculture/Rural Residential - Light green
    
    // Commercial categories - oranges/reds
    'CC': '#EA580C',            // Community Commercial - Orange
    'NAC': '#F97316',           // Neighborhood Activity Center - Light orange
    'CAC': '#FB923C',           // Community Activity Center - Lighter orange
    'RAC': '#DC2626',           // Regional Activity Center - Red
    'TC': '#EF4444',            // Town Center - Light red
    'TCC': '#F87171',           // Town Center Core - Lighter red
    'CE': '#FB923C',            // Commercial Entertainment - Lighter orange
    'OC': '#F59E0B',            // Office Commercial - Amber
    
    // Mixed use/Business categories - pinks
    'BPC-1': '#F472B6',         // Business Park Commercial 1 - Pink
    'BPC-2': '#EC4899',         // Business Park Commercial 2 - Dark pink
    'RCC': '#BE185D',           // Regional City Center - Very dark pink
    'RCC-R': '#DB2777',         // Regional City Center Residential - Medium pink
    'CORE': '#A21CAF',          // Core Area - Dark pink
    
    // Industrial categories - grays
    'IND': '#6B7280',           // Industrial - Gray
    'LCC': '#9CA3AF',           // Light Commercial/Industrial - Light gray
    'HIC': '#4B5563',           // Heavy Industrial Commercial - Dark gray
    'PI': '#374151',            // Port Industrial - Very dark gray
    'IAC': '#6B7280',           // Industrial Activity Center - Gray
    
    // Institutional/Public categories - purples
    'INST-1': '#7C3AED',        // Institutional 1 - Violet
    'INST-2': '#5B21B6',        // Institutional 2 - Dark purple
    'PM': '#8B5CF6',            // Public/Municipal - Medium purple
    
    // Special/Other categories
    'CITY': '#F59E0B',          // City - Amber
    'PRESV': '#16A34A',         // Preservation - Forest green
    'ROS': '#84CC16',           // Recreation/Open Space - Lime green
    'LR': '#0891B2',            // Lakes/Recreation - Cyan
    'EC': '#06B6D4',            // Environmental Conservation - Sky blue
    'DRI': '#D97706',           // Development of Regional Impact - Dark amber
    
    // Default fallback color for any unmapped categories
    'DEFAULT': '#9CA3AF'        // Light gray
  }

  return colorMap[fluName] || stringToColor(fluName)
}

/**
 * Get GeoJSON style for Polk FLU layer
 */
export const getPolkFLUStyle = (feature) => {
  const fluName = feature.properties?.FLUNAME || ''
  const color = getPolkFLUColor(fluName)
  
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
export const getPolkFLULegend = (data) => {
  if (!data || !data.features) return []
  
  const categories = new Set()
  data.features.forEach(feature => {
    const fluName = feature.properties?.FLUNAME
    if (fluName && fluName.trim() !== '') {
      categories.add(fluName)
    }
  })
  
  return Array.from(categories).sort().map(fluName => ({
    label: fluName,
    color: getPolkFLUColor(fluName)
  }))
}