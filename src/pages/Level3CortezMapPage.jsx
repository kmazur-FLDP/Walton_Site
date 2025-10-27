import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import PrintButton from '../components/PrintButton'
import { getHernandoZoningStyle, getHernandoFLUStyle } from '../utils/colorMaps'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Component to handle map instance and bounds fitting
const MapController = ({ parcelData, onMapReady }) => {
  const map = useMap()
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])
  
  useEffect(() => {
    if (map && parcelData) {
      try {
        const bounds = L.geoJSON(parcelData).getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] })
          // Zoom out by 1 level after fitting
          setTimeout(() => {
            map.zoomOut(1)
          }, 100)
        }
      } catch (err) {
        console.error('Error fitting bounds:', err)
      }
    }
  }, [map, parcelData])
  
  return null
}

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const Level3CortezMapPage = () => {
  const navigate = useNavigate()
  const mapRef = useRef()
  const [loading, setLoading] = useState(true)
  
  // Layer data states
  const [parcelData, setParcelData] = useState(null)
  const [floodplainData, setFloodplainData] = useState(null)
  const [fluData, setFluData] = useState(null)
  const [zoningData, setZoningData] = useState(null)
  const [topoData, setTopoData] = useState(null)
  const [wetlandsData, setWetlandsData] = useState(null)
  const [pressurePipesData, setPressurePipesData] = useState(null)
  const [waterPipesData, setWaterPipesData] = useState(null)
  
  // Layer visibility states - all off by default except parcel
  const [showFloodplain, setShowFloodplain] = useState(false)
  const [showFLU, setShowFLU] = useState(false)
  const [showZoning, setShowZoning] = useState(false)
  const [showTopo, setShowTopo] = useState(false)
  const [showWetlands, setShowWetlands] = useState(false)
  const [showPressurePipes, setShowPressurePipes] = useState(false)
  const [showWaterPipes, setShowWaterPipes] = useState(false)

  // Load all layer data when component mounts
  useEffect(() => {
    const loadAllLayers = async () => {
      try {
        setLoading(true)
        console.log('Loading Level 3 Cortez parcel data...')
        
        // Load all layers in parallel
        const [parcel, floodplain, flu, zoning, topo, wetlands, pressurePipes, waterPipes] = await Promise.all([
          fetch('/data/level3/Level_3_Cortez_Parcel.geojson').then(r => r.json()),
          fetch('/data/level3/Level_3_Cortez_Floodplain.geojson').then(r => r.json()),
          fetch('/data/level3/Level_3_Cortez_FLU.geojson').then(r => r.json()),
          fetch('/data/level3/Level_3_Cortez_Zoning.geojson').then(r => r.json()),
          fetch('/data/level3/Level_3_Cortez_Topo.geojson').then(r => r.json()),
          fetch('/data/level3/Level_3_Cortez_Wetlands.geojson').then(r => r.json()),
          fetch('/data/level3/Level_3_Cortez_Pressure_Pipes.geojson').then(r => r.json()),
          fetch('/data/level3/Level_3_Cortez_Water_Pipes.geojson').then(r => r.json())
        ])
        
        setParcelData(parcel)
        setFloodplainData(floodplain)
        setFluData(flu)
        setZoningData(zoning)
        setTopoData(topo)
        setWetlandsData(wetlands)
        setPressurePipesData(pressurePipes)
        setWaterPipesData(waterPipes)
        
        console.log('All Cortez layers loaded successfully')
      } catch (err) {
        console.error('Error loading layer data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAllLayers()
  }, [])

  // Parcel style - highlighted
  const parcelStyle = {
    fillColor: '#FFD700',
    fillOpacity: 0.3,
    color: '#FF6B00',
    weight: 3
  }

  // Floodplain style
  const floodplainStyle = (feature) => {
    const fldZone = feature.properties?.FLD_ZONE || feature.properties?.ZONE || ''
    
    if (fldZone.startsWith('A')) {
      return { fillColor: '#4169E1', fillOpacity: 0.4, color: '#0000CD', weight: 1 }
    } else if (fldZone.startsWith('X')) {
      return { fillColor: '#FFD700', fillOpacity: 0.3, color: '#FFA500', weight: 1 }
    }
    
    return { fillColor: '#87CEEB', fillOpacity: 0.3, color: '#4682B4', weight: 1 }
  }

  // Topo style (contour lines)
  const topoStyle = {
    color: '#D2691E',  // Chocolate/orange-brown for better visibility
    weight: 2,
    opacity: 0.8
  }

  // Wetlands style
  const wetlandsStyle = {
    fillColor: '#2E8B57',
    fillOpacity: 0.5,
    color: '#006400',
    weight: 2
  }

  // Pressure pipes style
  const pressurePipesStyle = {
    color: '#FF0000',
    weight: 3,
    opacity: 0.8
  }

  // Water pipes style
  const waterPipesStyle = {
    color: '#0000FF',
    weight: 3,
    opacity: 0.8
  }

  // Popup handlers for each layer
  const onEachParcel = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties
      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-lg mb-2">Cortez Parcel</h3>
          ${Object.entries(props).map(([key, value]) => 
            `<p><strong>${key}:</strong> ${value || 'N/A'}</p>`
          ).join('')}
        </div>
      `
      layer.bindPopup(popupContent)
    }
  }

  const onEachFloodplain = (feature, layer) => {
    if (feature.properties) {
      const zone = feature.properties.FLD_ZONE || feature.properties.ZONE || 'Unknown'
      layer.bindPopup(`<strong>Flood Zone:</strong> ${zone}`)
    }
  }

  const onEachFLU = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties
      const flu = props.FLU || 'Unknown'
      const label = props.LABEL || 'Unknown'
      layer.bindPopup(`
        <div class="p-2">
          <p><strong>FLU:</strong> ${flu}</p>
          <p><strong>Label:</strong> ${label}</p>
        </div>
      `)
    }
  }

  const onEachZoning = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties
      const zoning = props.ZONING || 'Unknown'
      const zoneDesc = props.ZONEDESC || 'Unknown'
      layer.bindPopup(`
        <div class="p-2">
          <p><strong>Zoning:</strong> ${zoning}</p>
          <p><strong>Description:</strong> ${zoneDesc}</p>
        </div>
      `)
    }
  }

  const onEachTopo = (feature, layer) => {
    if (feature.properties) {
      const elevation = feature.properties.ELEVATION || feature.properties.CONTOUR || 'Unknown'
      
      // Add popup
      layer.bindPopup(`<strong>Elevation:</strong> ${elevation} ft`)
      
      // Add permanent label on the contour line
      if (elevation !== 'Unknown' && layer instanceof L.Polyline) {
        // Create a tooltip (permanent label)
        layer.bindTooltip(`${elevation}'`, {
          permanent: true,
          direction: 'center',
          className: 'contour-label',
          opacity: 0.9
        })
      }
    }
  }

  const onEachWetlands = (feature, layer) => {
    if (feature.properties) {
      const wetlandType = feature.properties.WETLAND_TYPE || feature.properties.TYPE || 'Wetland'
      layer.bindPopup(`<strong>Wetland Type:</strong> ${wetlandType}`)
    }
  }

  const onEachPressurePipe = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties
      const diameter = props.DIAMETER || props.SIZE || 'Unknown'
      const material = props.MATERIAL || 'Unknown'
      layer.bindPopup(`
        <div class="p-2">
          <p><strong>Pressure Pipe</strong></p>
          <p><strong>Diameter:</strong> ${diameter}</p>
          <p><strong>Material:</strong> ${material}</p>
        </div>
      `)
    }
  }

  const onEachWaterPipe = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties
      const diameter = props.DIAMETER || props.SIZE || 'Unknown'
      const material = props.MATERIAL || 'Unknown'
      layer.bindPopup(`
        <div class="p-2">
          <p><strong>Water Pipe</strong></p>
          <p><strong>Diameter:</strong> ${diameter}</p>
          <p><strong>Material:</strong> ${material}</p>
        </div>
      `)
    }
  }

  return (
    <>
      {/* Left Sidebar - Fixed Position */}
      <div 
        className="w-80 bg-white shadow-2xl flex flex-col overflow-y-auto" 
        style={{ 
          position: 'fixed', 
          top: '64px', 
          left: 0, 
          bottom: '44px',
          zIndex: 10
        }}
      >
        {/* Sidebar Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors mb-3"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-lg font-bold text-white">
            Level 3 - Hernando County
          </h1>
          <p className="text-sm text-blue-100">Cortez Parcel Analysis</p>
          
          {/* Acreage and Owner Display */}
          {parcelData && parcelData.features && parcelData.features[0] && (
            <div className="mt-3 pt-3 border-t border-blue-500/30 space-y-2">
              {parcelData.features[0].properties.LND_SQFOOT && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-100">Total Acreage:</span>
                  <span className="text-xl font-bold text-white">
                    {(parcelData.features[0].properties.LND_SQFOOT / 43560).toFixed(2)} ac
                  </span>
                </div>
              )}
              {parcelData.features[0].properties.OWN_NAME && (
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-blue-100">Owner:</span>
                  <span className="text-sm font-semibold text-white mt-1">
                    {parcelData.features[0].properties.OWN_NAME}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Parcel Information Section */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Parcel Information
          </h2>
          {parcelData && parcelData.features && parcelData.features[0] ? (
            <div className="space-y-2 text-sm">
              {parcelData.features[0].properties.PARCEL_ID && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Parcel ID:</span>
                  <span className="text-gray-900 font-semibold">{parcelData.features[0].properties.PARCEL_ID}</span>
                </div>
              )}
              {parcelData.features[0].properties.ADDRESS && (
                <div className="flex flex-col">
                  <span className="font-medium text-gray-600">Address:</span>
                  <span className="text-gray-900 mt-1">{parcelData.features[0].properties.ADDRESS}</span>
                </div>
              )}
              {parcelData.features[0].properties.CITY && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">City:</span>
                  <span className="text-gray-900">{parcelData.features[0].properties.CITY}</span>
                </div>
              )}
              {parcelData.features[0].properties.ZIP && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">ZIP Code:</span>
                  <span className="text-gray-900">{parcelData.features[0].properties.ZIP}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading parcel information...</p>
          )}
        </div>

        {/* Map Layers Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Map Layers
          </h2>

          <div className="space-y-4">
          {/* Environmental Layers Group */}
          <div className="border-b border-gray-200 pb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Environmental</h4>
            <div className="space-y-1">
              
              <button
                onClick={() => setShowFloodplain(!showFloodplain)}
                className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                  showFloodplain 
                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className={`text-sm font-medium ${showFloodplain ? 'text-blue-700' : 'text-gray-700'}`}>
                  Floodplain
                </span>
                {showFloodplain ? <EyeIcon className="h-4 w-4 text-blue-600 ml-auto" /> : <EyeSlashIcon className="h-4 w-4 text-gray-400 ml-auto" />}
              </button>
              
              <button
                onClick={() => setShowWetlands(!showWetlands)}
                className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                  showWetlands 
                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className={`text-sm font-medium ${showWetlands ? 'text-blue-700' : 'text-gray-700'}`}>
                  Wetlands
                </span>
                {showWetlands ? <EyeIcon className="h-4 w-4 text-blue-600 ml-auto" /> : <EyeSlashIcon className="h-4 w-4 text-gray-400 ml-auto" />}
              </button>
              
              <button
                onClick={() => setShowTopo(!showTopo)}
                className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                  showTopo 
                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className={`text-sm font-medium ${showTopo ? 'text-blue-700' : 'text-gray-700'}`}>
                  Topography
                </span>
                {showTopo ? <EyeIcon className="h-4 w-4 text-blue-600 ml-auto" /> : <EyeSlashIcon className="h-4 w-4 text-gray-400 ml-auto" />}
              </button>
            </div>
          </div>
          
          {/* Land Use & Zoning Group */}
          <div className="border-b border-gray-200 pb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Land Use & Zoning</h4>
            <div className="space-y-1">
              
              <button
                onClick={() => setShowFLU(!showFLU)}
                className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                  showFLU 
                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className={`text-sm font-medium ${showFLU ? 'text-blue-700' : 'text-gray-700'}`}>
                  Future Land Use
                </span>
                {showFLU ? <EyeIcon className="h-4 w-4 text-blue-600 ml-auto" /> : <EyeSlashIcon className="h-4 w-4 text-gray-400 ml-auto" />}
              </button>
              
              <button
                onClick={() => setShowZoning(!showZoning)}
                className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                  showZoning 
                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className={`text-sm font-medium ${showZoning ? 'text-blue-700' : 'text-gray-700'}`}>
                  Zoning
                </span>
                {showZoning ? <EyeIcon className="h-4 w-4 text-blue-600 ml-auto" /> : <EyeSlashIcon className="h-4 w-4 text-gray-400 ml-auto" />}
              </button>
            </div>
          </div>
          
          {/* Infrastructure Group */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Infrastructure</h4>
            <div className="space-y-1">
              
              <button
                onClick={() => setShowPressurePipes(!showPressurePipes)}
                className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                  showPressurePipes 
                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className={`text-sm font-medium ${showPressurePipes ? 'text-blue-700' : 'text-gray-700'}`}>
                  Pressure Pipes
                </span>
                {showPressurePipes ? <EyeIcon className="h-4 w-4 text-blue-600 ml-auto" /> : <EyeSlashIcon className="h-4 w-4 text-gray-400 ml-auto" />}
              </button>
              
              <button
                onClick={() => setShowWaterPipes(!showWaterPipes)}
                className={`w-full text-left flex items-center gap-2 p-2 rounded transition-colors ${
                  showWaterPipes 
                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className={`text-sm font-medium ${showWaterPipes ? 'text-blue-700' : 'text-gray-700'}`}>
                  Water Pipes
                </span>
                {showWaterPipes ? <EyeIcon className="h-4 w-4 text-blue-600 ml-auto" /> : <EyeSlashIcon className="h-4 w-4 text-gray-400 ml-auto" />}
              </button>
            </div>
          </div>
        </div> {/* End of space-y-4 */}
      </div> {/* End of Map Layers Section */}
      </div> {/* End of Sidebar */}
      {/* Main Content Area - Map */}
      <div 
        className="relative" 
        style={{ 
          position: 'fixed',
          top: '64px',
          left: '320px',
          right: 0,
          bottom: '44px'
        }}
      >
        {loading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000]">
            <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 font-medium">Loading map layers...</span>
            </div>
          </div>
        )}

        {/* Map Container */}
        <MapContainer
          ref={mapRef}
          center={[28.55, -82.55]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          {/* Aerial imagery */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={19}
          />
          {/* Roads and transportation overlay */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={19}
            zIndex={1000}
          />
          {/* Boundaries and place labels overlay */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={19}
            zIndex={1001}
          />
          
          {/* Map Controller to handle zoom to parcel */}
          <MapController parcelData={parcelData} />

          {/* Parcel Layer - Always visible */}
          {parcelData && (
            <GeoJSON
              data={parcelData}
              style={parcelStyle}
              onEachFeature={onEachParcel}
            />
          )}

          {/* Floodplain Layer */}
          {showFloodplain && floodplainData && (
            <GeoJSON
              data={floodplainData}
              style={floodplainStyle}
              onEachFeature={onEachFloodplain}
            />
          )}

          {/* FLU Layer */}
          {showFLU && fluData && (
            <GeoJSON
              data={fluData}
              style={getHernandoFLUStyle}
              onEachFeature={onEachFLU}
            />
          )}

          {/* Zoning Layer */}
          {showZoning && zoningData && (
            <GeoJSON
              data={zoningData}
              style={getHernandoZoningStyle}
              onEachFeature={onEachZoning}
            />
          )}

          {/* Topography Layer */}
          {showTopo && topoData && (
            <GeoJSON
              data={topoData}
              style={topoStyle}
              onEachFeature={onEachTopo}
            />
          )}

          {/* Wetlands Layer */}
          {showWetlands && wetlandsData && (
            <GeoJSON
              data={wetlandsData}
              style={wetlandsStyle}
              onEachFeature={onEachWetlands}
            />
          )}

          {/* Pressure Pipes Layer */}
          {showPressurePipes && pressurePipesData && (
            <GeoJSON
              data={pressurePipesData}
              style={pressurePipesStyle}
              onEachFeature={onEachPressurePipe}
            />
          )}

          {/* Water Pipes Layer */}
          {showWaterPipes && waterPipesData && (
            <GeoJSON
              data={waterPipesData}
              style={waterPipesStyle}
              onEachFeature={onEachWaterPipe}
            />
          )}
        </MapContainer>
      </div>
    </>
  )
}

export default Level3CortezMapPage
