import { ShieldCheckIcon } from '@heroicons/react/24/outline'

const ConfidentialityFooter = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-red-800 text-white py-2 px-4 shadow-lg border-t-2 border-red-900">
      <div className="max-w-7xl mx-auto">
        {/* Desktop version */}
        <div className="hidden md:flex items-center justify-center space-x-3">
          <ShieldCheckIcon className="h-5 w-5 text-red-200" />
          <div className="text-center">
            <span className="font-bold text-sm">
              CONFIDENTIAL AND PROTECTED
            </span>
            <span className="mx-2 text-red-200">•</span>
            <span className="text-sm">
              Property of Florida Land Design & Permitting (FLD&P)
            </span>
            <span className="mx-2 text-red-200">•</span>
            <span className="text-xs text-red-200">
              Unauthorized disclosure prohibited
            </span>
          </div>
          <ShieldCheckIcon className="h-5 w-5 text-red-200" />
        </div>
        
        {/* Mobile version */}
        <div className="md:hidden flex items-center justify-center space-x-2">
          <ShieldCheckIcon className="h-4 w-4 text-red-200" />
          <div className="text-center">
            <div className="text-xs font-bold">
              CONFIDENTIAL • Property of FLD&P
            </div>
            <div className="text-xs text-red-200">
              Unauthorized disclosure prohibited
            </div>
          </div>
          <ShieldCheckIcon className="h-4 w-4 text-red-200" />
        </div>
      </div>
    </div>
  )
}

export default ConfidentialityFooter