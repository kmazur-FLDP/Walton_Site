#!/usr/bin/env node

/**
 * Reduce coordinate precision in GeoJSON to decrease file size
 * Usage: node scripts/reduce-precision.js <input-file> <output-file> [decimals]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function roundCoordinate(coord, decimals) {
  const factor = Math.pow(10, decimals)
  return Math.round(coord * factor) / factor
}

function roundCoordinates(coords, decimals) {
  if (typeof coords[0] === 'number') {
    return coords.map(c => roundCoordinate(c, decimals))
  }
  return coords.map(c => roundCoordinates(c, decimals))
}

function processGeometry(geometry, decimals) {
  if (!geometry || !geometry.coordinates) return geometry
  
  return {
    ...geometry,
    coordinates: roundCoordinates(geometry.coordinates, decimals)
  }
}

function processGeoJSON(geojson, decimals) {
  if (geojson.type === 'FeatureCollection') {
    return {
      type: 'FeatureCollection',
      features: geojson.features.map(feature => ({
        type: 'Feature',
        properties: feature.properties,
        geometry: processGeometry(feature.geometry, decimals)
      }))
    }
  } else if (geojson.type === 'Feature') {
    return {
      type: 'Feature',
      properties: geojson.properties,
      geometry: processGeometry(geojson.geometry, decimals)
    }
  }
  return geojson
}

// Main
const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: node scripts/reduce-precision.js <input-file> <output-file> [decimals]')
  console.error('Example: node scripts/reduce-precision.js input.geojson output.geojson 5')
  console.error('\nDecimals: 6 = ~0.1m precision (default), 5 = ~1m, 4 = ~10m')
  process.exit(1)
}

const inputFile = args[0]
const outputFile = args[1]
const decimals = parseInt(args[2]) || 6

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
  
  console.log(`Reducing coordinate precision to ${decimals} decimal places...`)
  const processed = processGeoJSON(geojson, decimals)
  
  const outputPath = path.resolve(outputFile)
  console.log(`Writing to ${outputPath}...`)
  
  fs.writeFileSync(outputPath, JSON.stringify(processed))
  
  const outputStats = fs.statSync(outputPath)
  const reduction = ((1 - outputStats.size / stats.size) * 100).toFixed(1)
  
  console.log(`✓ Done!`)
  console.log(`Output file size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Size reduction: ${reduction}%`)
  
} catch (error) {
  console.error('Error processing file:', error.message)
  process.exit(1)
}
