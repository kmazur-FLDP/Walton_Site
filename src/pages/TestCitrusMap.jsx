import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const TestCitrusMap = () => {
  const mapRef = useRef()
  const [parcelData, setParcelData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/Citrus_Parcels.geojson')
        const data = await response.json()
        
        console.log('=== SIMPLE TEST LOAD ===')
        console.log('Features loaded:', data.features?.length)
        console.log('First feature coordinates:', data.features[0]?.geometry?.coordinates[0]?.slice(0, 3))
        
        // Take only first 10 parcels for easy testing
        const testData = {
          ...data,
          features: data.features.slice(0, 10)
        }
        
        setParcelData(testData)
        setLoading(false)
        
        // Calculate simple bounds manually
        let minLat = Infinity, maxLat = -Infinity
        let minLng = Infinity, maxLng = -Infinity
        
        testData.features.forEach(feature => {
          const coords = feature.geometry.coordinates[0] // Polygon exterior ring
          coords.forEach(([lng, lat]) => {
            if (lat < minLat) minLat = lat
            if (lat > maxLat) maxLat = lat
            if (lng < minLng) minLng = lng
            if (lng > maxLng) maxLng = lng
          })
        })
        
        console.log('Manual bounds calculation:')
        console.log(`Lat: ${minLat} to ${maxLat}`)
        console.log(`Lng: ${minLng} to ${maxLng}`)
        console.log(`Center: [${(minLat + maxLat) / 2}, ${(minLng + maxLng) / 2}]`)
        
      } catch (error) {
        console.error('Error loading test data:', error)
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  const parcelStyle = {
    fillColor: '#ffeb3b',
    weight: 2,
    opacity: 1,
    color: '#fbc02d',
    fillOpacity: 0.7
  }

  if (loading) {
    return <div className="p-8">Loading test data...</div>
  }

  return (
    <div className="h-screen">
      <div className="h-16 bg-gray-100 flex items-center px-4">
        <h1 className="text-xl font-bold">Citrus Test Map - First 10 Parcels</h1>
        <div className="ml-4 text-sm text-gray-600">
          {parcelData?.features?.length || 0} test parcels
        </div>
      </div>
      
      <div className="h-[calc(100vh-4rem)]">
        <MapContainer
          ref={mapRef}
          center={[28.9005, -82.4808]} // Expected Citrus center
          zoom={11}
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
              <strong>Calculated Citrus Center</strong><br/>
              [28.853070, -82.501830]<br/>
              <em>From coordinate analysis</em>
            </Popup>
          </Marker>

          {/* Test parcels */}
          {parcelData && (
            <GeoJSON
              key="test-parcels"
              data={parcelData}
              style={parcelStyle}
              onEachFeature={(feature, layer) => {
                layer.bindPopup(
                  `<div>
                    <strong>Test Parcel</strong><br/>
                    ID: ${feature.properties.PARCEL_UID}<br/>
                    First coord: [${feature.geometry.coordinates[0][0][0].toFixed(6)}, ${feature.geometry.coordinates[0][0][1].toFixed(6)}]
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

export default TestCitrusMap
