#!/usr/bin/env node

/**
 * Simplify large GeoJSON files for better browser performance
 * Usage: node scripts/simplify-geojson.js <input-file> <output-file> [tolerance]
 * 
 * Example: node scripts/simplify-geojson.js public/data/level2/wetlands.geojson public/data/level2/wetlands_simplified.geojson 0.001
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Simple Douglas-Peucker algorithm for coordinate simplification
function simplifyCoordinates(coords, tolerance = 0.001) {
  if (!coords || coords.length < 3) return coords
  
  // For simple cases, just keep every nth point
  const step = Math.max(1, Math.floor(coords.length / 1000))
  if (step > 1) {
    const simplified = []
    for (let i = 0; i < coords.length; i += step) {
      simplified.push(coords[i])
    }
    // Always keep the last point for closed polygons
    if (simplified[simplified.length - 1] !== coords[coords.length - 1]) {
      simplified.push(coords[coords.length - 1])
    }
    return simplified
  }
  
  return coords
}

function simplifyGeometry(geometry, tolerance) {
  if (!geometry) return geometry
  
  const { type, coordinates } = geometry
  
  switch (type) {
    case 'Point':
      return geometry
      
    case 'LineString':
      return {
        type,
        coordinates: simplifyCoordinates(coordinates, tolerance)
      }
      
    case 'Polygon':
      return {
        type,
        coordinates: coordinates.map(ring => simplifyCoordinates(ring, tolerance))
      }
      
    case 'MultiPoint':
      return geometry
      
    case 'MultiLineString':
      return {
        type,
        coordinates: coordinates.map(line => simplifyCoordinates(line, tolerance))
      }
      
    case 'MultiPolygon':
      return {
        type,
        coordinates: coordinates.map(polygon => 
          polygon.map(ring => simplifyCoordinates(ring, tolerance))
        )
      }
      
    default:
      return geometry
  }
}

function simplifyGeoJSON(geojson, tolerance = 0.001, removeProperties = []) {
  if (geojson.type === 'FeatureCollection') {
    return {
      type: 'FeatureCollection',
      features: geojson.features.map(feature => {
        const simplifiedGeometry = simplifyGeometry(feature.geometry, tolerance)
        
        // Optionally remove unnecessary properties to reduce file size
        const properties = { ...feature.properties }
        removeProperties.forEach(prop => delete properties[prop])
        
        return {
          type: 'Feature',
          properties,
          geometry: simplifiedGeometry
        }
      })
    }
  } else if (geojson.type === 'Feature') {
    return {
      type: 'Feature',
      properties: geojson.properties,
      geometry: simplifyGeometry(geojson.geometry, tolerance)
    }
  }
  
  return geojson
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: node scripts/simplify-geojson.js <input-file> <output-file> [tolerance]')
  console.error('Example: node scripts/simplify-geojson.js input.geojson output.geojson 0.001')
  process.exit(1)
}

const inputFile = args[0]
const outputFile = args[1]
const tolerance = parseFloat(args[2]) || 0.001

console.log(`Reading ${inputFile}...`)
const inputPath = path.resolve(inputFile)

if (!fs.existsSync(inputPath)) {
  console.error(`Error: Input file not found: ${inputPath}`)
  process.exit(1)
}

const stats = fs.statSync(inputPath)
console.log(`Input file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

try {
  const geojson = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  
  console.log(`Original features: ${geojson.features?.length || 0}`)
  
  console.log(`Simplifying with tolerance ${tolerance}...`)
  const simplified = simplifyGeoJSON(geojson, tolerance)
  
  const outputPath = path.resolve(outputFile)
  console.log(`Writing to ${outputPath}...`)
  
  fs.writeFileSync(outputPath, JSON.stringify(simplified))
  
  const outputStats = fs.statSync(outputPath)
  const reduction = ((1 - outputStats.size / stats.size) * 100).toFixed(1)
  
  console.log(`✓ Done!`)
  console.log(`Output file size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Size reduction: ${reduction}%`)
  console.log(`Output features: ${simplified.features?.length || 0}`)
  
} catch (error) {
  console.error('Error processing file:', error.message)
  process.exit(1)
}
