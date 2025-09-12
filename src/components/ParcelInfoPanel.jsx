import { useState } from 'react'
import { 
  XMarkIcon, 
  StarIcon as StarOutline, 
  StarIcon as StarSolid,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

const ParcelInfoPanel = ({ 
  parcel, 
  isOpen, 
  onClose, 
  onToggleFavorite, 
  isFavorite = false,
  county = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    ownership: true,
    property: true,
    assessment: false
  })
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)

  if (!parcel || !isOpen) return null

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Helper function to get property value safely
  const getProp = (key, fallback = 'N/A') => {
    return parcel.properties?.[key] || fallback
  }

  // Format address based on county-specific fields
  const formatAddress = () => {
    if (county === 'Hernando') {
      return getProp('SITUS_ADDRESS', 'Unknown Address')
    } else if (county === 'Citrus') {
      return `${getProp('ADRNO', '')} ${getProp('ADRDIR', '')} ${getProp('ADRSTR', '')} ${getProp('ADRSUF', '')}`.trim() || 'Unknown Address'
    } else if (county === 'Manatee') {
      return getProp('SITUS_ADDRESS', 'Unknown Address')
    } else if (county === 'Pasco') {
      return getProp('SITE_ADDRE', 'Unknown Address')
    } else if (county === 'Polk') {
      return getProp('BAS_STRT', 'Unknown Address')
    }
    return 'Unknown Address'
  }

  // Get parcel ID based on county
  const getParcelId = () => {
    if (county === 'Hernando') return getProp('PARCEL_UID')
    if (county === 'Citrus') return getProp('PARCEL_UID')
    if (county === 'Manatee') return getProp('PARCEL_UID')
    if (county === 'Pasco') return getProp('PARCEL_UID')
    if (county === 'Polk') return getProp('PARCEL_UID')
    return getProp('PARCEL_UID')
  }

  // Get acres value based on county
  const getAcres = () => {
    if (county === 'Hernando') return formatAcres(getProp('ACRES'))
    if (county === 'Citrus') return formatAcres(getProp('Acres'))
    if (county === 'Manatee') return formatAcres(getProp('LAND_ACREAGE_CAMA'))
    if (county === 'Pasco') return formatAcres(getProp('Acres'))
    if (county === 'Polk') return formatAcres(getProp('Acres'))
    return formatAcres(getProp('Acres'))
  }

  // Get owner information based on county
  const getOwner = () => {
    if (county === 'Hernando') return getProp('OWNER_NAME')
    if (county === 'Citrus') return getProp('OWN1')
    if (county === 'Manatee') return getProp('PAR_OWNER_NAME1')
    if (county === 'Pasco') return getProp('OWNER_NAME')
    if (county === 'Polk') return getProp('OWN_NAME')
    return 'Unknown Owner'
  }

  // Get city information based on county
  const getCity = () => {
    if (county === 'Hernando') return getProp('SITUS_CITY')
    if (county === 'Citrus') return getProp('CITYNAME')
    if (county === 'Manatee') return getProp('SITUS_POSTAL_CITY')
    if (county === 'Pasco') return getProp('SITE_CITY')
    if (county === 'Polk') return getProp('PHY_CITY')
    return 'N/A'
  }

  // Get square footage based on county
  const getSquareFootage = () => {
    if (county === 'Hernando') return getProp('LAND_SQFT')
    if (county === 'Citrus') return getProp('SQFT')
    if (county === 'Manatee') return getProp('LAND_SQFT_CAMA')
    if (county === 'Pasco') return getProp('LAND_SQ_FT')
    if (county === 'Polk') return getProp('LND_SQFOOT')
    return getProp('SQFT')
  }

  // Get zoning information based on county
  const getZoning = () => {
    if (county === 'Hernando') return getProp('ZONING', 'N/A')
    if (county === 'Citrus') return getProp('CLASS', 'N/A')
    if (county === 'Manatee') return getProp('PAR_ZONING', 'N/A')
    if (county === 'Pasco') return getProp('LAND_USE_D', 'N/A')
    if (county === 'Polk') return getProp('PA_UC', 'N/A')
    return 'N/A'
  }

  // Get land use description based on county
  const getLandUse = () => {
    if (county === 'Hernando') return getProp('PCA2_LAND_TYPE', 'N/A')
    if (county === 'Citrus') return getProp('LUC', 'N/A')
    if (county === 'Manatee') return getProp('CER_MAN_LUC_DESC', 'N/A')
    if (county === 'Pasco') return getProp('LAND_USE_D', 'N/A')
    if (county === 'Polk') return getProp('DOR_UC', 'N/A')
    return 'N/A'
  }

  // Get year built based on county
  const getYearBuilt = () => {
    if (county === 'Hernando') return getProp('STRUCT1_ACT_YEAR')
    if (county === 'Citrus') return 'N/A'
    if (county === 'Manatee') return getProp('BLDG_R1_YRBUILT')
    if (county === 'Pasco') return getProp('ACTUAL_YEA')
    if (county === 'Polk') return getProp('ACT_YR_BLT')
    return 'N/A'
  }

  // Get legal description based on county
  const getLegalDescription = () => {
    if (county === 'Hernando') return getProp('LEGAL1', 'N/A')
    if (county === 'Citrus') return getProp('ALT_ID', 'N/A')
    if (county === 'Manatee') return getProp('PAR_LEGAL1', 'N/A')
    if (county === 'Pasco') return getProp('LEGAL_DESC', 'N/A')
    if (county === 'Polk') return getProp('S_LEGAL', 'N/A')
    return 'N/A'
  }

  // Get subdivision based on county
  const getSubdivision = () => {
    if (county === 'Hernando') return getProp('CER_SUBDIVISION', 'N/A')
    if (county === 'Citrus') return 'N/A'
    if (county === 'Manatee') return getProp('PAR_SUBDIVISION', 'N/A')
    if (county === 'Pasco') return 'N/A'
    if (county === 'Polk') return 'N/A'
    return 'N/A'
  }

  // Get mailing address based on county
  const getMailingAddress = () => {
    if (county === 'Hernando') return `${getProp('MAIL_ADDR1', '')} ${getProp('MAIL_CITY', '')} ${getProp('MAIL_STATE', '')}`.trim() || 'N/A'
    if (county === 'Citrus') return 'N/A'
    if (county === 'Manatee') return `${getProp('PAR_MAIL_ADDR1', '')} ${getProp('PAR_MAIL_CITY', '')} ${getProp('PAR_MAIL_STATE', '')}`.trim() || 'N/A'
    if (county === 'Pasco') return `${getProp('MAILING_AD', '')} ${getProp('MAILING_CI', '')} ${getProp('MAILING_ST', '')}`.trim() || 'N/A'
    if (county === 'Polk') return `${getProp('OWN_ADDR1', '')} ${getProp('OWN_CITY', '')} ${getProp('OWN_STATE', '')}`.trim() || 'N/A'
    return 'N/A'
  }

  // Handle favorite toggle with protection against rapid clicking
  const handleFavoriteToggle = async () => {
    if (isTogglingFavorite || !onToggleFavorite) return
    
    setIsTogglingFavorite(true)
    try {
      await onToggleFavorite(getParcelId())
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: DocumentTextIcon }
  ]

  const formatAcres = (acres) => {
    if (!acres || acres === 'N/A') return 'N/A'
    const numAcres = parseFloat(acres)
    if (isNaN(numAcres)) return 'N/A'
    return `${numAcres.toFixed(2)} acres`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-24 h-[calc(100vh-6rem)] w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Parcel Information</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleFavoriteToggle}
                disabled={isTogglingFavorite}
                className={`p-2 hover:bg-white/20 rounded-lg transition-colors ${
                  isTogglingFavorite ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? (
                  <StarSolid className="w-5 h-5 text-yellow-300" />
                ) : (
                  <StarOutline className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="text-sm opacity-90">
            {county} County • ID: {getParcelId()}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4 mx-auto mb-1" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              {/* Address Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPinIcon className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Address</h3>
                </div>
                <p className="text-gray-700">{formatAddress()}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {getCity()}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {getAcres()}
                  </div>
                  <div className="text-xs text-blue-600 uppercase tracking-wide">Acres</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {getZoning()}
                  </div>
                  <div className="text-xs text-green-600 uppercase tracking-wide">Zoning/Class</div>
                </div>
              </div>

              {/* Expandable Sections */}
              
              {/* Location Details */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('location')}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">Location Details</span>
                  {expandedSections.location ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.location && (
                  <div className="px-3 pb-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Square Feet:</span>
                      <span className="font-medium">{getSquareFootage()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Legal Description:</span>
                      <span className="font-medium text-right max-w-48 break-words">
                        {getLegalDescription()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subdivision:</span>
                      <span className="font-medium">{getSubdivision()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ownership */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('ownership')}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">Ownership</span>
                  {expandedSections.ownership ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.ownership && (
                  <div className="px-3 pb-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium text-right max-w-48 break-words">{getOwner()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mailing Address:</span>
                      <span className="font-medium text-right max-w-48 break-words">
                        {getMailingAddress()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('property')}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">Property Details</span>
                  {expandedSections.property ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.property && (
                  <div className="px-3 pb-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zoning:</span>
                      <span className="font-medium">{getZoning()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Land Use:</span>
                      <span className="font-medium">{getLandUse()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Year Built:</span>
                      <span className="font-medium">{getYearBuilt()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex space-x-3">
            <button className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
              Generate Report
            </button>
            <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
              Export Data
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ParcelInfoPanel
