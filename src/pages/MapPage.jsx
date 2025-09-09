import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet'
import { StarIcon as StarOutline, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import dataService from '../services/dataService'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const MapPage = () => {
  const { county } = useParams()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState(new Set())
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [countyBoundary, setCountyBoundary] = useState(null)
  const [parcelData, setParcelData] = useState(null)
  const [error, setError] = useState(null)
  
  // Sample parcel data - will be replaced by GeoJSON data
  const [parcels] = useState([
    {
      id: 'parcel-001',
      address: '123 Main Street',
      owner: 'John Smith',
      acreage: 2.5,
      value: 450000,
      lat: 30.3964,
      lng: -86.4628,
      zoning: 'Residential'
    },
    {
      id: 'parcel-002', 
      address: '456 Oak Avenue',
      owner: 'Jane Doe',
      acreage: 1.8,
      value: 320000,
      lat: 30.4064,
      lng: -86.4728,
      zoning: 'Commercial'
    },
    {
      id: 'parcel-003',
      address: '789 Pine Road',
      owner: 'Bob Johnson',
      acreage: 5.2,
      value: 780000,
      lat: 30.3864,
      lng: -86.4528,
      zoning: 'Agricultural'
    }
  ])

  const countyName = county.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' County'

  // Load GeoJSON data when component mounts
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load county boundary
        const boundary = await dataService.loadCountyBoundary(county)
        if (boundary) {
          setCountyBoundary(boundary)
        }

        // Load parcel data
        const parcels = await dataService.loadCountyParcels(county)
        if (parcels) {
          setParcelData(parcels)
        }

      } catch (err) {
        console.error('Error loading map data:', err)
        setError('Failed to load map data. Using sample data.')
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [county])

  const toggleFavorite = (parcelId) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(parcelId)) {
      newFavorites.delete(parcelId)
    } else {
      newFavorites.add(parcelId)
    }
    setFavorites(newFavorites)
    // TODO: Save to Supabase
  }

  // Style for county boundary
  const countyStyle = {
    fillColor: '#3b82f6',
    weight: 2,
    opacity: 1,
    color: '#1d4ed8',
    dashArray: '3',
    fillOpacity: 0.1
  }

  // Style for parcels
  const parcelStyle = (feature) => ({
    fillColor: '#22c55e',
    weight: 1,
    opacity: 1,
    color: '#16a34a',
    fillOpacity: 0.3
  })

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="glass border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{countyName}</h1>
              <p className="text-sm text-gray-600">{parcels.length} parcels available</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {favorites.size} favorited
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Parcels</h2>
            <div className="space-y-3">
              {parcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className={`card cursor-pointer transition-all duration-200 ${
                    selectedParcel?.id === parcel.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedParcel(parcel)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{parcel.address}</h3>
                      <p className="text-xs text-gray-600 mt-1">Owner: {parcel.owner}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Acreage:</span>
                          <span className="ml-1 font-medium">{parcel.acreage}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Value:</span>
                          <span className="ml-1 font-medium">${parcel.value.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {parcel.zoning}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(parcel.id)
                      }}
                      className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {favorites.has(parcel.id) ? (
                        <StarSolid className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <StarOutline className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading map data...</p>
              </div>
            </div>
          )}
          
          <MapContainer
            center={[30.3964, -86.4628]} // Walton County coordinates
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* County Boundary Layer */}
            {countyBoundary && (
              <GeoJSON
                data={countyBoundary}
                style={countyStyle}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`
                    <div>
                      <h3 class="font-semibold">${feature.properties.NAME || countyName}</h3>
                      <p class="text-sm text-gray-600">County Boundary</p>
                    </div>
                  `)
                }}
              />
            )}

            {/* Parcel Data Layer */}
            {parcelData && (
              <GeoJSON
                data={parcelData}
                style={parcelStyle}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties
                  layer.bindPopup(`
                    <div class="p-2">
                      <h3 class="font-semibold text-sm">${props.ADDRESS || 'Unknown Address'}</h3>
                      <p class="text-xs text-gray-600 mt-1">Owner: ${props.OWNER || 'Unknown'}</p>
                      <div class="mt-2 space-y-1 text-xs">
                        <div>Parcel ID: ${props.PARCEL_ID || 'N/A'}</div>
                        <div>Acreage: ${props.ACREAGE || 'N/A'}</div>
                        <div>Value: $${props.VALUE ? props.VALUE.toLocaleString() : 'N/A'}</div>
                        <div>Zoning: ${props.ZONING || 'N/A'}</div>
                      </div>
                      <button
                        onclick="window.toggleParcelFavorite('${props.PARCEL_ID}')"
                        class="mt-2 text-xs text-primary-600 hover:text-primary-700"
                      >
                        ${favorites.has(props.PARCEL_ID) ? 'Remove from favorites' : 'Add to favorites'}
                      </button>
                    </div>
                  `)
                  
                  layer.on('click', () => {
                    setSelectedParcel({
                      id: props.PARCEL_ID,
                      address: props.ADDRESS,
                      owner: props.OWNER,
                      acreage: props.ACREAGE,
                      value: props.VALUE,
                      zoning: props.ZONING
                    })
                  })
                }}
              />
            )}

            {/* Sample Marker Data (fallback) */}
            {(!parcelData || error) && parcels.map((parcel) => (
              <Marker
                key={parcel.id}
                position={[parcel.lat, parcel.lng]}
                eventHandlers={{
                  click: () => setSelectedParcel(parcel),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm">{parcel.address}</h3>
                    <p className="text-xs text-gray-600 mt-1">Owner: {parcel.owner}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <div>Acreage: {parcel.acreage}</div>
                      <div>Value: ${parcel.value.toLocaleString()}</div>
                      <div>Zoning: {parcel.zoning}</div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(parcel.id)}
                      className="mt-2 flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      {favorites.has(parcel.id) ? (
                        <>
                          <StarSolid className="w-4 h-4" />
                          <span>Remove from favorites</span>
                        </>
                      ) : (
                        <>
                          <StarOutline className="w-4 h-4" />
                          <span>Add to favorites</span>
                        </>
                      )}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Error message */}
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg z-10">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Selected Parcel Details Panel */}
          {selectedParcel && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80 glass rounded-lg p-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedParcel.address}</h3>
                  <p className="text-sm text-gray-600 mt-1">Owner: {selectedParcel.owner}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Acreage:</span>
                      <span className="ml-1 font-medium">{selectedParcel.acreage}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Value:</span>
                      <span className="ml-1 font-medium">${selectedParcel.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
                      {selectedParcel.zoning}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex flex-col space-y-2">
                  <button
                    onClick={() => toggleFavorite(selectedParcel.id)}
                    className="p-2 hover:bg-white/50 rounded transition-colors"
                  >
                    {favorites.has(selectedParcel.id) ? (
                      <StarSolid className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <StarOutline className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedParcel(null)}
                    className="p-2 hover:bg-white/50 rounded transition-colors text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapPage
