import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapIcon, StarIcon, ChartBarIcon, EnvelopeIcon, EyeIcon, ClockIcon, HeartIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import dataService from '../services/dataService'
import favoritesService from '../services/favoritesService'
import termsService from '../services/termsService'
import { useAuth } from '../context/AuthContext'
import TermsModal from '../components/TermsModal'
import { ProgressSkeleton, CardSkeleton, ActivitySkeleton } from '../components/SkeletonLoader'
import { NoActivityState } from '../components/EmptyState'

const LandingPage = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  
  // Terms and Conditions state
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [termsLoading, setTermsLoading] = useState(false)
  const [checkingTerms, setCheckingTerms] = useState(true)
  
  const [counties] = useState([
    // Counties ordered by priority for Walton Global
    // Parcel counts reflect actual GeoJSON data where available
    { name: 'Pasco County', parcels: 133, available: true, path: '/pasco' }, // Updated count from GeoJSON
    { name: 'Polk County', parcels: 114, available: true, path: '/polk' }, // Actual count from GeoJSON  
    { name: 'Hernando County', parcels: 37, available: true, path: '/hernando' }, // Actual count from GeoJSON
    { name: 'Citrus County', parcels: 214, available: true, path: '/citrus' }, // Actual count from GeoJSON
    { name: 'Manatee County', parcels: 12, available: true, path: '/manatee' }, // Actual count from GeoJSON
  ])

  // Recent Activity State
  const [recentActivity, setRecentActivity] = useState({
    recentFavorites: [],
    countyVisits: [],
    sessionStats: {
      countiesVisited: 0,
      favoritesAdded: 0,
      startTime: new Date()
    },
    loading: true
  })

  // Check if user has accepted terms
  useEffect(() => {
    const checkTermsAcceptance = async () => {
      if (!user) {
        setCheckingTerms(false)
        return
      }

      try {
        const hasAccepted = await termsService.hasAcceptedTerms()
        setHasAcceptedTerms(hasAccepted)
        
        if (!hasAccepted) {
          setShowTermsModal(true)
        }
      } catch (error) {
        console.error('Error checking terms acceptance:', error)
        // If there's an error, show the terms modal to be safe
        setShowTermsModal(true)
      } finally {
        setCheckingTerms(false)
      }
    }

    checkTermsAcceptance()
  }, [user])

  // Handle terms acceptance
  const handleAcceptTerms = async () => {
    setTermsLoading(true)
    
    try {
      const result = await termsService.acceptTerms()
      
      if (result.success) {
        setHasAcceptedTerms(true)
        setShowTermsModal(false)
        console.log('Terms accepted successfully')
      } else {
        console.error('Failed to record terms acceptance:', result.error)
        alert('There was an error recording your acceptance. Please try again.')
      }
    } catch (error) {
      console.error('Error accepting terms:', error)
      alert('There was an error recording your acceptance. Please try again.')
    } finally {
      setTermsLoading(false)
    }
  }

  // Handle terms decline
  const handleDeclineTerms = () => {
    if (window.confirm('You must accept the terms and conditions to use this portal. If you decline, you will be logged out.')) {
      // Sign out the user since they declined terms
      signOut()
    }
  }

  // Load recent activity data
  useEffect(() => {
    const loadRecentActivity = async () => {
      if (!user) {
        setRecentActivity(prev => ({ ...prev, loading: false }))
        return
      }

      try {
        // Load recent favorites
        const favorites = await favoritesService.getUserFavorites()
        const recentFavorites = favorites.slice(0, 5) // Show last 5 favorites

        // Load county visits from localStorage
        const countyVisits = JSON.parse(localStorage.getItem('walton_county_visits') || '[]')

        // Load session stats from localStorage
        const sessionStart = localStorage.getItem('walton_session_start')
        const sessionStats = {
          countiesVisited: new Set(countyVisits.map(v => v.county)).size,
          favoritesAdded: favorites.filter(f => {
            const createdDate = new Date(f.created_at)
            const today = new Date()
            return createdDate.toDateString() === today.toDateString()
          }).length,
          startTime: sessionStart ? new Date(sessionStart) : new Date()
        }

        // Set session start time if not exists
        if (!sessionStart) {
          localStorage.setItem('walton_session_start', new Date().toISOString())
        }

        setRecentActivity({
          recentFavorites,
          countyVisits: countyVisits.slice(0, 5), // Show last 5 visits
          sessionStats,
          loading: false
        })
      } catch (error) {
        console.error('Error loading recent activity:', error)
        setRecentActivity(prev => ({ ...prev, loading: false }))
      }
    }

    loadRecentActivity()
  }, [user])

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now - time) / 60000)
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  // Stats calculated from actual GeoJSON data with progressive loading
  const [stats, setStats] = useState({
    totalParcels: 0,
    totalAcres: 0,
    avgAcreage: 0,
    loading: true,
    countiesLoaded: 0,
    totalCounties: 5,
    loadingCounty: ''
  })

  // Cache for county data to avoid reloading
  // eslint-disable-next-line no-unused-vars
  const countyCache = useRef(new Map())

  // Progress tracking for data loading
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 6, // 5 counties + 1 development areas
    message: 'Initializing...',
    counties: {
      hernando: false,
      citrus: false,
      manatee: false,
      pasco: false,
      polk: false,
      polkDev: false
    }
  })

  // Calculate stats from available county data on component mount
  useEffect(() => {
    const calculateStats = async () => {
      try {
        let totalAcres = 0
        let totalParcels = 0

        const updateProgress = (county, message) => {
          setLoadingProgress(prev => ({
            ...prev,
            current: prev.current + 1,
            message,
            counties: { ...prev.counties, [county]: true }
          }))
        }

        // Load Hernando data
        setLoadingProgress(prev => ({ ...prev, message: 'Loading Hernando County data...' }))
        const hernandoData = await dataService.loadHernandoParcels()
        if (hernandoData) {
          hernandoData.features.forEach(feature => {
            const acres = parseFloat(feature.properties.ACRES)
            if (!isNaN(acres) && acres > 0) {
              totalAcres += acres
              totalParcels++
            }
          })
        }
        updateProgress('hernando', 'Hernando County loaded')

        // Load Citrus data
        setLoadingProgress(prev => ({ ...prev, message: 'Loading Citrus County data...' }))
        const citrusData = await dataService.loadCitrusParcels()
        if (citrusData) {
          citrusData.features.forEach(feature => {
            const acres = parseFloat(feature.properties.Acres)
            if (!isNaN(acres) && acres > 0) {
              totalAcres += acres
              totalParcels++
            }
          })
        }
        updateProgress('citrus', 'Citrus County loaded')

        // Load Manatee data
        setLoadingProgress(prev => ({ ...prev, message: 'Loading Manatee County data...' }))
        const manateeData = await dataService.loadManateeParcels()
        if (manateeData) {
          manateeData.features.forEach(feature => {
            const acres = parseFloat(feature.properties.LAND_ACREAGE_CAMA)
            if (!isNaN(acres) && acres > 0) {
              totalAcres += acres
              totalParcels++
            }
          })
        }
        updateProgress('manatee', 'Manatee County loaded')

        // Load Pasco data
        setLoadingProgress(prev => ({ ...prev, message: 'Loading Pasco County data...' }))
        const pascoData = await dataService.loadPascoParcels()
        if (pascoData) {
          pascoData.features.forEach(feature => {
            const acres = parseFloat(feature.properties.Acres || feature.properties.ACRES)
            if (!isNaN(acres) && acres > 0) {
              totalAcres += acres
              totalParcels++
            }
          })
        }
        updateProgress('pasco', 'Pasco County loaded')

        // Load Polk data
        setLoadingProgress(prev => ({ ...prev, message: 'Loading Polk County data...' }))
        const polkData = await dataService.loadPolkParcels()
        if (polkData) {
          polkData.features.forEach(feature => {
            const acres = parseFloat(feature.properties.Acres || feature.properties.ACRES)
            if (!isNaN(acres) && acres > 0) {
              totalAcres += acres
              totalParcels++
            }
          })
        }
        updateProgress('polk', 'Polk County loaded')

        // Load Polk Development Areas data
        setLoadingProgress(prev => ({ ...prev, message: 'Loading development areas...' }))
        await dataService.loadPolkDevelopmentAreas()
        // Note: Development areas are loaded for other features but NOT included in parcel statistics
        // since they represent zoning areas, not individual parcels
        updateProgress('polkDev', 'All data loaded successfully')

        const avgAcreage = totalParcels > 0 ? totalAcres / totalParcels : 0

        setStats({
          totalParcels,
          totalAcres,
          avgAcreage,
          loading: false
        })

        // Final progress update
        setLoadingProgress(prev => ({ 
          ...prev, 
          message: 'Ready to explore!',
          current: prev.total 
        }))
      } catch (error) {
        console.error('Error calculating stats:', error)
        setStats(prev => ({ ...prev, loading: false }))
        setLoadingProgress(prev => ({ 
          ...prev, 
          message: 'Error loading data',
          current: prev.total 
        }))
      }
    }

    calculateStats()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50">
      {/* Terms and Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
        loading={termsLoading}
      />
      
      {/* Content Blocking Overlay - Show if user hasn't accepted terms */}
      {(checkingTerms || !hasAcceptedTerms) && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            {checkingTerms ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Checking terms acceptance...</p>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Terms Required</h3>
                <p className="text-gray-600 mb-4">
                  You must accept the terms and conditions to access the portal.
                </p>
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-semibold"
                >
                  Review Terms
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-5xl font-bold text-secondary-800 mb-4"
          >
            Walton Global FLD&P GIS Portal
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="text-xl text-secondary-600 max-w-3xl mx-auto"
          >
            Parcels in the Counties below have been prefiltered for minimal amounts of Wetlands and Floodplain. 
            Please review and select parcels of interest to you for further analysis.
          </motion.p>
        </motion.div>

        {/* Progress Indicator - Show while loading */}
        {stats.loading && (
          <motion.div 
            variants={containerVariants}
            className="mb-12"
          >
            <div className="card">
              <motion.div variants={itemVariants} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Loading County Data</h3>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  ></div>
                </div>
                
                {/* Progress Text */}
                <p className="text-sm text-gray-600 mb-4">{loadingProgress.message}</p>
                
                {/* County Status Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(loadingProgress.counties).map(([county, loaded]) => (
                    <div key={county} className="flex items-center justify-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${loaded ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={loaded ? 'text-green-600' : 'text-gray-500'}>
                        {county === 'polkDev' ? 'Dev Areas' : county.charAt(0).toUpperCase() + county.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Stats Section */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          <motion.div variants={itemVariants} className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MapIcon className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Counties Covered</h3>
            <p className="text-3xl font-bold text-primary-600">{counties.length}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-800 mb-2">Total Parcels</h3>
            <p className="text-3xl font-bold text-primary-600">
              {counties.reduce((sum, county) => sum + county.parcels, 0).toLocaleString()}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="card text-center">
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Square3Stack3DIcon className="w-6 h-6 text-accent-600" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-800 mb-2">Total Acreage</h3>
            <p className="text-3xl font-bold text-accent-600">
              {stats.loading ? '...' : `${stats.totalAcres.toLocaleString(undefined, {maximumFractionDigits: 0})}`}
            </p>
            <p className="text-sm text-secondary-500 mt-1">From live data</p>
          </motion.div>

          <motion.div variants={itemVariants} className="card text-center">
            <div className="w-12 h-12 bg-earth-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="text-earth-600 text-xl font-bold">📏</div>
            </div>
            <h3 className="text-lg font-semibold text-secondary-800 mb-2">Avg Parcel Size</h3>
            <p className="text-3xl font-bold text-earth-600">
              {stats.loading ? '...' : `${stats.avgAcreage.toFixed(1)}`}
            </p>
            <p className="text-sm text-secondary-500 mt-1">Acres per parcel</p>
          </motion.div>
        </motion.div>

        {/* Counties Grid */}
        <motion.div variants={containerVariants} className="mb-12">
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-secondary-800 mb-8 text-center"
          >
            Select a County to Explore
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {counties.map((county) => (
              <motion.div
                key={county.name}
                variants={itemVariants}
                whileHover={county.available ? { scale: 1.02 } : {}}
                whileTap={county.available ? { scale: 0.98 } : {}}
                className={`card transition-all duration-200 group ${
                  county.available 
                    ? 'cursor-pointer hover:shadow-lg' 
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => county.available && navigate(county.path)}
              >
                {/* County Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      county.available 
                        ? 'bg-primary-100 group-hover:bg-primary-200' 
                        : 'bg-gray-100'
                    } transition-colors`}>
                      <MapIcon className={`w-6 h-6 ${
                        county.available 
                          ? 'text-primary-600 group-hover:text-primary-700' 
                          : 'text-gray-400'
                      } transition-colors`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold transition-colors ${
                        county.available 
                          ? 'text-gray-900 group-hover:text-primary-600' 
                          : 'text-gray-400'
                      }`}>
                        {county.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {county.available ? 'Interactive Map Available' : 'Coming Soon'}
                      </p>
                    </div>
                  </div>
                  
                  {!county.available && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
                
                {/* County Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Square3Stack3DIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Parcels</span>
                    </div>
                    <div className={`text-2xl font-bold ${county.available ? 'text-gray-900' : 'text-gray-500'}`}>
                      {county.parcels.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <ChartBarIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Status</span>
                    </div>
                    <div className={`text-sm font-semibold ${county.available ? 'text-green-600' : 'text-gray-500'}`}>
                      {county.available ? 'Active' : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                    county.available 
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!county.available}
                >
                  {county.available ? 'Explore County Data' : 'Available Soon'}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={containerVariants} className="card mb-12">
          <motion.h2 
            variants={itemVariants}
            className="text-xl font-semibold text-gray-900 mb-6"
          >
            Recent Activity
          </motion.h2>
          
          {!user ? (
            <motion.div variants={itemVariants} className="text-center py-8 text-secondary-500">
              <StarIcon className="w-12 h-12 mx-auto mb-4 text-secondary-300" />
              <p className="text-lg font-medium mb-2">Sign in to track your activity</p>
              <p className="text-sm">Your favorites, county visits, and session stats will appear here</p>
              <button 
                onClick={() => navigate('/login')}
                className="mt-4 btn-primary"
              >
                Sign In
              </button>
            </motion.div>
          ) : recentActivity.loading ? (
            <motion.div variants={itemVariants} className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-secondary-500">Loading your recent activity...</p>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-6">
              {/* Session Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary-50 rounded-lg p-4 text-center">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MapIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="text-2xl font-bold text-primary-600">{recentActivity.sessionStats.countiesVisited}</div>
                  <div className="text-sm text-primary-700">Counties Explored</div>
                </div>
                
                <div className="bg-accent-50 rounded-lg p-4 text-center">
                  <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <HeartIcon className="w-4 h-4 text-accent-600" />
                  </div>
                  <div className="text-2xl font-bold text-accent-600">{recentActivity.sessionStats.favoritesAdded}</div>
                  <div className="text-sm text-accent-700">Favorites Today</div>
                </div>
                
                <div className="bg-earth-50 rounded-lg p-4 text-center">
                  <div className="w-8 h-8 bg-earth-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ClockIcon className="w-4 h-4 text-earth-600" />
                  </div>
                  <div className="text-2xl font-bold text-earth-600">
                    {Math.floor((new Date() - recentActivity.sessionStats.startTime) / 60000)}
                  </div>
                  <div className="text-sm text-earth-700">Minutes Active</div>
                </div>
              </div>

              {/* Recent Favorites and County Visits */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Favorites */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <StarIcon className="w-5 h-5 text-yellow-500 mr-2" />
                    Recent Favorites
                  </h3>
                  {recentActivity.recentFavorites.length === 0 ? (
                    <div className="text-center py-6 text-secondary-500 bg-gray-50 rounded-lg">
                      <HeartIcon className="w-8 h-8 mx-auto mb-2 text-secondary-300" />
                      <p className="text-sm">No favorites yet</p>
                      <p className="text-xs mt-1">Start exploring to save your favorite parcels</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.recentFavorites.map((favorite) => (
                        <div key={favorite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <div className="font-medium text-secondary-800">
                              Parcel #{favorite.parcel_id}
                            </div>
                            <div className="text-sm text-secondary-600 flex items-center">
                              <MapIcon className="w-3 h-3 mr-1" />
                              {favorite.county}
                              <span className="mx-2">•</span>
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {formatTimeAgo(favorite.created_at)}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const county = counties.find(c => c.name === favorite.county)
                              if (county) navigate(county.path)
                            }}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      ))}
                      {recentActivity.recentFavorites.length > 0 && (
                        <button 
                          onClick={() => navigate('/favorites')}
                          className="w-full text-center py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View All Favorites →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Recent County Visits */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <EyeIcon className="w-5 h-5 text-blue-500 mr-2" />
                    Recent Visits
                  </h3>
                  {recentActivity.countyVisits.length === 0 ? (
                    <div className="text-center py-6 text-secondary-500 bg-gray-50 rounded-lg">
                      <EyeIcon className="w-8 h-8 mx-auto mb-2 text-secondary-300" />
                      <p className="text-sm">No recent visits</p>
                      <p className="text-xs mt-1">County visits will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.countyVisits.map((visit) => (
                        <div key={visit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <div className="font-medium text-secondary-800">
                              {visit.county}
                            </div>
                            <div className="text-sm text-secondary-600 flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {formatTimeAgo(visit.timestamp)}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const county = counties.find(c => c.name === visit.county)
                              if (county) navigate(county.path)
                            }}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            Revisit
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button 
                    onClick={() => navigate('/favorites')}
                    className="flex items-center p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                  >
                    <StarIcon className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-700">My Favorites</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      const mostVisited = recentActivity.countyVisits[0]
                      if (mostVisited) {
                        const county = counties.find(c => c.name === mostVisited.county)
                        if (county) navigate(county.path)
                      }
                    }}
                    disabled={recentActivity.countyVisits.length === 0}
                    className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <EyeIcon className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-700">Last Visited</span>
                  </button>
                  
                  <button 
                    onClick={() => navigate('/citrus')} // Go to largest county
                    className="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <ChartBarIcon className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-700">Most Parcels</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      // Clear recent activity
                      localStorage.removeItem('walton_county_visits')
                      localStorage.removeItem('walton_session_start')
                      setRecentActivity(prev => ({
                        ...prev,
                        countyVisits: [],
                        sessionStats: {
                          countiesVisited: 0,
                          favoritesAdded: 0,
                          startTime: new Date()
                        }
                      }))
                      localStorage.setItem('walton_session_start', new Date().toISOString())
                    }}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ClockIcon className="w-5 h-5 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Reset Session</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Contact Section */}
        <motion.div variants={containerVariants} className="card">
          <motion.h2 
            variants={itemVariants}
            className="text-xl font-semibold text-secondary-800 mb-6"
          >
            Need Help?
          </motion.h2>
          <motion.div variants={itemVariants} className="text-center py-8">
            <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <EnvelopeIcon className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-800 mb-2">Contact Support</h3>
            <p className="text-secondary-600 mb-6 max-w-md mx-auto">
              Have questions about the data, need assistance with the portal, or want to submit a help request? 
              We're here to help!
            </p>
            <a 
              href="mailto:kmmazur@fldandp.com?subject=Walton Global GIS Portal - Help Request"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <EnvelopeIcon className="w-5 h-5 mr-2" />
              Send Help Request
            </a>
            <p className="text-sm text-secondary-500 mt-3">
              Email: <span className="font-medium">kmmazur@fldandp.com</span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default LandingPage
