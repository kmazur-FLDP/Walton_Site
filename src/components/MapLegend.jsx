import React from 'react'

const MapLegend = ({ 
  countyColor = '#ffeb3b',
  showFloodplain = false,
  showWetlands = false,
  showDevelopmentAreas = false,
  onToggleFloodplain,
  onToggleWetlands,
  onToggleDevelopmentAreas,
  floodplainLoading = false,
  wetlandsLoading = false,
  // Planning layer props
  showZoning = false,
  showFLU = false,
  onToggleZoning,
  onToggleFLU,
  zoningLegend = [],
  fluLegend = [],
  zoningLoading = false,
  fluLoading = false
}) => {
  return (
    <div className="absolute bottom-16 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-30 max-w-xs">
      <h3 className="font-semibold text-sm mb-3 text-gray-800">Map Legend</h3>
      
      {/* Parcel Legend */}
      <div className="space-y-2 text-xs mb-4">
        <h4 className="font-medium text-xs text-gray-700 mb-2">Parcels</h4>
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 border border-yellow-600 rounded" 
            style={{backgroundColor: countyColor}}
          ></div>
          <span>Available Parcels</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
          <span>Selected Parcel</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
          <span>Favorited Parcels</span>
        </div>
      </div>

      {/* Environmental Layers */}
      <div className="border-t border-gray-200 pt-3">
        <h4 className="font-medium text-xs mb-3 text-gray-700">Environmental Layers</h4>
        <div className="space-y-2">
          
          {/* Floodplain Toggle */}
          {onToggleFloodplain && (
            <div 
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                showFloodplain ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={onToggleFloodplain}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showFloodplain}
                  onChange={() => {}} // Handled by onClick
                  className="w-3 h-3 text-blue-600 rounded"
                />
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 border border-blue-600 rounded opacity-60"></div>
                  <span className="text-xs">SWFWMD Floodplain</span>
                </div>
              </div>
              {floodplainLoading && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              )}
            </div>
          )}

          {/* Wetlands Toggle */}
          {onToggleWetlands && (
            <div 
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                showWetlands ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={onToggleWetlands}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showWetlands}
                  onChange={() => {}} // Handled by onClick
                  className="w-3 h-3 text-green-600 rounded"
                />
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-600 border border-green-700 rounded opacity-60"></div>
                  <span className="text-xs">USFWS Wetlands</span>
                </div>
              </div>
              {wetlandsLoading && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
              )}
            </div>
          )}

          {/* Development Areas Toggle */}
          {onToggleDevelopmentAreas && (
            <div 
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                showDevelopmentAreas ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={onToggleDevelopmentAreas}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showDevelopmentAreas}
                  onChange={() => {}} // Handled by onClick
                  className="w-3 h-3 text-purple-600 rounded"
                />
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-600 border border-purple-700 rounded opacity-60"></div>
                  <span className="text-xs">Development Areas</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Planning Layers */}
      {(onToggleZoning || onToggleFLU) && (
        <div className="border-t border-gray-200 pt-3">
          <h4 className="font-medium text-xs mb-3 text-gray-700">Planning</h4>
          <div className="space-y-2">
            
            {/* Zoning Toggle */}
            {onToggleZoning && (
              <div 
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  showZoning ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={onToggleZoning}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showZoning}
                    onChange={() => {}} // Handled by onClick
                    className="w-3 h-3 text-orange-600 rounded"
                  />
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 border border-orange-600 rounded opacity-60"></div>
                    <span className="text-xs">Zoning</span>
                  </div>
                </div>
                {zoningLoading && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                )}
              </div>
            )}

            {/* Future Land Use Toggle */}
            {onToggleFLU && (
              <div 
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  showFLU ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={onToggleFLU}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showFLU}
                    onChange={() => {}} // Handled by onClick
                    className="w-3 h-3 text-teal-600 rounded"
                  />
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-teal-500 border border-teal-600 rounded opacity-60"></div>
                    <span className="text-xs">Future Land Use</span>
                  </div>
                </div>
                {fluLoading && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600"></div>
                )}
              </div>
            )}

            {/* Zoning Legend */}
            {showZoning && zoningLegend.length > 0 && (
              <div className="ml-6 mt-2 space-y-1 max-h-32 overflow-y-auto">
                <div className="text-xs font-medium text-gray-600">Zoning Categories:</div>
                {zoningLegend.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="truncate" title={item.label}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* FLU Legend */}
            {showFLU && fluLegend.length > 0 && (
              <div className="ml-6 mt-2 space-y-1 max-h-32 overflow-y-auto">
                <div className="text-xs font-medium text-gray-600">Future Land Use Categories:</div>
                {fluLegend.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="truncate" title={item.label}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

export default MapLegend