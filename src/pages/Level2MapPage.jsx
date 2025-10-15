import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon, StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import favoritesService from '../services/favoritesService'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { PMTiles } from 'pmtiles'
import 'leaflet.vectorgrid'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'
import {
  getHernandoFLUStyle,
  getManateeFLUStyle,
  getPascoFLUStyle,
  getPolkFLUStyle,
  getManateeZoningStyle,
  getPascoZoningStyle,
  getSoilStyle
} from '../utils/colorMaps'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// MapController component to capture map instance
const MapController = ({ onMapReady }) => {
  const map = useMap()
  
  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])
  
  return null
}

// PMTiles Vector Layer component - Fixed version
const PMTilesVectorLayer = ({ pmtilesUrl, visible, style, layerName }) => {
  const map = useMap()
  const [vectorLayer, setVectorLayer] = useState(null)
  const styleRef = useRef(style)
  
  // Update style ref when style changes
  useEffect(() => {
    styleRef.current = style
  }, [style])
  
  useEffect(() => {
    if (!map || !pmtilesUrl || vectorLayer) return // Only initialize once
    
    const initializeLayer = async () => {
      try {
        console.log(`Initializing PMTiles vector layer for ${layerName}...`)
        
        // Create PMTiles source
        const pmtiles = new PMTiles(pmtilesUrl)
        
        // Custom tile layer that uses PMTiles
        const VectorTileLayer = L.Layer.extend({
          initialize: function(options) {
            L.setOptions(this, options)
            this._features = new L.LayerGroup()
            this._loaded = false
          },
          
          onAdd: function(map) {
            this._map = map
            this._features.addTo(map)
            
            // Only load tiles once when first added
            if (!this._loaded) {
              this.loadTiles()
              this._loaded = true
            }
          },
          
          onRemove: function(map) {
            if (this._features) {
              this._features.removeFrom(map)
            }
            this._map = null
          },
          
          loadTiles: async function() {
            if (!this._map) {
              console.log(`No map available for ${layerName}`)
              return
            }
            
            try {
              console.log(`Loading tiles for ${layerName}...`)
              
              // Get a reasonable zoom level for loading
              const zoom = Math.min(Math.max(this._map.getZoom(), 8), 12)
              
              // Get map center for initial tile loading
              const center = this._map.getCenter()
              const point = this._map.project(center, zoom)
              const tileSize = 256
              const tileX = Math.floor(point.x / tileSize)
              const tileY = Math.floor(point.y / tileSize)
              
              // Clear existing features first
              this._features.clearLayers()
              
              // Try to load a few tiles around the center
              let tilesLoaded = 0
              let totalFeatures = 0
              
              for (let x = tileX - 1; x <= tileX + 1; x++) {
                for (let y = tileY - 1; y <= tileY + 1; y++) {
                  if (x >= 0 && y >= 0) {
                    try {
                      const tileData = await pmtiles.getZxy(zoom, x, y)
                      if (tileData && tileData.data && tileData.data.byteLength > 0) {
                        console.log(`Loaded tile ${zoom}/${x}/${y} for ${layerName}, size: ${tileData.data.byteLength} bytes`)
                        tilesLoaded++
                        
                        // Parse the MVT data
                        try {
                          const tile = new VectorTile(new Pbf(tileData.data))
                          
                          // Iterate through all layers in the tile
                          for (let layerName in tile.layers) {
                            const layer = tile.layers[layerName]
                            console.log(`Processing layer: ${layerName}, features: ${layer.length}`)
                            
                            // Process each feature in the layer
                            for (let i = 0; i < layer.length; i++) {
                              const feature = layer.feature(i)
                              const geom = feature.loadGeometry()
                              const props = feature.properties
                              
                              // Convert tile coordinates to lat/lng
                              const latLngs = this.tileToLatLng(geom, zoom, x, y)
                              
                              if (latLngs && latLngs.length > 0) {
                                let leafletFeature
                                
                                if (feature.type === 1) { // Point
                                  leafletFeature = L.circleMarker(latLngs[0], {
                                    radius: 3,
                                    ...styleRef.current,
                                    fillOpacity: 0.7
                                  })
                                } else if (feature.type === 2) { // LineString
                                  leafletFeature = L.polyline(latLngs, {
                                    ...styleRef.current,
                                    fillOpacity: 0.7
                                  })
                                } else if (feature.type === 3) { // Polygon
                                  leafletFeature = L.polygon(latLngs, {
                                    ...styleRef.current,
                                    fillOpacity: 0.3
                                  })
                                }
                                
                                if (leafletFeature) {
                                  leafletFeature.bindPopup(`
                                    <strong>${layerName}</strong><br/>
                                    Type: ${feature.type === 1 ? 'Point' : feature.type === 2 ? 'LineString' : 'Polygon'}<br/>
                                    Properties: ${Object.keys(props).length}<br/>
                                    ${Object.entries(props).slice(0, 3).map(([k,v]) => `${k}: ${v}`).join('<br/>')}
                                  `)
                                  this._features.addLayer(leafletFeature)
                                  totalFeatures++
                                }
                              }
                            }
                          }
                        } catch (parseError) {
                          console.error(`Error parsing MVT for ${layerName}:`, parseError)
                        }
                      }
                    } catch {
                      // No tile at this coordinate - this is normal
                    }
                  }
                }
              }
              
              console.log(`${layerName}: Loaded ${tilesLoaded} tiles with ${totalFeatures} features`)
              
              // If no features were rendered, add a placeholder
              if (totalFeatures === 0) {
                const center_coords = this._map.getCenter()
                const indicator = L.circleMarker(center_coords, {
                  radius: 8,
                  ...styleRef.current,
                  opacity: 0.8,
                  fillOpacity: 0.3
                }).bindPopup(`${layerName} layer active<br/>Loaded ${tilesLoaded} tiles<br/>No features found at this location/zoom`)
                
                this._features.addLayer(indicator)
              }
              
            } catch (error) {
              console.error(`Error loading tiles for ${layerName}:`, error)
            }
          },
          
          // Helper function to convert tile coordinates to lat/lng
          tileToLatLng: function(geometry, zoom, tileX, tileY) {
            const tileSize = 256
            const extent = 4096 // MVT extent
            
            const convertRing = (ring) => {
              return ring.map(point => {
                const x = (tileX * tileSize + (point.x / extent) * tileSize)
                const y = (tileY * tileSize + (point.y / extent) * tileSize)
                
                const latLng = this._map.unproject([x, y], zoom)
                return [latLng.lat, latLng.lng]
              })
            }
            
            if (geometry.length === 1) {
              // Single ring (point, linestring, or simple polygon)
              return convertRing(geometry[0])
            } else {
              // Multiple rings (polygon with holes)
              return geometry.map(ring => convertRing(ring))
            }
          }
        })
        
        const layer = new VectorTileLayer({ layerName })
        setVectorLayer(layer)
        console.log(`PMTiles vector layer created for ${layerName}`)
        
      } catch (error) {
        console.error(`Error initializing PMTiles layer for ${layerName}:`, error)
      }
    }
    
    initializeLayer()
    
    return () => {
      // Cleanup handled in visibility effect
    }
  }, [map, pmtilesUrl, layerName, vectorLayer]) // Fixed dependencies
  
  // Separate effect for handling visibility to avoid re-initialization
  useEffect(() => {
    if (!vectorLayer || !map) return
    
    if (visible) {
      if (!map.hasLayer(vectorLayer)) {
        map.addLayer(vectorLayer)
        console.log(`Added ${layerName} layer to map`)
      }
    } else {
      if (map.hasLayer(vectorLayer)) {
        map.removeLayer(vectorLayer)
        console.log(`Removed ${layerName} layer from map`)
      }
    }
    
    return () => {
      if (vectorLayer && map && map.hasLayer(vectorLayer)) {
        map.removeLayer(vectorLayer)
      }
    }
  }, [vectorLayer, visible, map, layerName])
  
  return null
}

const Level2MapPage = () => {
  const navigate = useNavigate()
  const [mapInstance, setMapInstance] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  
  // Layer data states
  const [citrusParcels, setCitrusParcels] = useState(null)
  const [hernandoParcels, setHernandoParcels] = useState(null)
  const [manateeParcels, setManateeParcels] = useState(null)
  const [pascoParcels, setPascoParcels] = useState(null)
  const [polkParcels, setPolkParcels] = useState(null)
  
  const [hernandoFLU, setHernandoFLU] = useState(null)
  const [manateeFLU, setManateeFLU] = useState(null)
  const [pascoFLU, setPascoFLU] = useState(null)
  const [polkFLU, setPolkFLU] = useState(null)
  const [manateeZoning, setManateeZoning] = useState(null)
  const [pascoZoning, setPascoZoning] = useState(null)
  
  // PMTiles URLs for vector layers
  const floodplainPMTilesUrl = 'https://igpliwujskveyqvgmfpt.supabase.co/storage/v1/object/public/tiles/SWFWMD_Floodplain.pmtiles'
  const wetlandsPMTilesUrl = 'https://igpliwujskveyqvgmfpt.supabase.co/storage/v1/object/public/tiles/SWFWMD_Wetlands.pmtiles'
  
  // Other environmental layers (GeoJSON)
  const [soils, setSoils] = useState(null)
  const [topo, setTopo] = useState(null)
  
  // Layer visibility states - all off by default
  const [visibleLayers, setVisibleLayers] = useState({
    // Base layers
    satellite: true,
    osm: false,
    reference: true, // Reference Labels always on
    // Parcel layers
    citrusParcels: false,
    hernandoParcels: false,
    manateeParcels: false,
    pascoParcels: false,
    polkParcels: false,
    // Planning layers
    hernandoFLU: false,
    manateeFLU: false,
    pascoFLU: false,
    polkFLU: false,
    manateeZoning: false,
    pascoZoning: false,
    // Environmental layers
    floodplain: false,
    soils: false,
    topo: false,
    wetlands: false
  })
  
  // Toggle layer visibility
  const toggleLayer = (layerKey) => {
    setVisibleLayers(prev => {
      const newState = { ...prev, [layerKey]: !prev[layerKey] }
      
      // If turning on a layer, zoom to it
      if (!prev[layerKey]) {
        const layerDataMap = {
          citrusParcels: citrusParcels,
          hernandoParcels: hernandoParcels,
          manateeParcels: manateeParcels,
          pascoParcels: pascoParcels,
          polkParcels: polkParcels
          // PMTiles layers don't need data mapping for zoom
        }
        
        const layerData = layerDataMap[layerKey]
        if (layerData) {
          console.log('Zooming to', layerKey)
          setTimeout(() => zoomToLayer(layerData), 100)
        }
      }
      
      return newState
    })
  }
  
  // Toggle base layer (only one can be active)
  const toggleBaseLayer = (layerKey) => {
    setVisibleLayers(prev => ({
      ...prev,
      satellite: layerKey === 'satellite',
      osm: layerKey === 'osm'
    }))
  }
  
  // Load user favorites for all counties
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        // Load favorites from all counties
        const citrusFavs = await favoritesService.getFavoritesByCounty('Citrus')
        const hernandoFavs = await favoritesService.getFavoritesByCounty('Hernando')
        const manateeFavs = await favoritesService.getFavoritesByCounty('Manatee')
        const pascoFavs = await favoritesService.getFavoritesByCounty('Pasco')
        const polkFavs = await favoritesService.getFavoritesByCounty('Polk')
        
        // Combine all favorite IDs into a single Set
        const allFavorites = [
          ...citrusFavs,
          ...hernandoFavs,
          ...manateeFavs,
          ...pascoFavs,
          ...polkFavs
        ]
        
        const favoriteIds = new Set(allFavorites.map(fav => fav.parcel_id))
        setFavorites(favoriteIds)
      } catch (err) {
        console.error('Error loading favorites:', err)
      }
    }

    loadFavorites()
  }, [])
  
  // Load all layer data
  useEffect(() => {
    const loadAllLayers = async () => {
      try {
        // Load parcel layers
        const citrusRes = await fetch('/data/level2/citrus_parcels.geojson')
        if (citrusRes.ok) setCitrusParcels(await citrusRes.json())
        
        const hernandoParcelRes = await fetch('/data/level2/hernando_parcels.geojson')
        if (hernandoParcelRes.ok) setHernandoParcels(await hernandoParcelRes.json())
        
        const manateeParcelRes = await fetch('/data/level2/manatee_parcels.geojson')
        if (manateeParcelRes.ok) setManateeParcels(await manateeParcelRes.json())
        
        const pascoParcelRes = await fetch('/data/level2/pasco_parcels.geojson')
        if (pascoParcelRes.ok) setPascoParcels(await pascoParcelRes.json())
        
        const polkParcelRes = await fetch('/data/level2/polk_parcels.geojson')
        if (polkParcelRes.ok) setPolkParcels(await polkParcelRes.json())
        
        // Load County Planning layers
        const hernandoFLURes = await fetch('/data/level2/Hernando_FLU.geojson')
        if (hernandoFLURes.ok) setHernandoFLU(await hernandoFLURes.json())
        
        const manateeFLURes = await fetch('/data/level2/Manatee_FLU.geojson')
        if (manateeFLURes.ok) setManateeFLU(await manateeFLURes.json())
        
        const pascoFLURes = await fetch('/data/level2/Pasco_FLU.geojson')
        if (pascoFLURes.ok) setPascoFLU(await pascoFLURes.json())
        
        const polkFLURes = await fetch('/data/level2/Polk_FLU_Simplified.geojson')
        if (polkFLURes.ok) setPolkFLU(await polkFLURes.json())
        
        const manateeZoningRes = await fetch('/data/level2/Manatee_Zoning.geojson')
        if (manateeZoningRes.ok) setManateeZoning(await manateeZoningRes.json())
        
        const pascoZoningRes = await fetch('/data/level2/Pasco_Zoning.geojson')
        if (pascoZoningRes.ok) setPascoZoning(await pascoZoningRes.json())
        
        // Load other environmental layers (soils, topo remain as GeoJSON)
        try {
          const soilsRes = await fetch('/data/level2/soils.geojson')
          if (soilsRes.ok) {
            const soilsData = await soilsRes.json()
            setSoils(soilsData)
          }
        } catch (error) {
          console.error('Error loading soils:', error)
        }
        
        try {
          const topoRes = await fetch('/data/level2/topo.geojson')
          if (topoRes.ok) {
            const topoData = await topoRes.json()
            setTopo(topoData)
          }
        } catch (error) {
          console.error('Error loading topography:', error)
        }
        
      } catch (error) {
        console.error('Error loading Level 2 layers:', error)
      }
    }
    
    loadAllLayers()
  }, [])
  
  // Zoom to layer bounds when a parcel layer is activated
  const zoomToLayer = useCallback((layerData) => {
    if (!mapInstance || !layerData) return
    
    try {
      const geoJsonLayer = L.geoJSON(layerData)
      const bounds = geoJsonLayer.getBounds()
      
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
      }
    } catch (error) {
      console.error('Error zooming to layer:', error)
    }
  }, [mapInstance])
  
  // Remove the handleLayerAdd and useEffect since we're handling it in toggleLayer now
  
  // Styling functions - dynamic based on favorite status
  const parcelStyle = (feature) => {
    // Safety check - return default style if no feature provided
    if (!feature || !feature.properties) {
      return {
        fillColor: '#FFEB3B',  // Bright yellow fill (default)
        weight: 3,
        opacity: 1,
        color: '#FDD835',  // Bright yellow outline
        fillOpacity: 0.4
      }
    }
    
    const props = feature.properties
    
    // Get parcel ID based on county-specific properties
    let parcelId
    if (props.PARCEL_NUMBER) {
      parcelId = props.PARCEL_NUMBER // Hernando
    } else if (props.ALT_ID) {
      parcelId = props.ALT_ID // Citrus
    } else if (props.PARID) {
      parcelId = props.PARID // Manatee
    } else if (props.PARCEL_ID) {
      parcelId = props.PARCEL_ID // Pasco, Polk
    }
    
    // Check if this parcel is favorited
    const isFavorite = favorites.has(parcelId) || favorites.has(String(parcelId)) || favorites.has(Number(parcelId))
    
    if (isFavorite) {
      return {
        fillColor: '#06b6d4', // Bright cyan - stands out from yellow
        weight: 6,
        opacity: 1,
        color: '#0e7490', // Dark cyan border
        fillOpacity: 0.85 // Very high opacity - nearly solid
      }
    } else {
      return {
        fillColor: '#FFEB3B',  // Bright yellow fill (default)
        weight: 3,
        opacity: 1,
        color: '#FDD835',  // Bright yellow outline
        fillOpacity: 0.4
      }
    }
  }

  // Toggle favorite for a parcel
  const toggleFavorite = useCallback(async (parcelId, county) => {
    try {
      // Toggle in database
      const isNowFavorited = await favoritesService.toggleFavorite(parcelId, county, null)
      
      // Update local state
      const newFavorites = new Set(favorites)
      if (isNowFavorited) {
        newFavorites.add(parcelId)
      } else {
        newFavorites.delete(parcelId)
      }
      setFavorites(newFavorites)
      
      // Force a re-render of parcel layers by updating the map
      if (mapInstance) {
        mapInstance.eachLayer((layer) => {
          if (layer.feature && layer.setStyle) {
            // Re-apply the style to reflect favorite status change
            layer.setStyle(parcelStyle(layer.feature))
          }
        })
      }
      
      console.log(`Parcel ${parcelId} in ${county} ${isNowFavorited ? 'added to' : 'removed from'} favorites`)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, mapInstance])

  // Parcel click and hover functionality
  const onEachParcel = (feature, layer) => {
    const props = feature.properties
    
    // County-specific property name mapping and county identification
    let parcelNumber = 'N/A';
    let acres = 'N/A';
    let county = 'Unknown';
    
    // Determine county and parcel number based on available properties
    if (props.PARCEL_NUMBER) {
      parcelNumber = props.PARCEL_NUMBER;
      county = 'Hernando';
    } else if (props.ALT_ID) {
      parcelNumber = props.ALT_ID;
      county = 'Citrus';
    } else if (props.PARID) {
      parcelNumber = props.PARID;
      county = 'Manatee';
    } else if (props.PARCEL_ID) {
      // Both Pasco and Polk use PARCEL_ID, need to differentiate
      parcelNumber = props.PARCEL_ID;
      // Check for Pasco-specific properties to distinguish
      if (props.TWN && props.RNG && props.SEC) {
        // Check township values to distinguish (Pasco vs Polk have different ranges)
        const township = props.TWN;
        if (township && (township.includes('25S') || township.includes('26S') || township.includes('27S') || township.includes('28S'))) {
          county = 'Pasco';
        } else if (township && (township.includes('27S') || township.includes('28S') || township.includes('29S'))) {
          county = 'Polk';
        } else {
          county = 'Pasco/Polk'; // Default if can't determine
        }
      } else {
        county = 'Pasco/Polk'; // Default if can't determine
      }
    }
    
    // Determine acreage based on available properties
    if (props.ACRES) {
      acres = props.ACRES; // Hernando
    } else if (props.Acres) {
      acres = props.Acres; // Citrus, Pasco, Polk
    } else if (props.LAND_ACREAGE_CAMA) {
      acres = props.LAND_ACREAGE_CAMA; // Manatee
    }
    
    // Check if this parcel is favorited
    const isFavorited = favorites.has(parcelNumber) || favorites.has(String(parcelNumber))
    const starIcon = isFavorited ? '⭐' : '☆'
    const favoriteText = isFavorited ? 'Remove from favorites' : 'Add to favorites'
    
    const popupContent = `
      <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
        <div style="font-weight: bold; color: #1976d2; margin-bottom: 4px;">
          📍 ${county} County Parcel
        </div>
        <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;">
          <button 
            id="favorite-btn-${parcelNumber}" 
            style="background: none; border: 1px solid #FFB300; border-radius: 4px; cursor: pointer; font-size: 16px; padding: 4px 12px; line-height: 1; color: #FFB300; display: inline-flex; align-items: center; gap: 4px;" 
            title="${favoriteText}"
          >
            ${starIcon} <span style="font-size: 11px; font-weight: 600;">${isFavorited ? 'FAVORITED' : 'FAVORITE'}</span>
          </button>
        </div>
        <div style="margin-bottom: 6px;">
          <strong>Parcel Number:</strong><br/>
          <span style="font-family: monospace; color: #2e7d32;">${parcelNumber}</span>
        </div>
        <div style="margin-bottom: 6px;">
          <strong>Acreage:</strong> 
          <span style="color: #d32f2f; font-weight: bold;">${acres} acres</span>
        </div>
      </div>
    `
    
    layer.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'custom-popup'
    })
    
    // Add click handler for favorite button when popup opens
    layer.on('popupopen', () => {
      const favoriteBtn = document.getElementById(`favorite-btn-${parcelNumber}`)
      if (favoriteBtn) {
        favoriteBtn.onclick = async (e) => {
          e.stopPropagation()
          
          // Check current state BEFORE toggle
          const wasAlreadyFavorited = favorites.has(parcelNumber) || favorites.has(String(parcelNumber))
          
          // Toggle the favorite
          await toggleFavorite(parcelNumber, county)
          
          // Update button to show the NEW state (opposite of what it was)
          const isNowFavorited = !wasAlreadyFavorited
          favoriteBtn.innerHTML = `${isNowFavorited ? '⭐' : '☆'} <span style="font-size: 11px; font-weight: 600;">${isNowFavorited ? 'FAVORITED' : 'FAVORITE'}</span>`
          favoriteBtn.title = isNowFavorited ? 'Remove from favorites' : 'Add to favorites'
        }
      }
    })

    // Hover effects
    layer.on({
      mouseover: function (e) {
        const layer = e.target
        layer.setStyle({
          weight: 4,
          color: '#FF6F00', // Orange hover color
          fillColor: '#FFE0B2', // Light orange fill
          fillOpacity: 0.7
        })
      },
      mouseout: function (e) {
        const layer = e.target
        layer.setStyle(parcelStyle(feature))
      }
    })
  }
  
  const topoStyle = () => ({
    color: '#8B4513', // Saddle brown color for better visibility
    weight: 2.5, // Thicker lines
    opacity: 0.8, // More opaque
    fillOpacity: 0 // No fill for contour lines
  })

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Level 2 Analysis</h1>
            <p className="text-sm text-gray-600">Multi-county regional analysis view</p>
          </div>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[27.8, -82.0]}
          zoom={9}
          className="h-full w-full"
        >
          <MapController onMapReady={setMapInstance} />
          
          {/* Base Layers */}
          {visibleLayers.satellite && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
            />
          )}
          {visibleLayers.osm && (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
          )}
          
          {/* Reference Layer */}
          {visibleLayers.reference && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri'
              opacity={0.9}
            />
          )}
          
          {/* PARCEL LAYERS */}
          {visibleLayers.citrusParcels && citrusParcels && (
            <GeoJSON
              key="citrus-parcels"
              data={citrusParcels}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}
          
          {visibleLayers.hernandoParcels && hernandoParcels && (
            <GeoJSON
              key="hernando-parcels"
              data={hernandoParcels}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}
          
          {visibleLayers.manateeParcels && manateeParcels && (
            <GeoJSON
              key="manatee-parcels"
              data={manateeParcels}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}
          
          {visibleLayers.pascoParcels && pascoParcels && (
            <GeoJSON
              key="pasco-parcels"
              data={pascoParcels}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}
          
          {visibleLayers.polkParcels && polkParcels && (
            <GeoJSON
              key="polk-parcels"
              data={polkParcels}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}
          
          {/* COUNTY PLANNING LAYERS */}
          {visibleLayers.hernandoFLU && hernandoFLU && (
            <GeoJSON
              key="hernando-flu"
              data={hernandoFLU}
              style={getHernandoFLUStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const fluLabel = properties.LABEL || properties.FLU_LABEL || 'Unknown'
                const fluCode = properties.FLU_CODE || properties.CODE || 'N/A'
                const acreage = properties.ACRES || properties.ACREAGE || 'N/A'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 280px;">
                    <h4 style="margin: 0 0 8px 0; color: #1976D2; font-size: 14px; font-weight: bold;">
                      Hernando County FLU
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Land Use:</strong><br/>
                      <span style="color: #D32F2F;">${fluLabel}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Code:</strong> ${fluCode}
                    </div>
                    ${acreage !== 'N/A' ? `<div style="margin-bottom: 6px;"><strong>Acreage:</strong> ${acreage}</div>` : ''}
                  </div>
                `
                layer.bindPopup(popupContent)
                
                layer.on('mouseover', function() {
                  this.setStyle({ weight: 3, fillOpacity: 0.8 })
                })
                layer.on('mouseout', function() {
                  const originalStyle = getHernandoFLUStyle(feature)
                  this.setStyle(originalStyle)
                })
              }}
            />
          )}
          
          {visibleLayers.manateeFLU && manateeFLU && (
            <GeoJSON
              key="manatee-flu"
              data={manateeFLU}
              style={getManateeFLUStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const fluLabel = properties.FLULABEL || properties.FLU_LABEL || 'Unknown'
                const fluCode = properties.FLUCODE || properties.FLU_CODE || 'N/A'
                const acreage = properties.ACRES || properties.ACREAGE || 'N/A'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 280px;">
                    <h4 style="margin: 0 0 8px 0; color: #1976D2; font-size: 14px; font-weight: bold;">
                      Manatee County FLU
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Land Use:</strong><br/>
                      <span style="color: #D32F2F;">${fluLabel}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Code:</strong> ${fluCode}
                    </div>
                    ${acreage !== 'N/A' ? `<div style="margin-bottom: 6px;"><strong>Acreage:</strong> ${acreage}</div>` : ''}
                  </div>
                `
                layer.bindPopup(popupContent)
                
                layer.on('mouseover', function() {
                  this.setStyle({ weight: 3, fillOpacity: 0.8 })
                })
                layer.on('mouseout', function() {
                  const originalStyle = getManateeFLUStyle(feature)
                  this.setStyle(originalStyle)
                })
              }}
            />
          )}
          
          {visibleLayers.pascoFLU && pascoFLU && (
            <GeoJSON
              key="pasco-flu"
              data={pascoFLU}
              style={getPascoFLUStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const description = properties.DESCRIPTION || properties.DESC || 'Unknown'
                const fluCode = properties.FLU_CODE || properties.CODE || 'N/A'
                const acreage = properties.ACRES || properties.ACREAGE || 'N/A'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 280px;">
                    <h4 style="margin: 0 0 8px 0; color: #1976D2; font-size: 14px; font-weight: bold;">
                      Pasco County FLU
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Land Use:</strong><br/>
                      <span style="color: #D32F2F;">${description}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Code:</strong> ${fluCode}
                    </div>
                    ${acreage !== 'N/A' ? `<div style="margin-bottom: 6px;"><strong>Acreage:</strong> ${acreage}</div>` : ''}
                  </div>
                `
                layer.bindPopup(popupContent)
                
                layer.on('mouseover', function() {
                  this.setStyle({ weight: 3, fillOpacity: 0.8 })
                })
                layer.on('mouseout', function() {
                  const originalStyle = getPascoFLUStyle(feature)
                  this.setStyle(originalStyle)
                })
              }}
            />
          )}
          
          {visibleLayers.polkFLU && polkFLU && (
            <GeoJSON
              key="polk-flu"
              data={polkFLU}
              style={getPolkFLUStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const fluName = properties.FLUNAME || properties.FLU_NAME || 'Unknown'
                const fluCode = properties.FLUCODE || properties.FLU_CODE || 'N/A'
                const acreage = properties.ACRES || properties.ACREAGE || 'N/A'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 280px;">
                    <h4 style="margin: 0 0 8px 0; color: #1976D2; font-size: 14px; font-weight: bold;">
                      Polk County FLU
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Land Use:</strong><br/>
                      <span style="color: #D32F2F;">${fluName}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Code:</strong> ${fluCode}
                    </div>
                    ${acreage !== 'N/A' ? `<div style="margin-bottom: 6px;"><strong>Acreage:</strong> ${acreage}</div>` : ''}
                  </div>
                `
                layer.bindPopup(popupContent)
                
                layer.on('mouseover', function() {
                  this.setStyle({ weight: 3, fillOpacity: 0.8 })
                })
                layer.on('mouseout', function() {
                  const originalStyle = getPolkFLUStyle(feature)
                  this.setStyle(originalStyle)
                })
              }}
            />
          )}
          
          {visibleLayers.manateeZoning && manateeZoning && (
            <GeoJSON
              key="manatee-zoning"
              data={manateeZoning}
              style={getManateeZoningStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const zoneLabel = properties.ZONELABEL || properties.ZONE_LABEL || 'Unknown'
                const zoneCode = properties.ZONECODE || properties.ZONE_CODE || 'N/A'
                const zoneDesc = properties.ZONEDESC || properties.ZONE_DESC || 'N/A'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 280px;">
                    <h4 style="margin: 0 0 8px 0; color: #7B1FA2; font-size: 14px; font-weight: bold;">
                      Manatee County Zoning
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Zone:</strong><br/>
                      <span style="color: #C2185B;">${zoneLabel}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Code:</strong> ${zoneCode}
                    </div>
                    ${zoneDesc !== 'N/A' ? `<div style="margin-bottom: 6px;"><strong>Description:</strong> ${zoneDesc}</div>` : ''}
                  </div>
                `
                layer.bindPopup(popupContent)
                
                layer.on('mouseover', function() {
                  this.setStyle({ weight: 3, fillOpacity: 0.8 })
                })
                layer.on('mouseout', function() {
                  const originalStyle = getManateeZoningStyle(feature)
                  this.setStyle(originalStyle)
                })
              }}
            />
          )}
          
          {visibleLayers.pascoZoning && pascoZoning && (
            <GeoJSON
              key="pasco-zoning"
              data={pascoZoning}
              style={getPascoZoningStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const znType = properties.ZN_TYPE || properties.ZONE_TYPE || 'Unknown'
                const znCode = properties.ZN_CODE || properties.ZONE_CODE || 'N/A'
                const znDesc = properties.ZN_DESC || properties.ZONE_DESC || 'N/A'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 280px;">
                    <h4 style="margin: 0 0 8px 0; color: #7B1FA2; font-size: 14px; font-weight: bold;">
                      Pasco County Zoning
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Zone:</strong><br/>
                      <span style="color: #C2185B;">${znType}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Code:</strong> ${znCode}
                    </div>
                    ${znDesc !== 'N/A' ? `<div style="margin-bottom: 6px;"><strong>Description:</strong> ${znDesc}</div>` : ''}
                  </div>
                `
                layer.bindPopup(popupContent)
                
                layer.on('mouseover', function() {
                  this.setStyle({ weight: 3, fillOpacity: 0.8 })
                })
                layer.on('mouseout', function() {
                  const originalStyle = getPascoZoningStyle(feature)
                  this.setStyle(originalStyle)
                })
              }}
            />
          )}
          
          {/* ENVIRONMENTAL LAYERS */}
          {/* PMTiles Vector Layers */}
          <PMTilesVectorLayer
            pmtilesUrl={floodplainPMTilesUrl}
            visible={visibleLayers.floodplain}
            layerName="floodplain"
            style={{
              color: '#4A90E2',
              weight: 2,
              fillColor: '#4A90E2',
              fillOpacity: 0.5
            }}
          />
          
          <PMTilesVectorLayer
            pmtilesUrl={wetlandsPMTilesUrl}
            visible={visibleLayers.wetlands}
            layerName="wetlands"
            style={{
              color: '#2E7D32',
              weight: 2,
              fillColor: '#2E7D32',
              fillOpacity: 0.5
            }}
          />
          
          {/* Other GeoJSON Environmental Layers */}
          {visibleLayers.soils && soils && (
            <GeoJSON
              key="soils"
              data={soils}
              style={getSoilStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const muname = properties.MUNAME || 'Unknown'
                const drainageClass = properties.DRCLASSDCD || 'Unknown'
                const soilOrder = properties.TAXORDER || 'Unknown'
                const compName = properties.COMPNAME || 'Unknown'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 250px;">
                    <h4 style="margin: 0 0 8px 0; color: #2E7D32; font-size: 14px; font-weight: bold;">
                      Soil Information
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Map Unit:</strong><br/>
                      <span style="color: #1976D2;">${muname}</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Component:</strong> ${compName}
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Drainage:</strong> ${drainageClass}
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Soil Order:</strong> ${soilOrder}
                    </div>
                  </div>
                `
                
                layer.bindPopup(popupContent)
                
                // Optional: Add hover effects
                layer.on('mouseover', function() {
                  this.setStyle({
                    weight: 3,
                    fillOpacity: 0.7
                  })
                })
                
                layer.on('mouseout', function() {
                  // Reset to original style
                  const originalStyle = getSoilStyle(feature)
                  this.setStyle(originalStyle)
                })
              }}
            />
          )}
          
          {visibleLayers.topo && topo && (
            <GeoJSON
              key="topo"
              data={topo}
              style={topoStyle}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties || {}
                const elevation = properties.ELEVATION || properties.elevation || 'Unknown'
                const objectId = properties.OBJECTID || properties.objectid || 'N/A'
                const contourType = properties.DEPRESSION === 1 ? 'Depression' : 'Elevation'
                const shapeLength = properties.Shape_Length || properties.ShapeSTLen || 'N/A'
                
                const popupContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 220px;">
                    <h4 style="margin: 0 0 8px 0; color: #8B4513; font-size: 14px; font-weight: bold;">
                      Topography Contour
                    </h4>
                    <div style="margin-bottom: 6px;">
                      <strong>Elevation:</strong><br/>
                      <span style="color: #D2691E; font-size: 18px; font-weight: bold;">${elevation} feet</span>
                    </div>
                    <div style="margin-bottom: 6px;">
                      <strong>Type:</strong> ${contourType}
                    </div>
                    ${shapeLength !== 'N/A' ? `<div style="margin-bottom: 6px;"><strong>Length:</strong> ${Math.round(parseFloat(shapeLength))} feet</div>` : ''}
                    <div style="margin-bottom: 6px;">
                      <strong>Object ID:</strong> ${objectId}
                    </div>
                  </div>
                `
                
                layer.bindPopup(popupContent)
                
                // Add hover effects with elevation display
                layer.on('mouseover', function() {
                  this.setStyle({
                    color: '#FF6347', // Tomato color on hover
                    weight: 4,
                    opacity: 1
                  })
                  
                  // Show tooltip with elevation
                  layer.bindTooltip(`${elevation} ft`, {
                    permanent: false,
                    direction: 'top',
                    className: 'elevation-tooltip',
                    style: {
                      backgroundColor: 'rgba(139, 69, 19, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '4px 8px'
                    }
                  }).openTooltip()
                })
                
                layer.on('mouseout', function() {
                  this.setStyle(topoStyle())
                  layer.closeTooltip()
                })
              }}
            />
          )}
        </MapContainer>
        
        {/* Combined Legend & Layer Control */}
        <div className="absolute top-6 right-6 bg-white rounded-lg shadow-lg max-w-xs max-h-[80vh] overflow-y-auto z-[1000]">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-lg">
            <h3 className="font-bold text-gray-900">Layers & Legend</h3>
            <p className="text-xs text-gray-500 mt-1">
              Active layers: {Object.values(visibleLayers).filter(Boolean).length}
            </p>
          </div>
          
          <div className="p-4">
            {/* Base Maps Section */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Base Maps</h4>
              <div className="space-y-2">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  onClick={() => toggleBaseLayer('satellite')}
                >
                  <input
                    type="radio"
                    name="baseLayer"
                    checked={visibleLayers.satellite}
                    onChange={() => {}}
                    readOnly
                    className="w-4 h-4 text-primary-600 pointer-events-none"
                  />
                  <span className="text-sm text-gray-700">Satellite</span>
                </div>
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  onClick={() => toggleBaseLayer('osm')}
                >
                  <input
                    type="radio"
                    name="baseLayer"
                    checked={visibleLayers.osm}
                    onChange={() => {}}
                    readOnly
                    className="w-4 h-4 text-primary-600 pointer-events-none"
                  />
                  <span className="text-sm text-gray-700">Street Map</span>
                </div>
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  onClick={() => toggleLayer('reference')}
                >
                  <input
                    type="checkbox"
                    checked={visibleLayers.reference}
                    onChange={() => {}}
                    readOnly
                    className="w-4 h-4 text-primary-600 rounded pointer-events-none"
                  />
                  <span className="text-sm text-gray-700">Reference Labels</span>
                </div>
              </div>
            </div>
            
            {/* Parcels Section */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Parcels</h4>
              {/* Parcel color legend */}
              <div className="mb-3 bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: '#FDD835', backgroundColor: '#FFEB3B', opacity: 0.6 }}></div>
                  <span className="text-gray-600">All parcels shown in bright yellow</span>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { key: 'citrusParcels', label: 'Citrus', data: citrusParcels },
                  { key: 'hernandoParcels', label: 'Hernando', data: hernandoParcels },
                  { key: 'manateeParcels', label: 'Manatee', data: manateeParcels },
                  { key: 'pascoParcels', label: 'Pasco', data: pascoParcels },
                  { key: 'polkParcels', label: 'Polk', data: polkParcels }
                ].map(({ key, label, data }) => (
                  <div 
                    key={key} 
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={() => {
                      if (data) {
                        toggleLayer(key)
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleLayers[key]}
                      onChange={() => {}}
                      readOnly
                      disabled={!data}
                      className="w-4 h-4 text-primary-600 rounded pointer-events-none"
                    />
                    <span className={`text-sm ${data ? 'text-gray-700' : 'text-gray-400'}`}>
                      {label} {!data && '(loading...)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* County Planning Section */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">County Planning</h4>
              <div className="space-y-2 mb-3">
                {[
                  { key: 'hernandoFLU', label: 'Hernando FLU', data: hernandoFLU },
                  { key: 'manateeFLU', label: 'Manatee FLU', data: manateeFLU },
                  { key: 'pascoFLU', label: 'Pasco FLU', data: pascoFLU },
                  { key: 'polkFLU', label: 'Polk FLU', data: polkFLU },
                  { key: 'manateeZoning', label: 'Manatee Zoning', data: manateeZoning },
                  { key: 'pascoZoning', label: 'Pasco Zoning', data: pascoZoning }
                ].map(({ key, label, data }) => (
                  <div 
                    key={key} 
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={() => {
                      if (data) {
                        toggleLayer(key)
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleLayers[key]}
                      onChange={() => {}}
                      readOnly
                      disabled={!data}
                      className="w-4 h-4 text-primary-600 rounded pointer-events-none"
                    />
                    <span className={`text-sm ${data ? 'text-gray-700' : 'text-gray-400'}`}>
                      {label} {!data && '(loading...)'}
                    </span>
                  </div>
                ))}
              </div>
              {/* FLU/Zoning Color Legend */}
              <div className="text-xs space-y-1 pl-6 bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: '#FFE082' }}></div>
                  <span className="text-gray-600">Residential</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: '#EF5350' }}></div>
                  <span className="text-gray-600">Commercial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: '#AB47BC' }}></div>
                  <span className="text-gray-600">Industrial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: '#66BB6A' }}></div>
                  <span className="text-gray-600">Agriculture</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: '#26A69A' }}></div>
                  <span className="text-gray-600">Conservation</span>
                </div>
              </div>
            </div>
            
            {/* Environmental Section */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Environmental</h4>
              <div className="space-y-2">
                {[
                  { key: 'floodplain', label: 'Floodplain', color: '#4A90E2', data: true }, // PMTiles always "available"
                  { key: 'soils', label: 'Soils', color: '#D7CCC8', data: soils },
                  { key: 'topo', label: 'Topography', color: '#FFF59D', data: topo },
                  { key: 'wetlands', label: 'Wetlands', color: '#2E7D32', data: true } // PMTiles always "available"
                ].map(({ key, label, color, data }) => (
                  <div 
                    key={key} 
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    onClick={() => {
                      if (data) {
                        toggleLayer(key)
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleLayers[key]}
                      onChange={() => {}}
                      readOnly
                      disabled={!data}
                      className="w-4 h-4 text-primary-600 rounded pointer-events-none"
                    />
                    <div className="w-4 h-4 rounded border border-gray-400 flex-shrink-0" style={{ backgroundColor: color }}></div>
                    <span className={`text-sm ${data ? 'text-gray-700' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Level2MapPage
