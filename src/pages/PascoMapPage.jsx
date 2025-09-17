import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, LayersControl } from 'react-leaflet'
import { StarIcon as StarOutline, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import dataService from '../services/dataService'
import favoritesService from '../services/favoritesService'
import { supabase } from '../lib/supabase'
import ParcelInfoPanel from '../components/ParcelInfoPanel'
import MapLegend from '../components/MapLegend'
import FloodplainLayer from '../components/FloodplainLayer'
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
  const [showWetlands, setShowWetlands] = useState(false)
  const [wetlandsLayer, setWetlandsLayer] = useState(null)
  const [showFloodplain, setShowFloodplain] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)

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
        
        // Check if user is authenticated first
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Current user:', user?.id, user?.email)
        
        if (!user) {
          console.log('No authenticated user found')
          return
        }
        
        const userFavorites = await favoritesService.getFavoritesByCounty('Pasco')
        console.log('Raw Pasco favorites data:', userFavorites)
        console.log('Individual favorite parcel_ids and types:', userFavorites.map(fav => ({ 
          parcel_id: fav.parcel_id, 
          type: typeof fav.parcel_id,
          value: fav.parcel_id 
        })))
        const favoriteIds = new Set(userFavorites.map(fav => fav.parcel_id))
        setFavorites(favoriteIds)
        console.log('Loaded Pasco favorites:', favoriteIds.size, 'IDs:', Array.from(favoriteIds))
      } catch (err) {
        console.error('Error loading Pasco favorites:', err)
      }
    }

    loadFavorites()
  }, [])

  // Debug function - accessible from browser console as window.debugPascoFavorites()
  useEffect(() => {
    window.debugPascoFavorites = async () => {
      try {
        console.log('=== DEBUGGING PASCO FAVORITES ===')
        
        // Check current user
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Current user:', user?.id, user?.email)
        
        if (!user) {
          console.log('No authenticated user')
          return
        }
        
        // Check all favorites for this user
        const { data: allFavorites, error: allError } = await supabase
          .from('favorite_parcels')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (allError) {
          console.error('Error fetching all favorites:', allError)
          return
        }
        
        console.log('All user favorites:', allFavorites)
        
        // Check Pasco specifically
        const pascoFavorites = allFavorites.filter(fav => fav.county === 'Pasco')
        console.log('Pasco favorites:', pascoFavorites)
        
        // Check what's in the current state
        console.log('Current favorites state:', {
          size: favorites.size,
          values: Array.from(favorites)
        })
        
        return { allFavorites, pascoFavorites, currentState: Array.from(favorites) }
      } catch (err) {
        console.error('Debug error:', err)
      }
    }

    return () => {
      delete window.debugPascoFavorites
    }
  }, [favorites])

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

  // Effect to handle wetlands layer toggle
  useEffect(() => {
    if (!mapInstance) return

    if (showWetlands && !wetlandsLayer) {
      console.log('Adding wetlands layer to map...')
      const layer = createArcGISDynamicLayer(
        'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer',
        {
          attribution: '&copy; <a href="https://www.fws.gov/wetlands/">U.S. Fish and Wildlife Service</a> - National Wetlands Inventory',
          opacity: 0.7,
          zIndex: 1000
        }
      )
      
      layer.addTo(mapInstance)
      setWetlandsLayer(layer)
      console.log('Wetlands layer added successfully')
      
    } else if (!showWetlands && wetlandsLayer) {
      console.log('Removing wetlands layer from map...')
      mapInstance.removeLayer(wetlandsLayer)
      setWetlandsLayer(null)
      console.log('Wetlands layer removed successfully')
    }
  }, [showWetlands, mapInstance, wetlandsLayer])

  // Effect to handle floodplain layer toggle - DISABLED: Now using FloodplainLayer component
  /*
  useEffect(() => {
    if (!mapInstance) return

    if (showFloodplain && !floodplainLayer) {
      console.log('Adding floodplain layer to map...')
      const loadFloodplain = async () => {
        try {
          console.log('Loading PMTiles floodplain data...')
          const { PMTiles } = await import('pmtiles')
          const pmtiles = new PMTiles('https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/tiles/floodplain.pmtiles')
          
          // Get metadata for layer info
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
        console.log('Floodplain layer removed successfully')
      }
    }
  }, [showFloodplain, mapInstance, floodplainLayer])
  */

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

  // Handle map ready event
  const handleMapReady = (map) => {
    console.log('Map is ready')
    console.log('Initial map ready. Will fit to data bounds.')
    setMapReady(true)
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
    
    // Handle type conversion: check both the original value and string/number conversions
    const isFavorite = favorites.has(parcelId) || favorites.has(String(parcelId)) || favorites.has(Number(parcelId));
    
    // Add debugging for a few parcels to understand what's happening
    if (Math.random() < 0.001) { // Log 0.1% of parcels to avoid spam
      console.log('Pasco parcel styling debug:', {
        parcelId,
        parcelIdType: typeof parcelId,
        isSelected,
        isFavorite,
        favoritesSize: favorites.size,
        favoritesList: Array.from(favorites).slice(0, 5), // Show first 5 favorites
        favoritesTypes: Array.from(favorites).slice(0, 5).map(id => typeof id),
        stringCheck: favorites.has(String(parcelId)),
        numberCheck: favorites.has(Number(parcelId)),
        directCheck: favorites.has(parcelId)
      });
    }
    
    if (isFavorite) {
      return {
        fillColor: '#3b82f6', // Blue for favorites
        weight: 3,
        opacity: 1,
        color: '#1d4ed8',
        fillOpacity: 0.3
      };
    } else if (isSelected) {
      return {
        fillColor: '#10b981', // Green for selected
        weight: 4,
        color: '#059669',
        fillOpacity: 0.4
      };
    } else {
      return {
        fillColor: '#ffeb3b', // Bright yellow for Pasco County
        weight: 2,
        opacity: 1,
        color: '#fbc02d', // Darker yellow border
        fillOpacity: 0.15
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
        weight: 4,
        fillOpacity: 0.3
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

          {/* NWI Wetlands Layer is now handled dynamically via useEffect */}

          {/* SWFWMD Floodplain Layer using ESRI FeatureServer */}
          <FloodplainLayer
            visible={showFloodplain}
            name="SWFWMD Floodplain"
            url="https://services5.arcgis.com/mCjnd0SqezpuhWXd/arcgis/rest/services/SWFWMD_Floodplain/FeatureServer/0"
            type="vector"
          />

          {/* Parcel data layer */}
          {parcelData && (
            <GeoJSON
              key={`pasco-parcels-${favorites.size}-${selectedParcel || 'none'}`}
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
      <MapLegend 
        showFloodplain={showFloodplain}
        onToggleFloodplain={() => setShowFloodplain(!showFloodplain)}
        showWetlands={showWetlands}
        onToggleWetlands={() => setShowWetlands(!showWetlands)}
        showDevelopmentAreas={false}
        onToggleDevelopmentAreas={null}
      />

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
