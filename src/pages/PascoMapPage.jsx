import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, LayersControl } from 'react-leaflet'
import { StarIcon as StarOutline, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import dataService from '../services/dataService'
import favoritesService from '../services/favoritesService'
import ParcelInfoPanel from '../components/ParcelInfoPanel'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const PascoMapPage = () => {
  const navigate = useNavigate()
  const mapRef = useRef()
  const [favorites, setFavorites] = useState(new Set())
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [selectedParcelData, setSelectedParcelData] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [parcelData, setParcelData] = useState(null)
  const [error, setError] = useState(null)
  const [parcelCount, setParcelCount] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [computedCenter, setComputedCenter] = useState(null)

  // Load Pasco parcel data when component mounts
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Loading Pasco parcel data...')
        const parcels = await dataService.loadPascoParcels()
        if (parcels) {
          console.log('Loaded parcels:', parcels.features?.length || 0)
          setParcelData(parcels)
          setParcelCount(parcels.features?.length || 0)
          const bounds = dataService.getBounds(parcels)
            if (bounds) {
              const [[minLat, minLng],[maxLat,maxLng]] = bounds
              setComputedCenter([(minLat+maxLat)/2, (minLng+maxLng)/2])
            }
        } else {
          setError('Failed to load Pasco parcel data')
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

  // Load user favorites for Pasco county
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        console.log('Loading Pasco favorites...')
        const userFavorites = await favoritesService.getFavoritesByCounty('Pasco')
        const favoriteIds = new Set(userFavorites.map(fav => fav.parcel_id))
        setFavorites(favoriteIds)
        console.log('Loaded favorites:', favoriteIds.size)
      } catch (err) {
        console.error('Error loading favorites:', err)
      }
    }

    loadFavorites()
  }, [])

  // Function to zoom map to parcel bounds (moved above effect to avoid TDZ in dependency array)
  const zoomToParcelBounds = useCallback(() => {
    if (parcelData && mapRef.current) {
      const bounds = dataService.getBounds(parcelData)
      if (bounds) {
        console.log('=== PASCO BOUNDS ANALYSIS ===')
        console.log('Calculated bounds:', bounds)
        console.log('Southwest corner (lat, lng):', bounds[0])
        console.log('Northeast corner (lat, lng):', bounds[1])
        console.log('Number of features:', parcelData.features?.length)
        const [[minLat, minLng],[maxLat,maxLng]] = bounds
        const centerLat = (minLat+maxLat)/2
        const centerLng = (minLng+maxLng)/2
        console.log(`Calculated center: [${centerLat}, ${centerLng}]`)
        console.log('Calling fitBounds with padding [40,40] and maxZoom 14...')
        mapRef.current.fitBounds(bounds, { padding: [40,40], maxZoom: 14 })
        setTimeout(() => {
          const c = mapRef.current.getCenter()
          console.log('Post-fit center:', c)
        }, 600)
      }
    }
  }, [parcelData])

  // Effect to zoom to parcels when both map and data are ready
  useEffect(() => {
    if (mapReady && parcelData) {
      console.log('Both map and parcel data are ready - zooming to bounds')
      setTimeout(zoomToParcelBounds, 500) // Increased delay for better reliability
    }
  }, [mapReady, parcelData, zoomToParcelBounds])

  const toggleFavorite = useCallback(async (parcelId) => {
    try {
      // Get parcel address for better storage
      const parcel = parcelData?.features?.find(f => f.properties.PARCEL_UID === parcelId)
      const parcelAddress = `${parcel?.properties?.ADRNO || ''} ${parcel?.properties?.ADRDIR || ''} ${parcel?.properties?.ADRSTR || ''} ${parcel?.properties?.ADRSUF || ''}`.trim() || null

      // Toggle in database
      const isNowFavorited = await favoritesService.toggleFavorite(parcelId, 'Pasco', parcelAddress)
      
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
  }, [parcelData, favorites])

  // Convert favorites Set to array for easier checking
  const favoriteIds = Array.from(favorites)

  // Handle map ready event
  const handleMapReady = () => {
    console.log('Map is ready')
  console.log('Initial map ready. Will fit to data bounds.')
    setMapReady(true)
    // If parcel data is already loaded, zoom to it
    if (parcelData) {
      setTimeout(zoomToParcelBounds, 100)
    }
  }

  // Parcel styling function
  const parcelStyle = (feature) => {
    const parcelId = feature.properties.PARCEL_UID; // Use the correct property name from GeoJSON
    const isSelected = selectedParcel === parcelId;
    const isFavorite = favoriteIds.includes(parcelId);
    
    if (isSelected) {
      return {
        fillColor: '#3b82f6', // Blue for selected
        weight: 3,
        color: '#1d4ed8',
        fillOpacity: 0.8
      };
    } else if (isFavorite) {
      return {
        fillColor: '#f59e0b', // Amber for favorites
        weight: 2,
        opacity: 1,
        color: '#d97706',
        fillOpacity: 0.7
      };
    } else {
      return {
        fillColor: '#ffeb3b', // Bright yellow for Pasco County
        weight: 1,
        opacity: 1,
        color: '#fbc02d', // Darker yellow border
        fillOpacity: 0.7
      };
    }
  };

  // (zoomToParcelBounds defined above)

  const onEachFeature = (feature, layer) => {
    // Add click handler for parcel selection
    layer.on('click', () => {
      setSelectedParcel(feature.properties.PARCEL_UID)
      setSelectedParcelData(feature)
      setShowInfoPanel(true)
    })

    // Add hover effects
    layer.on('mouseover', () => {
      layer.setStyle({
        weight: 3,
        fillOpacity: 0.8
      })
    })

    layer.on('mouseout', () => {
      // Reset to normal style unless selected
      if (selectedParcel !== feature.properties.PARCEL_UID) {
        layer.setStyle(parcelStyle(feature))
      }
    })
  }

  // Clean up function to close info panel
  const handleCloseInfoPanel = () => {
    setShowInfoPanel(false)
    setSelectedParcel(null)
    setSelectedParcelData(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Pasco County parcels...</p>
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
                onClick={() => navigate('/')}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Pasco County Parcels</h1>
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
                    onClick={handleCloseInfoPanel}
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
          center={computedCenter || [28.35, -82.50]} // fallback until bounds applied
          zoom={9}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          whenReady={handleMapReady}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Imagery">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri'
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="OSM">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay checked name="Reference (Esri)">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri'
                opacity={0.9}
              />
            </LayersControl.Overlay>
          </LayersControl>

          {/* Parcel data layer */}
          {parcelData && (
            <GeoJSON
              key="pasco-parcels"
              data={parcelData}
              style={parcelStyle}
              onEachFeature={onEachFeature}
              onAdd={() => {
                console.log('GeoJSON layer added to map')
                // Zoom to bounds when the layer is actually added
                setTimeout(zoomToParcelBounds, 300)
              }}
            />
          )}

          {/* Debug center marker removed */}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 space-y-3">
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
          <div className="pt-2 border-t border-gray-200 flex flex-col gap-2"></div>
          {computedCenter && (
            <div className="text-[10px] text-gray-600">
              Center: {computedCenter[0].toFixed(4)}, {computedCenter[1].toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Parcel Information Panel */}
      <ParcelInfoPanel
        parcel={selectedParcelData}
        isOpen={showInfoPanel}
        onClose={handleCloseInfoPanel}
        onToggleFavorite={toggleFavorite}
        isFavorite={selectedParcel ? favorites.has(selectedParcel) : false}
        county="Pasco"
      />
    </div>
  )
}

export default PascoMapPage
