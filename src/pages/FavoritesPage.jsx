import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import favoritesService from '../services/favoritesService'
import { CardSkeleton } from '../components/SkeletonLoader'
import { NoFavoritesState, DataErrorState } from '../components/EmptyState'

const FavoritesPage = () => {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true)
        const userFavorites = await favoritesService.getUserFavorites()
        setFavorites(userFavorites)
      } catch (err) {
        console.error('Error loading favorites:', err)
        setError('Failed to load favorites')
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [])

  const handleRemoveFavorite = async (parcelId, county) => {
    try {
      await favoritesService.removeFavorite(parcelId, county)
      setFavorites(prev => prev.filter(fav => !(fav.parcel_id === parcelId && fav.county === county)))
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  const handleViewOnMap = (county, parcelId = null) => {
    const path = `/${county.toLowerCase()}`
    if (parcelId) {
      navigate(`${path}?parcel=${encodeURIComponent(parcelId)}`)
    } else {
      navigate(path)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <CardSkeleton key={i} height="200px" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
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
              </div>
            </div>
          </div>
        </div>
        
        {/* Error State */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DataErrorState
            title="Error Loading Favorites"
            description={error}
            onRetry={() => window.location.reload()}
          />
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
              <h1 className="text-2xl font-bold text-gray-900">My Favorite Parcels</h1>
              <span className="bg-amber-100 text-amber-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {favorites.length} favorites
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favorites.length === 0 ? (
          <NoFavoritesState onExplore={() => navigate('/dashboard')} />
        ) : (
          <div className="space-y-6">
            {/* Group favorites by county */}
            {Object.entries(
              favorites.reduce((acc, fav) => {
                if (!acc[fav.county]) acc[fav.county] = []
                acc[fav.county].push(fav)
                return acc
              }, {})
            ).map(([county, countyFavorites]) => (
              <motion.div
                key={county}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="bg-primary-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">{county} County</h2>
                    <button
                      onClick={() => handleViewOnMap(county)}
                      className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <MapIcon className="w-4 h-4 mr-1" />
                      View on Map
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {countyFavorites.map((favorite) => (
                    <div key={favorite.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {favorite.parcel_address || 'Address not available'}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div><span className="font-medium">Parcel ID:</span> {favorite.parcel_id}</div>
                            <div><span className="font-medium">County:</span> {favorite.county}</div>
                            <div><span className="font-medium">Added:</span> {new Date(favorite.created_at).toLocaleDateString()}</div>
                            {favorite.notes && (
                              <div><span className="font-medium">Notes:</span> {favorite.notes}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleViewOnMap(county, favorite.parcel_id)}
                            className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleRemoveFavorite(favorite.parcel_id, favorite.county)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FavoritesPage
