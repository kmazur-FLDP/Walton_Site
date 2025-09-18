import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, DocumentChartBarIcon, ClockIcon } from '@heroicons/react/24/outline'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

const ParcelAnalysisPage = () => {
  const navigate = useNavigate()

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
              <h1 className="text-2xl font-bold text-gray-900">Parcel Analysis</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          {/* Coming Soon Icon */}
          <motion.div 
            variants={itemVariants}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center">
                <DocumentChartBarIcon className="w-16 h-16 text-primary-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </motion.div>

          {/* Main Message */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-5xl font-bold text-secondary-800 mb-6"
          >
            Detailed Parcel Analysis
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-xl text-secondary-600 max-w-2xl mx-auto mb-8"
          >
            This section will feature comprehensive analysis reports for selected parcels, 
            including environmental assessments, development potential, and detailed findings.
          </motion.p>

          {/* Coming Soon Badge */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-full shadow-lg mb-8"
          >
            <ClockIcon className="w-5 h-5 mr-2" />
            Coming Soon
          </motion.div>

          {/* Feature Preview */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto"
          >
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <DocumentChartBarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Detailed Reports</h3>
              <p className="text-gray-600 text-sm">
                Comprehensive analysis reports with environmental data, development constraints, and recommendations.
              </p>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Data</h3>
              <p className="text-gray-600 text-sm">
                Interactive charts, maps, and visualizations to explore parcel characteristics and development potential.
              </p>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export & Share</h3>
              <p className="text-gray-600 text-sm">
                Download professional analysis reports and share findings with stakeholders and decision makers.
              </p>
            </motion.div>
          </motion.div>

          {/* Call to Action */}
          <motion.div 
            variants={itemVariants}
            className="mt-12"
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary mr-4"
            >
              Explore Properties
            </button>
            <button
              onClick={() => navigate('/favorites')}
              className="btn-secondary"
            >
              View Favorites
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default ParcelAnalysisPage