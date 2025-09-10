import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { StarIcon as StarOutline, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import dataService from '../services/dataService'
import favoritesService from '../services/favoritesService'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const ManateeMapPage = () => {
  const navigate = useNavigate()
  const mapRef = useRef()
  const [favorites, setFavorites] = useState(new Set())
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [parcelData, setParcelData] = useState(null)
  const [boundaryData, setBoundaryData] = useState(null)
  const [error, setError] = useState(null)
  const [parcelCount, setParcelCount] = useState(0)
  const [mapReady, setMapReady] = useState(false)

  // Load Manatee parcel and boundary data when component mounts
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Loading Manatee data...')
        
        // Load parcels
        const parcels = await dataService.loadManateeParcels()
        if (parcels) {
          console.log('Loaded parcels:', parcels.features?.length || 0)
          setParcelData(parcels)
          setParcelCount(parcels.features?.length || 0)
        } else {
          setError('Failed to load Manatee parcel data')
        }

        // Load future development boundary
        const boundary = await dataService.loadManateeFutureDevelopment()
        if (boundary) {
          console.log('Loaded future development boundary:', boundary.features?.length || 0, 'features')
          setBoundaryData(boundary)
        } else {
          console.log('Future development boundary not available')
        }

      } catch (err) {
        console.error('Error loading map data:', err)
        setError('Failed to load map data')
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [])

  // Load user favorites for Manatee county
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        console.log('Loading Manatee favorites...')
        const userFavorites = await favoritesService.getFavoritesByCounty('Manatee')
        const favoriteIds = new Set(userFavorites.map(fav => fav.parcel_id))
        setFavorites(favoriteIds)
        console.log('Loaded favorites:', favoriteIds.size)
      } catch (err) {
        console.error('Error loading favorites:', err)
      }
    }

    loadFavorites()
  }, [])

  // Effect to zoom to parcels when both map and data are ready
  useEffect(() => {
    if (mapReady && parcelData) {
      console.log('Both map and parcel data are ready - zooming to bounds')
      setTimeout(zoomToParcelBounds, 200)
    }
  }, [mapReady, parcelData])

  const toggleFavorite = async (parcelId) => {
    try {
      // Get parcel address for better storage
      const parcel = parcelData?.features?.find(f => f.properties.PARCEL_NUMBER === parcelId)
      const parcelAddress = parcel?.properties?.SITUS_ADDRESS || null

      // Toggle in database
      const isNowFavorited = await favoritesService.toggleFavorite(parcelId, 'Manatee', parcelAddress)
      
      // Update local state
      const newFavorites = new Set(favorites)
      if (isNowFavorited) {
        newFavorites.add(parcelId)
      } else {
        newFavorites.delete(parcelId)
      }
      setFavorites(newFavorites)
      
      console.log(`Parcel ${parcelId} ${isNowFavorited ? 'added to' : 'removed from'} favorites`)
    } catch (error) {
      console.error('Error toggling favorite:', error)
      // Could show a toast notification here
    }
  }

  // Convert favorites Set to array for easier checking
  const favoriteIds = Array.from(favorites)

  // Function to zoom map to parcel bounds
  const zoomToParcelBounds = () => {
    if (parcelData && mapRef.current) {
      const bounds = dataService.getBounds(parcelData)
      if (bounds) {
        console.log('Zooming to parcel bounds:', bounds)
        mapRef.current.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 16 
        })
      }
    }
  }

  // Handle map ready event
  const handleMapReady = () => {
    console.log('Map is ready')
    setMapReady(true)
    // If parcel data is already loaded, zoom to it
    if (parcelData) {
      setTimeout(zoomToParcelBounds, 100)
    }
  }

  // Boundary styling function
  const boundaryStyle = () => {
    return {
      fillColor: 'transparent', // No fill, just outline
      weight: 3,
      opacity: 1,
      color: '#dc2626', // Red border
      dashArray: '10, 5', // Dashed line
      fillOpacity: 0
    };
  };

  // Parcel styling function
  const parcelStyle = (feature) => {
    const parcelId = feature.properties.PARCEL_NUMBER; // Use the correct property name from GeoJSON
    const isSelected = selectedParcel === parcelId;
    const isFavorite = favoriteIds.includes(parcelId);
    
    if (isFavorite) {
      return {
        fillColor: '#f59e0b', // Amber for favorites
        weight: 2,
        opacity: 1,
        color: '#d97706',
        fillOpacity: 0.7
      };
    } else if (isSelected) {
      return {
        fillColor: '#3b82f6', // Blue for selected
        weight: 3,
        opacity: 1,
        color: '#1d4ed8',
        fillOpacity: 0.8
      };
    } else {
      return {
        fillColor: '#ffeb3b', // Vibrant bright yellow for default
        weight: 1,
        opacity: 1,
        color: '#fbc02d', // Darker vibrant yellow border
        fillOpacity: 0.7
      };
    }
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties
    
    // Create popup content
    const popupContent = `
      <div class="p-3 min-w-64">
        <h3 class="font-semibold text-base mb-2">${props.SITUS_ADDRESS || 'Unknown Address'}</h3>
        <div class="space-y-1 text-sm">
          <div><span class="font-medium">Parcel Number:</span> ${props.PARCEL_NUMBER || 'N/A'}</div>
          <div><span class="font-medium">Owner:</span> ${props.OWNER_NAME || 'Unknown'}</div>
          <div><span class="font-medium">Acres:</span> ${props.ACRES || 'N/A'}</div>
          <div><span class="font-medium">Land Value:</span> $${props.CER_LAND_VALUE ? Number(props.CER_LAND_VALUE).toLocaleString() : 'N/A'}</div>
          <div><span class="font-medium">Just Value:</span> $${props.CER_JUST_VALUE ? Number(props.CER_JUST_VALUE).toLocaleString() : 'N/A'}</div>
          <div><span class="font-medium">Legal:</span> ${props.LEGAL1 || 'N/A'}</div>
        </div>
        <div class="mt-3 flex gap-2">
          <button 
            onclick="window.selectParcel('${props.PARCEL_NUMBER}')"
            class="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
          >
            Select
          </button>
          <button 
            onclick="window.toggleFavorite('${props.PARCEL_NUMBER}')"
            class="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
          >
            ${favoriteIds.includes(props.PARCEL_NUMBER) ? 'Unfavorite' : 'Favorite'}
          </button>
        </div>
      </div>
    `
    
    layer.bindPopup(popupContent)

    // Add click handler for parcel selection
    layer.on('click', () => {
      setSelectedParcel(props.PARCEL_NUMBER)
    })
  }

  // Make functions available globally for popup buttons
  useEffect(() => {
    window.selectParcel = (parcelId) => {
      setSelectedParcel(parcelId)
    }

    window.toggleFavorite = (parcelId) => {
      toggleFavorite(parcelId)
    }

    // Cleanup
    return () => {
      delete window.selectParcel
      delete window.toggleFavorite
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Manatee County parcels...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h2 className="font-bold">Error Loading Map</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Manatee County Parcels</h1>
              <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {parcelCount.toLocaleString()} parcels
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <StarSolid className="h-5 w-5 text-amber-500" />
                <span>{favorites.size} favorited</span>
              </div>
              
              {selectedParcel && (
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-lg">
                  <span className="text-sm text-blue-700">Selected: {selectedParcel}</span>
                  <button
                    onClick={() => setSelectedParcel(null)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[calc(100vh-80px)]">
        <MapContainer
          ref={mapRef}
          center={[27.4989, -82.5748]} // Manatee County center
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          whenReady={handleMapReady}
        >
          {/* Aerial imagery base layer */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          
          {/* Esri Reference Overlay - Roads and Labels */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            opacity={0.9}
          />

          {/* Future Development Boundary layer */}
          {boundaryData && (
            <GeoJSON
              key="manatee-boundary"
              data={boundaryData}
              style={boundaryStyle}
              onEachFeature={(feature, layer) => {
                // Add popup for boundary info
                layer.bindPopup(`
                  <div class="p-3">
                    <h3 class="font-semibold text-base mb-2">Future Development Boundary</h3>
                    <p class="text-sm text-gray-600">Manatee County planned development area</p>
                  </div>
                `)
              }}
            />
          )}

          {/* Parcel data layer */}
          {parcelData && (
            <GeoJSON
              key="manatee-parcels"
              data={parcelData}
              style={parcelStyle}
              onEachFeature={onEachFeature}
              onAdd={() => {
                console.log('GeoJSON layer added to map')
                // Zoom to bounds when the layer is actually added
                setTimeout(zoomToParcelBounds, 100)
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10">
        <h3 className="font-semibold text-sm mb-3">Legend</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-yellow-600 rounded" style={{backgroundColor: '#ffeb3b'}}></div>
            <span>Available Parcels</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
            <span>Selected Parcel</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-amber-500 border border-amber-600 rounded"></div>
            <span>Favorited Parcels</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-red-600" style={{borderStyle: 'dashed', borderWidth: '1px', borderColor: '#dc2626'}}></div>
            <span>Future Development Boundary</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManateeMapPage
