import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, LayersControl } from 'react-leaflet'
import { StarIcon as StarOutline, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import dataService from '../services/dataService'
import favoritesService from '../services/favoritesService'
import ParcelInfoPanel from '../components/ParcelInfoPanel'
import MapLegend from '../components/MapLegend'
import FloodplainLayer from '../components/FloodplainLayer'
import PrintButton from '../components/PrintButton'
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

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const PolkMapPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mapRef = useRef()
  const [favorites, setFavorites] = useState(new Set())
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [selectedParcelData, setSelectedParcelData] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [parcelData, setParcelData] = useState(null)
  const [developmentData, setDevelopmentData] = useState(null)
  const [error, setError] = useState(null)
  const [parcelCount, setParcelCount] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [computedCenter, setComputedCenter] = useState(null)
  const [showDevelopmentAreas, setShowDevelopmentAreas] = useState(false)
  const [showWetlands, setShowWetlands] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)
  const [wetlandsLayer, setWetlandsLayer] = useState(null)
  const [showFloodplain, setShowFloodplain] = useState(false)

  // Color mapping for development areas (excluding RDA) - optimized for transparent overlays
  const developmentAreaColors = {
    'CITY': '#ef4444',           // Red
    'NUSA': '#06b6d4',           // Cyan
    'SDA': '#22c55e',            // Green
    'TSDA': '#f97316',           // Orange
    'UEA': '#a855f7',            // Purple
    'UGA': '#3b82f6'             // Blue
    // RDA removed - will be filtered out
  }

  // Load Polk parcel data when component mounts
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Loading Polk parcel and development area data...')
        
        // Load both parcels and development areas in parallel
        const [parcels, devAreas] = await Promise.all([
          dataService.loadPolkParcels(),
          dataService.loadPolkDevelopmentAreas()
        ])
        
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
          setError('Failed to load Polk parcel data')
        }
        
        if (devAreas) {
          // Filter out RDA areas
          const filteredDevAreas = {
            ...devAreas,
            features: devAreas.features.filter(feature => 
              feature.properties.DEV_AREA !== 'RDA'
            )
          }
          console.log('Loaded development areas:', filteredDevAreas.features?.length || 0, '(filtered out RDA)')
          setDevelopmentData(filteredDevAreas)
        } else {
          console.warn('Failed to load Polk development areas data')
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

  // Load user favorites for Polk county
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        console.log('Loading Polk favorites...')
        const userFavorites = await favoritesService.getFavoritesByCounty('Polk')
        const favoriteIds = new Set(userFavorites.map(fav => fav.parcel_id))
        setFavorites(favoriteIds)
        console.log('Loaded favorites:', favoriteIds.size)
        console.log('Polk favorite parcel IDs:', Array.from(favoriteIds), 'data types:', Array.from(favoriteIds).map(id => typeof id))
      } catch (err) {
        console.error('Error loading favorites:', err)
      }
    }

    loadFavorites()
  }, [])

  // Handle URL parameter for parcel selection
  useEffect(() => {
    const parcelParam = searchParams.get('parcel')
    if (parcelParam && parcelData) {
      // Find the parcel in the data - Polk uses PARCEL_UID
      const parcel = parcelData.features.find(feature => 
        feature.properties.PARCEL_UID === parcelParam ||
        feature.properties.PARCEL_ID === parcelParam ||
        String(feature.properties.PARCEL_UID) === String(parcelParam) ||
        String(feature.properties.PARCEL_ID) === String(parcelParam)
      )
      
      if (parcel) {
        // Select the parcel
        const parcelId = parcel.properties.PARCEL_UID || parcel.properties.PARCEL_ID
        setSelectedParcel(parcelId)
        setSelectedParcelData(parcel.properties)
        setShowInfoPanel(true)
        
        // Zoom to the parcel
        if (mapRef.current && parcel.geometry) {
          try {
            const bounds = L.geoJSON(parcel).getBounds()
            mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
          } catch (err) {
            console.error('Error zooming to parcel:', err)
          }
        }
        
        // Clear the URL parameter to avoid re-triggering
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete('parcel')
        navigate({ search: newSearchParams.toString() }, { replace: true })
      }
    }
  }, [parcelData, searchParams, navigate])

  // Function to zoom map to parcel bounds (moved above effect to avoid TDZ in dependency array)
  const zoomToParcelBounds = useCallback(() => {
    if (parcelData && mapRef.current) {
      const bounds = dataService.getBounds(parcelData)
      if (bounds) {
        console.log('=== POLK BOUNDS ANALYSIS ===')
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWetlands, mapInstance]) // wetlandsLayer intentionally omitted to prevent infinite loop

  // Effect to handle floodplain layer toggle - REPLACED WITH FloodplainLayer COMPONENT
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
      }
    }

    return () => {
      if (floodplainLayer && mapInstance) {
        mapInstance.removeLayer(floodplainLayer)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFloodplain, mapInstance]) // floodplainLayer intentionally omitted to prevent infinite loop
  */

  const toggleFavorite = useCallback(async (parcelId) => {
    try {
      // Get parcel address for better storage
      const parcel = parcelData?.features?.find(f => f.properties.PARCEL_UID === parcelId)
      const parcelAddress = `${parcel?.properties?.BAS_STRT || ''}`.trim() || null

      // Toggle in database
      const isNowFavorited = await favoritesService.toggleFavorite(parcelId, 'Polk', parcelAddress)
      
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
    const parcelId = feature.properties.PARCEL_UID; // Use PARCEL_UID to match ParcelInfoPanel getParcelId()
    const isSelected = selectedParcel === parcelId;
    // Use Set.has() for efficient lookup - handles both string and number comparison
    const isFavorite = favorites.has(parcelId) || favorites.has(String(parcelId)) || favorites.has(Number(parcelId));
    
    // Debug logging for first few parcels to check styling
    if (Math.random() < 0.001) { // Log 0.1% of parcels to avoid spam
      console.log('PolkMapPage parcelStyle debug:', {
        parcelId,
        parcelIdType: typeof parcelId,
        isSelected,
        isFavorite,
        favoriteIds: Array.from(favorites).slice(0, 5), // Show first 5 favorites
        favoriteIdsTypes: Array.from(favorites).slice(0, 5).map(id => typeof id),
        favoritesSize: favorites.size
      });
    }
    
    if (isFavorite) {
      console.log('🔵 BLUE PARCEL:', parcelId, typeof parcelId, 'matches favorite in set'); // Log every blue parcel
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
        fillColor: '#ffeb3b', // Bright yellow for Polk County parcels
        weight: 2,
        opacity: 1,
        color: '#f57f17', // Darker yellow border
        fillOpacity: 0.15
      };
    }
  };

  // Development area styling function
  const developmentAreaStyle = (feature) => {
    const devArea = feature.properties.DEV_AREA
    const color = developmentAreaColors[devArea] || '#888888'
    
    return {
      fillColor: color,
      weight: 1, // Thin, subtle border
      opacity: 0.6, // Semi-transparent border
      color: color,
      fillOpacity: 0.15, // Very light transparent fill
      dashArray: null // Remove dashed lines
    }
  }

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

  // Development area feature handler
  const onEachDevelopmentFeature = (feature, layer) => {
    const props = feature.properties
    
    // Create popup content for development areas
    const popupContent = `
      <div class="p-3 min-w-64">
        <h3 class="font-semibold text-base mb-2">${props.DEV_AREA_D || props.DEV_AREA || 'Development Area'}</h3>
        <div class="space-y-1 text-sm">
          <div><span class="font-medium">Area Code:</span> ${props.DEV_AREA || 'N/A'}</div>
          <div><span class="font-medium">Description:</span> ${props.DEV_AREA_D || 'N/A'}</div>
          <div><span class="font-medium">Acres:</span> ${props.Acres ? Number(props.Acres).toLocaleString() : 'N/A'}</div>
          <div><span class="font-medium">Object ID:</span> ${props.OBJECTID || 'N/A'}</div>
          <div><span class="font-medium">Shape Length:</span> ${props.Shape_Length ? Number(props.Shape_Length).toFixed(2) + ' ft' : 'N/A'}</div>
          <div><span class="font-medium">Shape Area:</span> ${props.Shape_Area ? Number(props.Shape_Area).toFixed(2) + ' sq ft' : 'N/A'}</div>
        </div>
      </div>
    `
    
    layer.bindPopup(popupContent)
  }

  // Clean up function to close info panel
  const handleCloseInfoPanel = () => {
    setShowInfoPanel(false)
    setSelectedParcel(null)
    setSelectedParcelData(null)
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
  }, [toggleFavorite])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Polk County parcels...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Polk County Parcels</h1>
              <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {parcelCount.toLocaleString()} parcels
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <StarSolid className="h-5 w-5 text-amber-500" />
                <span>{favorites.size} favorited</span>
              </div>
              
              {/* Print Map Button */}
              <div className="no-print">
                <PrintButton 
                  contentSelector=".leaflet-container"
                  filename="polk-county-map"
                >
                  Print Map
                </PrintButton>
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
          center={computedCenter || [28.15, -81.75]} // fallback until bounds applied
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
            <LayersControl.Overlay checked name="Polk Parcels">
              {parcelData && (
                <GeoJSON
                  key={`polk-parcels-${favorites.size}-${selectedParcel || 'none'}`}
                  data={parcelData}
                  style={parcelStyle}
                  onEachFeature={onEachFeature}
                />
              )}
            </LayersControl.Overlay>
            <LayersControl.Overlay name="NWI Wetlands">
              <TileLayer
                url="https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/tile/{z}/{y}/{x}?f=png"
                attribution='&copy; <a href="https://www.fws.gov/wetlands/">U.S. Fish and Wildlife Service</a> - National Wetlands Inventory'
                opacity={0.7}
                crossOrigin={true}
              />
            </LayersControl.Overlay>
          </LayersControl>

          {/* SWFWMD Floodplain Layer using ESRI FeatureServer */}
          <FloodplainLayer
            visible={showFloodplain}
            name="SWFWMD Floodplain"
            url="https://services5.arcgis.com/mCjnd0SqezpuhWXd/arcgis/rest/services/SWFWMD_Floodplain/FeatureServer/0"
            type="vector"
          />

          {/* Development Areas controlled by legend toggle */}
          {showDevelopmentAreas && developmentData && (
            <GeoJSON
              key="polk-development-areas"
              data={developmentData}
              style={developmentAreaStyle}
              onEachFeature={onEachDevelopmentFeature}
            />
          )}

          {/* All layers are now managed by LayersControl */}

          {/* Debug center marker removed */}
        </MapContainer>
      </div>

      {/* Legend */}
      <MapLegend 
        showFloodplain={showFloodplain}
        onToggleFloodplain={() => setShowFloodplain(!showFloodplain)}
        showWetlands={showWetlands}
        onToggleWetlands={() => setShowWetlands(!showWetlands)}
        showDevelopmentAreas={showDevelopmentAreas}
        onToggleDevelopmentAreas={() => setShowDevelopmentAreas(!showDevelopmentAreas)}
      />

      {/* Parcel Information Panel */}
      <ParcelInfoPanel
        parcel={selectedParcelData}
        isOpen={showInfoPanel}
        onClose={handleCloseInfoPanel}
        onToggleFavorite={toggleFavorite}
        isFavorite={selectedParcel ? favorites.has(selectedParcel) : false}
        county="Polk"
      />
    </div>
  )
}

export default PolkMapPage
