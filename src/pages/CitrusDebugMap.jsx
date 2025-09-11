import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Rectangle, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const CitrusDebugMap = () => {
  const mapRef = useRef()
  const [parcelData, setParcelData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bounds, setBounds] = useState(null)
  const [landmarkMatches, setLandmarkMatches] = useState([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/Citrus_Parcels.geojson')
        const data = await response.json()
        
        console.log('=== CITRUS DEBUG ANALYSIS ===')
        console.log('Total features:', data.features?.length)
        
  // Calculate distribution of parcels across the county
        const lats = [], lngs = []
  const parcelCenters = []
        
        data.features.forEach((feature) => {
          if (feature.geometry.type === 'Polygon') {
            // Calculate centroid of each parcel
            let totalLat = 0, totalLng = 0, pointCount = 0
            feature.geometry.coordinates[0].forEach(([lng, lat]) => {
              lats.push(lat)
              lngs.push(lng)
              totalLat += lat
              totalLng += lng
              pointCount++
            })
            const centerLat = totalLat / pointCount
            const centerLng = totalLng / pointCount
            parcelCenters.push({ lat: centerLat, lng: centerLng, id: feature.properties.PARCEL_UID })
          }
        })
        
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)
        
        console.log('Coordinate bounds:', [[minLat, minLng], [maxLat, maxLng]])
        console.log('County span:', { lat: maxLat - minLat, lng: maxLng - minLng })
        
        // Analyze distribution across the county
        const westCount = parcelCenters.filter(p => p.lng < -82.5).length
        const eastCount = parcelCenters.filter(p => p.lng >= -82.5).length
        const northCount = parcelCenters.filter(p => p.lat > 28.85).length
        const southCount = parcelCenters.filter(p => p.lat <= 28.85).length
        
        console.log('Parcel distribution:')
        console.log(`West of -82.5: ${westCount} (${(westCount/parcelCenters.length*100).toFixed(1)}%)`)
        console.log(`East of -82.5: ${eastCount} (${(eastCount/parcelCenters.length*100).toFixed(1)}%)`)
        console.log(`North of 28.85: ${northCount} (${(northCount/parcelCenters.length*100).toFixed(1)}%)`)
        console.log(`South of 28.85: ${southCount} (${(southCount/parcelCenters.length*100).toFixed(1)}%)`)
        
        setBounds([[minLat, minLng], [maxLat, maxLng]])
  setParcelData(data)

        // Landmarks (authoritative WGS84 lat/lng)
        const landmarks = [
          { name: 'Crystal River',    lat: 28.9012, lng: -82.5904 },
          { name: 'Inverness',        lat: 28.8361, lng: -82.3328 },
          { name: 'Floral City',      lat: 28.7417, lng: -82.2965 }
        ]

        const matches = landmarks.map(lm => {
          let best = null
          let bestDist = Infinity
          parcelCenters.forEach(p => {
            const dLat = p.lat - lm.lat
            const dLng = p.lng - lm.lng
            const dist = Math.sqrt(dLat*dLat + dLng*dLng)
            if (dist < bestDist) {
              bestDist = dist
              best = { ...p, dist, dLat, dLng }
            }
          })
          return { landmark: lm, nearest: best }
        })
        setLandmarkMatches(matches)

        console.group('Landmark Offset Diagnostics')
        matches.forEach(m => {
          if (m.nearest) {
            console.log(`${m.landmark.name}: nearest parcel ${m.nearest.id} center=(${m.nearest.lat.toFixed(6)}, ${m.nearest.lng.toFixed(6)}) Δlat=${(m.nearest.dLat).toFixed(6)} Δlng=${(m.nearest.dLng).toFixed(6)} distDeg=${m.nearest.dist.toFixed(6)} (~${(m.nearest.dist*69).toFixed(2)} mi)`) // rough miles
          }
        })
        console.groupEnd()

        setLoading(false)
        
      } catch (error) {
        console.error('Error loading debug data:', error)
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  const parcelStyle = (feature) => {
    // Color code parcels by region to see distribution
    const coords = feature.geometry.coordinates[0]
    let totalLat = 0, totalLng = 0
    coords.forEach(([lng, lat]) => {
      totalLat += lat
      totalLng += lng
    })
    const CENTER_LAT = totalLat / coords.length
    const CENTER_LNG = totalLng / coords.length
    
    let color = '#ffeb3b' // Default yellow
    if (CENTER_LNG < -82.6) color = '#f44336' // Red for far west
    else if (CENTER_LNG < -82.4) color = '#ff9800' // Orange for west
    else if (CENTER_LNG < -82.3) color = '#4caf50' // Green for east
    else color = '#2196f3' // Blue for far east
    
    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: color,
      fillOpacity: 0.6
    }
  }

  if (loading) {
    return <div className="p-8">Loading debug data...</div>
  }

  // Helper to format miles from degree distance (rough, ignores cos(lat) for lng)
  const toMiles = (m) => (m * 69).toFixed(2)

  return (
    <div className="h-screen">
      <div className="h-20 bg-gray-100 flex items-center px-4">
        <div>
          <h1 className="text-xl font-bold">Citrus County Debug Map</h1>
          <div className="text-sm text-gray-600">
            {parcelData?.features?.length || 0} parcels | Color coded by longitude
          </div>
        </div>
        <div className="ml-8 text-xs">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500"></div>
              <span>Far West (&lt; -82.6)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500"></div>
              <span>West (-82.6 to -82.4)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500"></div>
              <span>East (-82.4 to -82.3)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500"></div>
              <span>Far East (&gt; -82.3)</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-[calc(100vh-5rem)]">
        <MapContainer
          ref={mapRef}
          center={[28.853070, -82.501830]} // Calculated center from our analysis
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
          />
          
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            opacity={0.9}
          />

          {/* Approximate county boundary rectangle */}
          {bounds && (
            <Rectangle
              bounds={bounds}
              pathOptions={{
                color: 'red',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.1,
                dashArray: '10, 10'
              }}
            />
          )}

          {/* Expected center marker */}
          <Marker position={[28.9005, -82.4808]}>
            <Popup>
              <strong>Expected Citrus Center</strong><br/>
              [28.9005, -82.4808]
            </Popup>
          </Marker>

          {/* Calculated center marker */}
          <Marker position={[28.853070, -82.501830]}>
            <Popup>
              <strong>Calculated Center</strong><br/>
              [28.853070, -82.501830]<br/>
              <em>From actual parcel data</em>
            </Popup>
          </Marker>

          {/* Landmark markers & connecting lines to nearest parcel centroid */}
          {landmarkMatches.map(m => (
            <>
              <Marker key={`lm-${m.landmark.name}`} position={[m.landmark.lat, m.landmark.lng]}>
                <Popup>
                  <strong>{m.landmark.name}</strong><br/>
                  Landmark: [{m.landmark.lat.toFixed(4)}, {m.landmark.lng.toFixed(4)}]<br/>
                  {m.nearest && (
                    <>
                      Nearest parcel {m.nearest.id}<br/>
                      Δlat {m.nearest.dLat.toFixed(4)}, Δlng {m.nearest.dLng.toFixed(4)}<br/>
                      Dist ~{toMiles(m.nearest.dist)} mi
                    </>
                  )}
                </Popup>
              </Marker>
              {m.nearest && (
                <>
                  <Marker key={`centroid-${m.landmark.name}`} position={[m.nearest.lat, m.nearest.lng]}>
                    <Popup>
                      <strong>Nearest Parcel Centroid</strong><br/>
                      Parcel {m.nearest.id}<br/>
                      [{m.nearest.lat.toFixed(6)}, {m.nearest.lng.toFixed(6)}]<br/>
                      Offset to {m.landmark.name}:<br/>
                      Δlat {m.nearest.dLat.toFixed(5)} Δlng {m.nearest.dLng.toFixed(5)}<br/>
                      ≈ {toMiles(m.nearest.dist)} mi
                    </Popup>
                  </Marker>
                  <Polyline
                    key={`line-${m.landmark.name}`}
                    positions={[[m.landmark.lat, m.landmark.lng],[m.nearest.lat, m.nearest.lng]]}
                    pathOptions={{ color: '#ef4444', weight: 2, dashArray: '6,4' }}
                  />
                </>
              )}
            </>
          ))}

          {/* Parcels with distribution coloring */}
          {parcelData && (
            <GeoJSON
              key="debug-parcels"
              data={parcelData}
              style={parcelStyle}
              onEachFeature={(feature, layer) => {
                const coords = feature.geometry.coordinates[0]
                let totalLat = 0, totalLng = 0
                coords.forEach(([lng, lat]) => {
                  totalLat += lat
                  totalLng += lng
                })
                const centerLat = totalLat / coords.length
                const centerLng = totalLng / coords.length
                
                layer.bindPopup(
                  `<div>
                    <strong>Parcel ${feature.properties.PARCEL_UID}</strong><br/>
                    Center: [${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}]<br/>
                    Bounds: ${coords.length} points<br/>
                    Owner: ${feature.properties.OWN1 || 'Unknown'}
                  </div>`
                )
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}

export default CitrusDebugMap
