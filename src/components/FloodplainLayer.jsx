import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { PMTiles } from 'pmtiles'
import { leafletLayer } from 'protomaps-leaflet'
import L from 'leaflet'

const FloodplainLayer = ({ visible, name = 'Floodplain', url }) => {
  const map = useMap()
  const layerRef = useRef(null)
  const pmtilesRef = useRef(null)

  useEffect(() => {
    if (!map || !url) return

    const setupLayer = async () => {
      try {
        console.log(`Setting up ${name} layer, visible: ${visible}, url: ${url}`)
        
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

        console.log(`Creating PMTiles instance for ${name}`)
        // Create PMTiles instance
        pmtilesRef.current = new PMTiles(url)
        
        console.log(`Creating protomaps layer for ${name}`)
        // Create protomaps layer from PMTiles
        const layer = leafletLayer({
          url: pmtilesRef.current,
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
      if (pmtilesRef.current) {
        pmtilesRef.current = null
      }
    }
  }, [map, visible, url, name])

  return null // This component doesn't render anything itself
}

export default FloodplainLayer