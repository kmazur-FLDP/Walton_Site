// Professional skeleton loaders for better loading UX
import { motion } from 'framer-motion'

// Base skeleton component with shimmer animation
const SkeletonBase = ({ className, animate = true, children }) => {
  const shimmerVariants = {
    initial: { backgroundPosition: '-200px 0' },
    animate: { 
      backgroundPosition: 'calc(200px + 100%) 0',
      transition: {
        duration: 1.5,
        ease: 'linear',
        repeat: Infinity,
      }
    }
  }

  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] ${className}`}
      style={{
        backgroundImage: animate 
          ? 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)'
          : undefined
      }}
      variants={animate ? shimmerVariants : undefined}
      initial={animate ? "initial" : undefined}
      animate={animate ? "animate" : undefined}
    >
      {children}
    </motion.div>
  )
}

// Card skeleton for dashboard cards
export const CardSkeleton = ({ animate = true }) => (
  <div className="card">
    <SkeletonBase className="w-12 h-12 rounded-lg mx-auto mb-4" animate={animate} />
    <SkeletonBase className="h-4 w-24 mx-auto mb-2 rounded" animate={animate} />
    <SkeletonBase className="h-8 w-16 mx-auto rounded" animate={animate} />
  </div>
)

// Map loading skeleton
export const MapSkeleton = ({ animate = true }) => (
  <div className="h-[calc(100vh-80px)] bg-gray-100 relative overflow-hidden">
    <SkeletonBase 
      className="absolute inset-0" 
      animate={animate}
    />
    
    {/* Simulate map controls */}
    <div className="absolute top-4 right-4 space-y-2">
      <SkeletonBase className="w-10 h-10 rounded" animate={animate} />
      <SkeletonBase className="w-10 h-10 rounded" animate={animate} />
    </div>
    
    {/* Simulate legend */}
    <div className="absolute bottom-4 left-4 bg-white rounded-lg p-4 shadow-lg">
      <SkeletonBase className="h-4 w-16 mb-3 rounded" animate={animate} />
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <SkeletonBase className="w-4 h-4 rounded" animate={animate} />
          <SkeletonBase className="h-3 w-20 rounded" animate={animate} />
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonBase className="w-4 h-4 rounded" animate={animate} />
          <SkeletonBase className="h-3 w-16 rounded" animate={animate} />
        </div>
      </div>
    </div>
    
    {/* Loading message */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 shadow-lg text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <SkeletonBase className="h-4 w-32 mx-auto rounded" animate={animate} />
      </div>
    </div>
  </div>
)

// County preview skeleton
export const CountyPreviewSkeleton = ({ animate = true }) => (
  <div className="card">
    {/* Mini map preview */}
    <SkeletonBase className="w-full h-32 rounded-lg mb-4" animate={animate} />
    
    {/* County name and icon */}
    <div className="flex items-center justify-between mb-4">
      <SkeletonBase className="h-5 w-24 rounded" animate={animate} />
      <SkeletonBase className="w-6 h-6 rounded" animate={animate} />
    </div>
    
    {/* Stats */}
    <div className="space-y-2 mb-4">
      <div className="flex justify-between">
        <SkeletonBase className="h-3 w-20 rounded" animate={animate} />
        <SkeletonBase className="h-3 w-12 rounded" animate={animate} />
      </div>
      <div className="flex justify-between">
        <SkeletonBase className="h-3 w-16 rounded" animate={animate} />
        <SkeletonBase className="h-3 w-10 rounded" animate={animate} />
      </div>
    </div>
    
    {/* Button */}
    <SkeletonBase className="w-full h-10 rounded-lg" animate={animate} />
  </div>
)

// Progress loading skeleton
export const ProgressSkeleton = ({ animate = true }) => (
  <div className="card">
    <div className="text-center">
      <SkeletonBase className="w-16 h-16 rounded-lg mx-auto mb-4" animate={animate} />
      <SkeletonBase className="h-5 w-32 mx-auto mb-4 rounded" animate={animate} />
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <motion.div 
          className="bg-primary-600 h-2 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "60%" }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </div>
      
      <SkeletonBase className="h-3 w-24 mx-auto mb-4 rounded" animate={animate} />
      
      {/* Status indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center space-x-2">
            <SkeletonBase className="w-3 h-3 rounded-full" animate={animate} />
            <SkeletonBase className="h-3 w-12 rounded" animate={animate} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Recent activity skeleton
export const ActivitySkeleton = ({ animate = true }) => (
  <div className="card">
    <SkeletonBase className="h-6 w-32 mb-6 rounded" animate={animate} />
    
    {/* Session stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-4 text-center">
          <SkeletonBase className="w-8 h-8 rounded-full mx-auto mb-2" animate={animate} />
          <SkeletonBase className="h-6 w-8 mx-auto mb-1 rounded" animate={animate} />
          <SkeletonBase className="h-3 w-16 mx-auto rounded" animate={animate} />
        </div>
      ))}
    </div>
    
    {/* Recent items */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <SkeletonBase className="h-5 w-24 mb-3 rounded" animate={animate} />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <SkeletonBase className="h-4 w-20 mb-1 rounded" animate={animate} />
                  <SkeletonBase className="h-3 w-32 rounded" animate={animate} />
                </div>
                <SkeletonBase className="h-3 w-8 rounded" animate={animate} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Table skeleton for admin pages
export const TableSkeleton = ({ rows = 5, animate = true }) => (
  <div className="card">
    {/* Header */}
    <div className="border-b border-gray-200 pb-4 mb-4">
      <SkeletonBase className="h-6 w-32 mb-2 rounded" animate={animate} />
      <SkeletonBase className="h-4 w-48 rounded" animate={animate} />
    </div>
    
    {/* Table */}
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-4 gap-4 pb-2 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBase key={i} className="h-4 rounded" animate={animate} />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 py-2">
          {Array.from({ length: 4 }).map((_, j) => (
            <SkeletonBase key={j} className="h-4 rounded" animate={animate} />
          ))}
        </div>
      ))}
    </div>
  </div>
)

export default SkeletonBase