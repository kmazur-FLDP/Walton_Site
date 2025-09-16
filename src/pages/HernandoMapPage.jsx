import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
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

const HernandoMapPage = () => {
  const navigate = useNavigate()
  const mapRef = useRef()
  const [favorites, setFavorites] = useState(new Set())
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [parcelData, setParcelData] = useState(null)
  const [error, setError] = useState(null)
  const [parcelCount, setParcelCount] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [panelParcel, setPanelParcel] = useState(null)
  const [showWetlands, setShowWetlands] = useState(false)
  const [wetlandsLayer, setWetlandsLayer] = useState(null)
  const [showFloodplain, setShowFloodplain] = useState(false)
  const [floodplainLayer, setFloodplainLayer] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)

  // Load Hernando parcel data when component mounts
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Loading Hernando parcel data...')
        const parcels = await dataService.loadHernandoParcels()
        
        if (parcels) {
          console.log('Loaded parcels:', parcels.features?.length || 0)
          setParcelData(parcels)
          setParcelCount(parcels.features?.length || 0)
          
          // The zoom will be handled by the useEffect when mapReady && parcelData are both true
        } else {
          setError('Failed to load Hernando parcel data')
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

  // Load user favorites for Hernando county
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        console.log('Loading Hernando favorites...')
        const userFavorites = await favoritesService.getFavoritesByCounty('Hernando')
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

  // Effect to handle floodplain layer toggle
  useEffect(() => {
    if (!mapInstance) return

    const loadFloodplainLayer = async () => {
      if (showFloodplain && !floodplainLayer) {
        console.log('Adding floodplain layer to map...')
        
        try {
          // Import PMTiles dynamically
          const { PMTiles } = await import('pmtiles')
          
          console.log('Loading PMTiles floodplain data...')
          
          // Create PMTiles instance
          const pmtiles = new PMTiles('https://qitnaardmorozyzlcelp.supabase.co/storage/v1/object/public/tiles/floodplain.pmtiles')
          
          // Get metadata to understand the tileset
          const header = await pmtiles.getHeader()
          const metadata = await pmtiles.getMetadata()
          console.log('PMTiles Metadata:', metadata)
          
          // Check if PMTiles bounds overlap with current view
          if (header.minLonE7 && header.maxLonE7 && header.minLatE7 && header.maxLatE7) {
            const bounds = [
              [header.minLatE7 / 10000000, header.minLonE7 / 10000000],
              [header.maxLatE7 / 10000000, header.maxLonE7 / 10000000]
            ]
            
            const mapBounds = mapInstance.getBounds()
            const boundsOverlap = mapBounds.intersects(L.latLngBounds(bounds))
            
            if (!boundsOverlap) {
              console.log('Zooming to floodplain data extent')
              mapInstance.fitBounds(bounds)
            }
          }
          
          // Try to use leafletRasterLayer if it exists
          let layer
          try {
            const { leafletRasterLayer } = await import('pmtiles')
            layer = leafletRasterLayer(pmtiles, {
              attribution: '&copy; <a href="https://www.swfwmd.state.fl.us/">Southwest Florida Water Management District</a>',
              opacity: 0.8,
              maxZoom: 20, // Updated for new PMTiles file with zoom 5-20
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
                // Return empty string as we'll handle tiles in createTile
                return ''
              },
              
              createTile: function(coords, done) {
                const tile = document.createElement('div')
                tile.style.width = '256px'
                tile.style.height = '256px'
                tile.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'
                tile.style.border = '1px solid #1e40af'
                tile.innerHTML = `<div style="padding: 10px; font-size: 12px; color: #1e40af;">Floodplain Tile ${coords.z}/${coords.x}/${coords.y}</div>`
                
                // Try to get actual tile data
                this.pmtiles.getZxy(coords.z, coords.x, coords.y).then(data => {
                  if (data && data.byteLength > 0) {
                    console.log(`Found tile data at ${coords.z}/${coords.x}/${coords.y}, size: ${data.byteLength} bytes`)
                    tile.style.backgroundColor = 'rgba(59, 130, 246, 0.6)'
                    tile.innerHTML = `<div style="padding: 10px; font-size: 12px; color: white; background: rgba(30, 64, 175, 0.8);">Floodplain Data</div>`
                  }
                  done(null, tile)
                }).catch(err => {
                  console.log(`No tile data at ${coords.z}/${coords.x}/${coords.y}:`, err.message)
                  done(null, tile)
                })
                
                return tile
              }
            })
            
            layer = new CustomPMTilesLayer(pmtiles, {
              attribution: '&copy; <a href="https://www.swfwmd.state.fl.us/">Southwest Florida Water Management District</a>',
              opacity: 0.8
            })
          }
          
          layer.addTo(mapInstance)
          
          // Make sure floodplain layer appears on top
          if (layer.setZIndex) {
            layer.setZIndex(1000)
            console.log('Set floodplain layer z-index to 1000')
          }
          
          setFloodplainLayer(layer)
          console.log('PMTiles floodplain layer added successfully')
          
        } catch (error) {
          console.error('Error loading PMTiles floodplain data:', error)
          
          // More detailed error logging
          if (error.message) {
            console.error('Error message:', error.message)
          }
          if (error.stack) {
            console.error('Error stack:', error.stack)
          }
          
          // Fallback: create a simple info marker with error details
          const layer = L.layerGroup()
          const marker = L.marker([28.55, -82.45]).bindPopup(`
            <div>
              <h4>Floodplain Layer Error</h4>
              <p>Failed to load PMTiles data</p>
              <p><small>Error: ${error.message || 'Unknown error'}</small></p>
              <p><small>Check browser console for details</small></p>
            </div>
          `)
          layer.addLayer(marker)
          layer.addTo(mapInstance)
          setFloodplainLayer(layer)
        }
        
      } else if (!showFloodplain && floodplainLayer) {
        console.log('Removing floodplain layer from map...')
        mapInstance.removeLayer(floodplainLayer)
        
        // Clean up zoom handler
        if (mapInstance._floodplainZoomHandler) {
          mapInstance.off('zoomend', mapInstance._floodplainZoomHandler)
          delete mapInstance._floodplainZoomHandler
        }
        
        setFloodplainLayer(null)
        console.log('Floodplain layer removed successfully')
      }
    }
    
    loadFloodplainLayer()
  }, [showFloodplain, mapInstance, floodplainLayer])

  const toggleFavorite = async (parcelId) => {
    try {
      // Get parcel address for better storage
      const parcel = parcelData?.features?.find(f => f.properties.PARCEL_UID === parcelId)
      const parcelAddress = parcel?.properties?.SITUS_ADDRESS || null

      // Toggle in database
      const isNowFavorited = await favoritesService.toggleFavorite(parcelId, 'Hernando', parcelAddress)
      
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
  const handleMapReady = (map) => {
    console.log('Map is ready')
    setMapReady(true)
    setMapInstance(map.target)
    // If parcel data is already loaded, zoom to it
    if (parcelData) {
      setTimeout(zoomToParcelBounds, 100)
    }
  }

  // Parcel styling function
  const parcelStyle = (feature) => {
    const parcelId = feature.properties.PARCEL_UID; // Use PARCEL_UID which matches the ParcelInfoPanel getParcelId()
    const isSelected = selectedParcel === parcelId;
    const isFavorite = favoriteIds.includes(parcelId);
    
    if (isFavorite) {
      return {
        fillColor: '#3b82f6', // Blue for favorites to match the request
        weight: 2,
        opacity: 1,
        color: '#1d4ed8',
        fillOpacity: 0.7
      };
    } else if (isSelected) {
      return {
        fillColor: '#10b981', // Green for selected
        weight: 3,
        opacity: 1,
        color: '#059669',
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
          <p className="mt-4 text-gray-600">Loading Hernando County parcels...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Hernando County Parcels</h1>
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
          center={[28.5584, -82.4511]} // Hernando County center
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

          {/* NWI Wetlands Layer is now handled dynamically via useEffect */}

          {/* 
          ESRI SOLUTIONS - Professional mapping with consistent styling:
          
          Current: World Transportation (Roads + Labels)
          - Clean roads, highways, and place names
          - Designed specifically for overlay on imagery
          
          Option 1: World Boundaries and Places (Labels only)
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            opacity={0.8}
          />

          Option 2: World Reference Overlay (Most comprehensive)
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            opacity={0.8}
          />

          Option 3: USA Topo Maps Reference (US-specific, detailed)
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            opacity={0.4}
          />

          ALTERNATIVE BASEMAP COMBINATIONS:

          Option 4: Esri World Topo + No Overlay (Clean topo style)
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
          />

          Option 5: Esri World Street Map + Imagery Hybrid
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            opacity={0.7}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            opacity={0.4}
          />

          NON-ESRI ALTERNATIVES:
          
          CartoDB Voyager Labels
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            opacity={0.8}
          />

          Stamen Toner Lines (Minimalist)
          <TileLayer
            url="http://tile.stamen.com/toner-lines/{z}/{x}/{y}.png"
            attribution='Map tiles by Stamen Design, CC BY 3.0'
            opacity={0.7}
          />
          */}

          {/* Parcel data layer */}
          {parcelData && (
            <GeoJSON
              key={`hernando-parcels-${favorites.size}-${selectedParcel || 'none'}`}
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
      <div className="absolute bottom-20 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-20 max-w-xs">
        <h3 className="font-semibold text-sm mb-3">Legend</h3>
        
        {/* Parcel Legend */}
        <div className="space-y-2 text-xs mb-4">
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
          {showFloodplain && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded opacity-60"></div>
              <span>SWFWMD Floodplain</span>
            </div>
          )}
        </div>

        {/* Layer Toggles */}
        <div className="border-t pt-3">
          <h4 className="font-medium text-xs mb-2 text-gray-700">Environmental Layers</h4>
          <div className="space-y-2">
            {/* Wetlands Toggle */}
            <div 
              onClick={() => setShowWetlands(!showWetlands)}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <div 
                className={`w-4 h-4 border-2 border-gray-400 rounded flex items-center justify-center ${
                  showWetlands ? 'bg-blue-400 border-blue-600' : 'bg-white'
                }`}
              >
                {showWetlands && <span className="text-white font-bold text-xs">✓</span>}
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-400 border border-blue-600 rounded opacity-70"></div>
                <span className="text-xs">NWI Wetlands</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 pl-6">
              National Wetlands Inventory
            </div>
            
            {/* Floodplain Toggle */}
            <div 
              onClick={() => setShowFloodplain(!showFloodplain)}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <div 
                className={`w-4 h-4 border-2 border-gray-400 rounded flex items-center justify-center ${
                  showFloodplain ? 'bg-blue-500 border-blue-600' : 'bg-white'
                }`}
              >
                {showFloodplain && <span className="text-white font-bold text-xs">✓</span>}
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 border border-blue-600 rounded opacity-70"></div>
                <span className="text-xs">SWFWMD Floodplain</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 pl-5">
              Southwest Florida Water Management District
            </div>
          </div>
        </div>
      </div>

      {/* Parcel Information Panel */}
      {showPanel && panelParcel && (
        <ParcelInfoPanel
          parcel={panelParcel}
          county="Hernando"
          isOpen={showPanel}
          isFavorite={favorites.has(panelParcel.properties.PARCEL_UID)}
          onClose={() => setShowPanel(false)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  )
}

export default HernandoMapPage
