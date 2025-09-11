import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapIcon, StarIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import dataService from '../services/dataService'
import adminService from '../services/adminService'

const LandingPage = () => {
  const navigate = useNavigate()
  const [counties] = useState([
    // Counties ordered by priority for Walton Global
    // Parcel counts reflect actual GeoJSON data where available
    { name: 'Pasco County', parcels: 217, available: true, path: '/pasco' }, // Actual count from GeoJSON
    { name: 'Polk County', parcels: 114, available: true, path: '/polk' }, // Actual count from GeoJSON  
    { name: 'Hernando County', parcels: 37, available: true, path: '/hernando' }, // Actual count from GeoJSON
    { name: 'Citrus County', parcels: 214, available: true, path: '/citrus' }, // Actual count from GeoJSON
    { name: 'Manatee County', parcels: 12, available: true, path: '/manatee' }, // Actual count from GeoJSON
  ])

  // Stats calculated from actual GeoJSON data
  const [stats, setStats] = useState({
    totalParcels: 0,
    totalAcres: 0,
    avgAcreage: 0,
    loading: true
  })

  // Admin checking
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = await adminService.isAdmin()
      setIsAdmin(adminStatus)
      console.log('LandingPage: Admin status:', adminStatus)
    }
    checkAdminStatus()
  }, [])

  // Calculate stats from available county data on component mount
  useEffect(() => {
    const calculateStats = async () => {
      try {
        let totalAcres = 0
        let totalParcels = 0

        // Load Hernando data
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

        // Load Citrus data
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

        // Load Manatee data
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

        // Load Pasco data
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

        // Load Polk data
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

        // Load Polk Development Areas data
        const polkDevData = await dataService.loadPolkDevelopmentAreas()
        if (polkDevData) {
          polkDevData.features.forEach(feature => {
            const acres = parseFloat(feature.properties.Acres)
            if (!isNaN(acres) && acres > 0) {
              totalAcres += acres
              // Note: We don't increment totalParcels for dev areas since they're different entities
            }
          })
        }

        const avgAcreage = totalParcels > 0 ? totalAcres / totalParcels : 0

        setStats({
          totalParcels,
          totalAcres,
          avgAcreage,
          loading: false
        })
      } catch (error) {
        console.error('Error calculating stats:', error)
        setStats(prev => ({ ...prev, loading: false }))
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4"
          >
            Walton Global GIS Portal
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Parcels in the Counties below have been prefiltered for Wetlands and Floodplain. 
            Please review and select parcels of interest to you for further analysis.
          </motion.p>
        </motion.div>

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
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Parcels</h3>
            <p className="text-3xl font-bold text-green-600">
              {counties.reduce((sum, county) => sum + county.parcels, 0).toLocaleString()}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="card text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="text-amber-600 text-xl font-bold">🏞️</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Acreage</h3>
            <p className="text-3xl font-bold text-amber-600">
              {stats.loading ? '...' : `${stats.totalAcres.toLocaleString(undefined, {maximumFractionDigits: 0})}`}
            </p>
            <p className="text-sm text-gray-500 mt-1">From live data</p>
          </motion.div>

          <motion.div variants={itemVariants} className="card text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="text-purple-600 text-xl font-bold">📏</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Parcel Size</h3>
            <p className="text-3xl font-bold text-purple-600">
              {stats.loading ? '...' : `${stats.avgAcreage.toFixed(1)}`}
            </p>
            <p className="text-sm text-gray-500 mt-1">Acres per parcel</p>
          </motion.div>
        </motion.div>

        {/* Counties Grid */}
        <motion.div variants={containerVariants} className="mb-12">
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-gray-900 mb-8 text-center"
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold transition-colors ${
                    county.available 
                      ? 'text-gray-900 group-hover:text-primary-600' 
                      : 'text-gray-500'
                  }`}>
                    {county.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {!county.available && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                    <MapIcon className={`w-6 h-6 transition-colors ${
                      county.available 
                        ? 'text-gray-400 group-hover:text-primary-600' 
                        : 'text-gray-300'
                    }`} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available Parcels:</span>
                    <span className={`font-medium ${county.available ? 'text-gray-900' : 'text-gray-500'}`}>
                      {county.parcels.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button 
                    className={`w-full transition-shadow ${
                      county.available 
                        ? 'btn-primary group-hover:shadow-md' 
                        : 'bg-gray-200 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed'
                    }`}
                    disabled={!county.available}
                  >
                    {county.available ? 'View Map Data' : 'Coming Soon'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={containerVariants} className="card">
          <motion.h2 
            variants={itemVariants}
            className="text-xl font-semibold text-gray-900 mb-6"
          >
            Recent Activity
          </motion.h2>
          <motion.div variants={itemVariants} className="text-center py-12 text-gray-500">
            <StarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity to display</p>
            <p className="text-sm mt-2">Start exploring county maps to see your activity here</p>
            
            {/* Temporary Admin Access - Remove once navbar is working */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate('/admin')}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  🛠️ Admin Dashboard (Temporary Link)
                </button>
                <p className="text-xs text-red-600 mt-1">Admin access detected</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default LandingPage
