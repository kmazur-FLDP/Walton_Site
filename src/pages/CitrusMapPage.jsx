import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, LayersControl } from 'react-leaflet'
import { StarIcon as StarOutline, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import dataService from '../services/dataService'
import favoritesService from '../services/favoritesService'
import ParcelInfoPanel from '../components/ParcelInfoPanel'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Custom ArcGIS Dynamic Layer for Map Services using ImageOverlay approach
const createArcGISDynamicLayer = (url, options = {}) => {
  // Create a custom layer that extends L.Layer
  const DynamicLayer = L.Layer.extend({
    initialize: function(url, options) {
      this._url = url;
      L.setOptions(this, options);
    },

    onAdd: function(map) {
      this._map = map;
      this._update();
      map.on('moveend zoomend', this._update, this);
    },

    onRemove: function(map) {
      if (this._imageOverlay) {
        map.removeLayer(this._imageOverlay);
      }
      map.off('moveend zoomend', this._update, this);
    },

    _update: function() {
      if (!this._map) return;
      
      const bounds = this._map.getBounds();
      const size = this._map.getSize();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      // Convert to Web Mercator (EPSG:3857)
      const swPoint = L.CRS.EPSG3857.project(sw);
      const nePoint = L.CRS.EPSG3857.project(ne);
      
      const bbox = `${swPoint.x},${swPoint.y},${nePoint.x},${nePoint.y}`;
      
      const imageUrl = `${this._url}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size.x},${size.y}&format=png32&transparent=true&f=image`;
      
      // Remove existing overlay if any
      if (this._imageOverlay) {
        this._map.removeLayer(this._imageOverlay);
      }
      
      // Create new image overlay
      this._imageOverlay = L.imageOverlay(imageUrl, bounds, {
        opacity: this.options.opacity || 0.7,
        pane: this.options.pane
      });
      
      this._imageOverlay.addTo(this._map);
    }
  });

  return new DynamicLayer(url, options);
}

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const CitrusMapPage = () => {
  const navigate = useNavigate()
  const mapRef = useRef()
  const [favorites, setFavorites] = useState(new Set())
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [parcelData, setParcelData] = useState(null)
  const [error, setError] = useState(null)
  const [parcelCount, setParcelCount] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [computedCenter, setComputedCenter] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [panelParcel, setPanelParcel] = useState(null)
  const [showWetlands, setShowWetlands] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)
  const [wetlandsLayer, setWetlandsLayer] = useState(null)
  const [showFloodplain, setShowFloodplain] = useState(false)
  const [floodplainLayer, setFloodplainLayer] = useState(null)

  // Load Citrus parcel data when component mounts
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Loading Citrus parcel data...')
        const parcels = await dataService.loadCitrusParcels()
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
          setError('Failed to load Citrus parcel data')
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

  // Load user favorites for Citrus county
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        console.log('Loading Citrus favorites...')
        const userFavorites = await favoritesService.getFavoritesByCounty('Citrus')
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
  // Function to zoom map to parcel bounds (moved above effect to avoid TDZ in dependency array)
  const zoomToParcelBounds = useCallback(() => {
    if (parcelData && mapRef.current) {
      const bounds = dataService.getBounds(parcelData)
      if (bounds) {
        console.log('=== CITRUS BOUNDS ANALYSIS ===')
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

  useEffect(() => {
    if (mapReady && parcelData) {
      console.log('Both map and parcel data are ready - zooming to bounds')
      setTimeout(zoomToParcelBounds, 500) // Increased delay for better reliability
    }
  }, [mapReady, parcelData, zoomToParcelBounds])

  // Wetlands layer management
  useEffect(() => {
    if (!mapInstance) return

    if (showWetlands) {
      console.log('Adding wetlands layer')
      const wetlands = createArcGISDynamicLayer(
        'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer',
        { opacity: 0.7 }
      )
      wetlands.addTo(mapInstance)
      setWetlandsLayer(wetlands)
    } else {
      console.log('Removing wetlands layer')
      if (wetlandsLayer) {
        mapInstance.removeLayer(wetlandsLayer)
        setWetlandsLayer(null)
      }
    }

    return () => {
      if (wetlandsLayer) {
        mapInstance.removeLayer(wetlandsLayer)
      }
    }
  }, [showWetlands, mapInstance])

  // Floodplain layer management using PMTiles
  useEffect(() => {
    if (!mapInstance) return

    if (showFloodplain && !floodplainLayer) {
      console.log('Adding floodplain layer to map...')
      const loadFloodplain = async () => {
        try {
          console.log('Loading PMTiles floodplain data...')
          const { PMTiles } = await import('pmtiles')
          const pmtiles = new PMTiles('https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/tiles/floodplain.pmtiles')
          
          const header = await pmtiles.getHeader()
          const metadata = await pmtiles.getMetadata()
          console.log('PMTiles Metadata:', metadata)
          
          // Try to use leafletRasterLayer if it exists
          let layer
          try {
            const { leafletRasterLayer } = await import('pmtiles')
            layer = leafletRasterLayer(pmtiles, {
              attribution: '&copy; <a href="https://www.swfwmd.state.fl.us/">Southwest Florida Water Management District</a>',
              opacity: 0.8,
              maxZoom: 20,
              minZoom: 5
            })
            
            console.log('PMTiles floodplain layer created - supporting zoom levels 5-20')
            console.log('PMTiles floodplain layer created successfully')
            
          } catch (rasterError) {
            console.log('leafletRasterLayer not available:', rasterError.message, 'trying custom implementation...')
            
            // Custom tile layer implementation
            const CustomPMTilesLayer = L.TileLayer.extend({
              initialize: function(pmtilesInstance, options) {
                this.pmtiles = pmtilesInstance
                L.TileLayer.prototype.initialize.call(this, '', options)
              },
              
              getTileUrl: function() {
                return ''
              },
              
              createTile: function(coords, done) {
                const tile = document.createElement('div')
                tile.style.width = '256px'
                tile.style.height = '256px'
                tile.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'
                tile.style.border = '1px solid #1e40af'
                tile.style.display = 'flex'
                tile.style.alignItems = 'center'
                tile.style.justifyContent = 'center'
                tile.style.fontSize = '10px'
                tile.style.color = '#1e40af'
                tile.innerHTML = 'Floodplain'
                done(null, tile)
                return tile
              }
            })
            
            layer = new CustomPMTilesLayer(pmtiles, {
              attribution: '&copy; <a href="https://www.swfwmd.state.fl.us/">Southwest Florida Water Management District</a>',
              opacity: 0.8,
              maxZoom: 20,
              minZoom: 5
            })
          }
          
          layer.addTo(mapInstance)
          
          // Set z-index to ensure proper layering
          setTimeout(() => {
            const leafletPane = mapInstance.getPane('tilePane')
            if (leafletPane) {
              const tileLayers = leafletPane.querySelectorAll('.leaflet-layer')
              tileLayers.forEach(tileLayer => {
                if (tileLayer.style.zIndex === '' || parseInt(tileLayer.style.zIndex) < 1000) {
                  tileLayer.style.zIndex = '1000'
                }
              })
              console.log('Set floodplain layer z-index to 1000')
            }
            
            console.log('PMTiles floodplain layer added successfully')
          }, 100)
          
          setFloodplainLayer(layer)
          
        } catch (error) {
          console.error('Error loading floodplain layer:', error)
        }
      }
      
      loadFloodplain()
      
    } else if (!showFloodplain && floodplainLayer) {
      console.log('Removing floodplain layer from map...')
      if (mapInstance && floodplainLayer) {
        mapInstance.removeLayer(floodplainLayer)
        setFloodplainLayer(null)
      }
    }

    return () => {
      if (floodplainLayer && mapInstance) {
        mapInstance.removeLayer(floodplainLayer)
      }
    }
    // Note: floodplainLayer intentionally omitted from dependencies to prevent infinite loop
  }, [showFloodplain, mapInstance])

  const toggleFavorite = useCallback(async (parcelId) => {
    try {
      // Get parcel address for better storage
      const parcel = parcelData?.features?.find(f => f.properties.PARCEL_UID === parcelId)
      const parcelAddress = `${parcel?.properties?.ADRNO || ''} ${parcel?.properties?.ADRDIR || ''} ${parcel?.properties?.ADRSTR || ''} ${parcel?.properties?.ADRSUF || ''}`.trim() || null

      // Toggle in database
      const isNowFavorited = await favoritesService.toggleFavorite(parcelId, 'Citrus', parcelAddress)
      
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

  // (Removed legacy duplicated zoomToParcelBounds fragment)

  // Handle map ready event
  const handleMapReady = (map) => {
    console.log('Map is ready')
    setMapReady(true)
    
    // Store map instance for environmental layers
    setMapInstance(map.target)
    
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
    
    if (isFavorite) {
      return {
        fillColor: '#3b82f6', // Blue for favorites
        weight: 2,
        opacity: 1,
        color: '#1d4ed8',
        fillOpacity: 0.7
      };
    } else if (isSelected) {
      return {
        fillColor: '#10b981', // Green for selected
        weight: 3,
        color: '#059669',
        fillOpacity: 0.8
      };
    } else {
      return {
        fillColor: '#ffeb3b', // Vibrant bright yellow for Citrus County
        weight: 1,
        opacity: 1,
        color: '#fbc02d', // Darker vibrant yellow border
        fillOpacity: 0.7
      };
    }
  };

  // (zoomToParcelBounds defined above)

  const onEachFeature = (feature, layer) => {
    const props = feature.properties
    
    // Add click handler for parcel selection and panel
    layer.on('click', () => {
      setSelectedParcel(props.PARCEL_UID)
      setPanelParcel(feature)
      setShowPanel(true)
    })

    // Add hover effects
    layer.on('mouseover', () => {
      layer.setStyle({
        weight: 3,
        color: '#3B82F6',
        fillOpacity: 0.7
      })
    })

    layer.on('mouseout', () => {
      layer.setStyle({
        weight: 2,
        color: selectedParcel === props.PARCEL_UID ? '#EF4444' : '#3B82F6',
        fillOpacity: selectedParcel === props.PARCEL_UID ? 0.7 : 0.5
      })
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Citrus County parcels...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Citrus County Parcels</h1>
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
          center={computedCenter || [28.85, -82.50]} // fallback until bounds applied
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
              key={`citrus-parcels-${favorites.size}-${selectedParcel || 'none'}`}
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
      <div className="absolute bottom-20 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 space-y-3">
        <h3 className="font-semibold text-sm mb-3">Legend</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-yellow-600 rounded" style={{backgroundColor: '#ffeb3b'}}></div>
            <span>Available Parcels</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
            <span>Selected Parcel</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
            <span>Favorited Parcels</span>
          </div>
          
          {/* Environmental Layers */}
          <div className="pt-2 border-t border-gray-200">
            <div className="space-y-2 text-xs mb-4">
              <h4 className="font-medium text-xs text-gray-700">Environmental Layers</h4>
              
              {/* Wetlands Toggle */}
              <div 
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                  showWetlands ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => {
                  console.log('Wetlands checkbox clicked:', !showWetlands)
                  setShowWetlands(!showWetlands)
                }}
              >
                <div 
                  className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${
                    showWetlands 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {showWetlands && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span>NWI Wetlands</span>
              </div>
              
              {/* Floodplain Toggle */}
              <div 
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                  showFloodplain ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => {
                  console.log('Floodplain checkbox clicked:', !showFloodplain)
                  setShowFloodplain(!showFloodplain)
                }}
              >
                <div 
                  className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${
                    showFloodplain 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {showFloodplain && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span>SWFWMD Floodplain</span>
              </div>
            </div>
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
      {showPanel && panelParcel && (
        <ParcelInfoPanel
          parcel={panelParcel}
          county="Citrus"
          isOpen={showPanel}
          isFavorite={favorites.has(panelParcel.properties.PARCEL_UID)}
          onClose={() => setShowPanel(false)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  )
}

export default CitrusMapPage
