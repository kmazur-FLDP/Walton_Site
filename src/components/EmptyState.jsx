// Professional empty state components for better UX
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

// Base empty state component
const EmptyStateBase = ({ icon, title, description, action, className = "" }) => {
  return (
    <motion.div 
      className={`text-center py-12 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && action}
    </motion.div>
  )
}

// No favorites empty state
export const NoFavoritesState = ({ onExplore }) => (
  <EmptyStateBase
    icon={<div className="text-4xl">⭐</div>}
    title="No Favorites Yet"
    description="Start exploring county maps to save your favorite parcels. Favorited parcels will appear here for easy access."
    action={
      <button 
        onClick={onExplore}
        className="btn-primary"
      >
        Explore Counties
      </button>
    }
  />
)

// No recent activity empty state
export const NoActivityState = () => (
  <EmptyStateBase
    icon={<div className="text-4xl">📊</div>}
    title="No Recent Activity"
    description="Your recent county visits, favorited parcels, and session stats will appear here as you explore the portal."
  />
)

// No search results empty state
export const NoSearchResultsState = ({ searchTerm, onClear }) => (
  <EmptyStateBase
    icon={<div className="text-4xl">🔍</div>}
    title="No Results Found"
    description={`No parcels found matching "${searchTerm}". Try adjusting your search criteria or browse all available parcels.`}
    action={
      <button 
        onClick={onClear}
        className="btn-secondary"
      >
        Clear Search
      </button>
    }
  />
)

// Data loading error state
export const DataErrorState = ({ title = "Failed to Load Data", description, onRetry }) => (
  <EmptyStateBase
    icon={<div className="text-4xl text-red-500">⚠️</div>}
    title={title}
    description={description || "There was an error loading the data. Please check your connection and try again."}
    action={
      onRetry && (
        <button 
          onClick={onRetry}
          className="btn-primary"
        >
          Try Again
        </button>
      )
    }
    className="bg-red-50 border border-red-200 rounded-lg"
  />
)

// No map data state
export const NoMapDataState = ({ county, onGoBack }) => (
  <EmptyStateBase
    icon={<div className="text-4xl">🗺️</div>}
    title="No Map Data Available"
    description={`Map data for ${county} is currently unavailable. This may be due to a connection issue or the data is being updated.`}
    action={
      <div className="space-x-4">
        <button 
          onClick={onGoBack}
          className="btn-secondary"
        >
          Go Back
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Refresh Page
        </button>
      </div>
    }
  />
)

// Connection error state
export const ConnectionErrorState = ({ onRetry }) => (
  <EmptyStateBase
    icon={<div className="text-4xl text-orange-500">📡</div>}
    title="Connection Issue"
    description="Unable to connect to the server. Please check your internet connection and try again."
    action={
      <button 
        onClick={onRetry}
        className="btn-primary"
      >
        Retry Connection
      </button>
    }
    className="bg-orange-50 border border-orange-200 rounded-lg"
  />
)

// Coming soon state for unavailable features
export const ComingSoonState = ({ feature, description }) => (
  <EmptyStateBase
    icon={<div className="text-4xl">🚧</div>}
    title={`${feature} Coming Soon`}
    description={description || `${feature} is currently under development and will be available in a future update.`}
    className="bg-yellow-50 border border-yellow-200 rounded-lg"
  />
)

// Permissions error state
export const PermissionsErrorState = ({ onSignIn }) => (
  <EmptyStateBase
    icon={<div className="text-4xl text-blue-500">🔐</div>}
    title="Sign In Required"
    description="You need to be signed in to access this feature. Please sign in to continue."
    action={
      <button 
        onClick={onSignIn}
        className="btn-primary"
      >
        Sign In
      </button>
    }
    className="bg-blue-50 border border-blue-200 rounded-lg"
  />
)

// Admin only state
export const AdminOnlyState = () => (
  <EmptyStateBase
    icon={<div className="text-4xl text-purple-500">👑</div>}
    title="Admin Access Required"
    description="This section is only available to administrators. Contact your system administrator if you need access."
    className="bg-purple-50 border border-purple-200 rounded-lg"
  />
)

// Maintenance mode state
export const MaintenanceState = ({ estimatedTime }) => (
  <EmptyStateBase
    icon={<div className="text-4xl">🔧</div>}
    title="Under Maintenance"
    description={`The portal is currently undergoing maintenance to improve your experience. ${estimatedTime ? `Estimated completion: ${estimatedTime}` : 'Please check back later.'}`}
    className="bg-gray-50 border border-gray-200 rounded-lg"
  />
)

export default EmptyStateBase