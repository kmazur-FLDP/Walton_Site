import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { StarIcon as StarOutline, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import dataService from '../services/dataService'
import favoritesService from '../services/favoritesService'
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

const HernandoMapPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
        console.log('Raw favorites data:', userFavorites)
        const favoriteIds = new Set(userFavorites.map(fav => fav.parcel_id))
        setFavorites(favoriteIds)
        console.log('Loaded favorites:', favoriteIds.size, 'IDs:', Array.from(favoriteIds))
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
      // Find the parcel in the data
      const parcel = parcelData.features.find(feature => 
        feature.properties.PARCEL_UID === parcelParam ||
        feature.properties.PARCEL_ID === parcelParam ||
        String(feature.properties.PARCEL_UID) === String(parcelParam) ||
        String(feature.properties.PARCEL_ID) === String(parcelParam)
      )
      
      if (parcel) {
        // Select the parcel
        setSelectedParcel(parcel.properties.PARCEL_UID || parcel.properties.PARCEL_ID)
        setPanelParcel(parcel.properties)
        setShowPanel(true)
        
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

  // Effect to zoom to parcels when both map and data are ready
  useEffect(() => {
    if (mapReady && parcelData) {
      console.log('Both map and parcel data are ready - zooming to bounds')
      setTimeout(zoomToParcelBounds, 200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, parcelData]) // zoomToParcelBounds intentionally omitted as it's stable via useCallback

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
    
    // Handle type conversion: check both the original value and string/number conversions
    const isFavorite = favorites.has(parcelId) || favorites.has(String(parcelId)) || favorites.has(Number(parcelId));
    
    console.log('Checking parcel:', parcelId, 'isFavorite:', isFavorite, 'favorites size:', favorites.size)
    
    if (isFavorite) {
      return {
        fillColor: '#3b82f6', // Blue for favorites to match the request
        weight: 3,
        opacity: 1,
        color: '#1d4ed8',
        fillOpacity: 0.3
      };
    } else if (isSelected) {
      return {
        fillColor: '#10b981', // Green for selected
        weight: 4,
        opacity: 1,
        color: '#059669',
        fillOpacity: 0.4
      };
    } else {
      return {
        fillColor: '#ffeb3b', // Vibrant bright yellow for default
        weight: 2,
        opacity: 1,
        color: '#fbc02d', // Darker vibrant yellow border
        fillOpacity: 0.15
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
        weight: 4,
        color: '#3B82F6',
        fillOpacity: 0.3
      })
    })

    layer.on('mouseout', () => {
      layer.setStyle({
        weight: selectedParcel === props.PARCEL_UID ? 4 : 2,
        color: selectedParcel === props.PARCEL_UID ? '#EF4444' : '#3B82F6',
        fillOpacity: selectedParcel === props.PARCEL_UID ? 0.4 : 0.15
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

          {/* SWFWMD Floodplain Layer using ESRI FeatureServer */}
          <FloodplainLayer
            visible={showFloodplain}
            name="SWFWMD Floodplain"
            url="https://services5.arcgis.com/mCjnd0SqezpuhWXd/arcgis/rest/services/SWFWMD_Floodplain/FeatureServer/0"
            type="vector"
          />

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
      <MapLegend 
        showFloodplain={showFloodplain}
        onToggleFloodplain={() => setShowFloodplain(!showFloodplain)}
        showWetlands={showWetlands}
        onToggleWetlands={() => setShowWetlands(!showWetlands)}
        showDevelopmentAreas={false}
        onToggleDevelopmentAreas={null}
      />

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
