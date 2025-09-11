/**
 * Data Service for loading GeoJSON files
 * Simplified structure - all files in /public/data/
 */

class DataService {
  constructor() {
    this.cache = new Map()
    this.baseUrl = '/data'
  }

  /**
   * Load Hernando County parcels
   * @returns {Promise<Object|null>} GeoJSON parcel data
   */
  async loadHernandoParcels() {
    const cacheKey = 'hernando-parcels'
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const response = await fetch(`${this.baseUrl}/Hernando_Parcels.geojson`)
      
      if (!response.ok) {
        throw new Error(`Hernando parcels not found (${response.status})`)
      }
      
      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error loading Hernando parcels:', error)
      return null
    }
  }

  /**
   * Load Manatee County parcels
   * @returns {Promise<Object|null>} GeoJSON parcel data
   */
  async loadManateeParcels() {
    const cacheKey = 'manatee-parcels'
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const response = await fetch(`${this.baseUrl}/Manatee_Parcels.geojson`)
      
      if (!response.ok) {
        throw new Error(`Manatee parcels not found (${response.status})`)
      }
      
      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error loading Manatee parcels:', error)
      return null
    }
  }

  /**
   * Load Citrus County parcels
   * @returns {Promise<Object|null>} GeoJSON parcel data
   */
  async loadCitrusParcels(forceReload = false) {
    const cacheKey = 'citrus-parcels'
    if (!forceReload && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    if (forceReload) {
      this.cache.delete(cacheKey)
    }
    try {
      const response = await fetch(`${this.baseUrl}/Citrus_Parcels.geojson?_ts=${Date.now()}`) // cache-bust
      if (!response.ok) {
        throw new Error(`Citrus parcels not found (${response.status})`)
      }
      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error loading Citrus parcels:', error)
      return null
    }
  }

  /**
   * Load Pasco County parcels
   * @returns {Promise<Object|null>} GeoJSON parcel data
   */
  async loadPascoParcels() {
    const cacheKey = 'pasco-parcels'
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const response = await fetch(`${this.baseUrl}/Pasco_Parcels.geojson`)
      
      if (!response.ok) {
        throw new Error(`Pasco parcels not found (${response.status})`)
      }
      
      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error loading Pasco parcels:', error)
      return null
    }
  }

  /**
   * Load Polk County parcels
   * @returns {Promise<Object|null>} GeoJSON parcel data
   */
  async loadPolkParcels() {
    const cacheKey = 'polk-parcels'
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const response = await fetch(`${this.baseUrl}/Polk_Parcels.json`)
      
      if (!response.ok) {
        throw new Error(`Polk parcels not found (${response.status})`)
      }
      
      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error loading Polk parcels:', error)
      return null
    }
  }

  /**
   * Load Polk County Development Areas
   * @returns {Promise<Object|null>} GeoJSON development area data
   */
  async loadPolkDevelopmentAreas() {
    const cacheKey = 'polk-development-areas'
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const response = await fetch(`${this.baseUrl}/Polk_Development_Areas.geojson`)
      
      if (!response.ok) {
        throw new Error(`Polk development areas not found (${response.status})`)
      }
      
      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error loading Polk development areas:', error)
      return null
    }
  }

  /**
   * Load Manatee Future Development Boundary
   * @returns {Promise<Object|null>} GeoJSON boundary data
   */
  async loadManateeFutureDevelopment() {
    const cacheKey = 'manatee-future-dev'
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const response = await fetch(`${this.baseUrl}/Manatee_Future_Development_Boundary.json`)
      
      if (!response.ok) {
        throw new Error(`Manatee future development boundary not found (${response.status})`)
      }
      
      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error loading Manatee future development boundary:', error)
      return null
    }
  }

  /**
   * Get the bounds of a GeoJSON feature collection
   * @param {Object} geojson - GeoJSON data
   * @returns {Array|null} Bounds as [[south, west], [north, east]]
   */
  getBounds(geojson) {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      return null
    }

    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity

    const processCoordinate = (coord) => {
      const [lng, lat] = coord
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }

    const processGeometry = (geometry) => {
      if (geometry.type === 'Point') {
        processCoordinate(geometry.coordinates)
      } else if (geometry.type === 'LineString') {
        geometry.coordinates.forEach(processCoordinate)
      } else if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(ring => ring.forEach(processCoordinate))
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => 
          polygon.forEach(ring => ring.forEach(processCoordinate))
        )
      }
    }

    geojson.features.forEach(feature => {
      if (feature.geometry) {
        processGeometry(feature.geometry)
      }
    })

    if (minLat === Infinity) return null

    return [[minLat, minLng], [maxLat, maxLng]]
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }
}

// Create and export singleton instance
export const dataService = new DataService()
export default dataService
