import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import * as esriLeaflet from 'esri-leaflet'

const FloodplainLayer = ({ visible, name = 'Floodplain', url, type = 'vector' }) => {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!map || !url) return

    const setupLayer = async () => {
      try {
        console.log(`Setting up ${name} layer, visible: ${visible}, url: ${url}, type: ${type}`)
        
        // Remove existing layer if it exists
        if (layerRef.current) {
          console.log(`Removing existing ${name} layer`)
          map.removeLayer(layerRef.current)
          layerRef.current = null
        }

        if (!visible) {
          console.log(`${name} layer not visible, skipping setup`)
          return
        }

        let layer

        if (type === 'vector') {
          // Use FeatureServer instead of VectorTileServer (same as working site)
          console.log(`Creating ESRI FeatureLayer for ${name}`)
          
          // Convert VectorTileServer URL to FeatureServer URL
          const featureServerUrl = url.replace('/VectorTileServer', '/FeatureServer/0')
          console.log(`FeatureServer URL: ${featureServerUrl}`)
          
          layer = esriLeaflet.featureLayer({
            url: featureServerUrl,
            attribution: 'SWFWMD Floodplain Data',
            style: function () {
              return { 
                color: '#3b82f6', 
                weight: 2, 
                opacity: 0.8,
                fillColor: '#3b82f6',
                fillOpacity: 0.3
              }
            }
          })
          
          console.log(`${name} FeatureLayer created successfully`)
          
        } else {
          // Fallback for PMTiles or other formats
          console.log(`Creating PMTiles layer for ${name}`)
          
          try {
            // Dynamic import for PMTiles
            const { PMTiles } = await import('pmtiles')
            const { leafletLayer } = await import('protomaps-leaflet')
            
            // Create PMTiles instance
            const pmtiles = new PMTiles(url)
            
            // Create protomaps layer from PMTiles
            layer = leafletLayer({
              url: pmtiles,
              attribution: 'Floodplain data from SWFWMD',
              paint_rules: [
                {
                  dataLayer: 'default',
                  symbolizer: {
                    type: 'Fill',
                    fill: '#3b82f6',
                    opacity: 0.6,
                    stroke: '#3b82f6',
                    width: 1
                  }
                }
              ]
            })
          } catch (error) {
            console.error('Error loading PMTiles dependencies:', error)
            throw error
          }
        }

        console.log(`Adding ${name} layer to map`)
        // Store reference and add to map
        layerRef.current = layer
        layer.addTo(map)
        console.log(`${name} layer added successfully`)

      } catch (error) {
        console.error(`Error setting up ${name} layer:`, error)
      }
    }

    setupLayer()

    // Cleanup function
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, visible, url, name, type])

  return null // This component doesn't render anything itself
}

export default FloodplainLayer