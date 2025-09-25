#!/usr/bin/env node

/**
 * Script to simplify Polk FLU GeoJSON by filtering and optionally simplifying geometries
 * Reduces 4,993 features to manageable subset for web mapping
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Categories to EXCLUDE (keep everything else)
// Only remove water bodies and very minor categories
const EXCLUDE_CATEGORIES = [
  'LAKES',   // 767 features - water bodies not useful for land development
  // Keep everything else including PRESV (preservation), CITY, commercial, industrial, etc.
]

async function simplifyPolkFLU() {
  try {
    const inputPath = path.join(__dirname, '../public/data/Polk_FLU.geojson')
    const outputPath = path.join(__dirname, '../public/data/Polk_FLU_Simplified.geojson')
    
    console.log('Reading Polk FLU data...')
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
    
    console.log(`Original features: ${data.features.length}`)
    
    // Filter features to exclude only water bodies and truly minor categories
    const filteredFeatures = data.features.filter(feature => {
      const fluName = feature.properties.FLUNAME
      return !EXCLUDE_CATEGORIES.includes(fluName)
    })
    
    // Create simplified GeoJSON
    const simplified = {
      ...data,
      features: filteredFeatures
    }
    
    console.log(`Filtered features: ${simplified.features.length}`)
    console.log(`Reduction: ${((data.features.length - simplified.features.length) / data.features.length * 100).toFixed(1)}%`)
    
    // Write simplified version (compact JSON)
    fs.writeFileSync(outputPath, JSON.stringify(simplified))
    
    console.log(`\nSimplified FLU data written to: ${outputPath}`)
    
    // Show category breakdown
    const categoryCounts = {}
    simplified.features.forEach(feature => {
      const cat = feature.properties.FLUNAME
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
    
    console.log('\nKept categories:')
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} features`)
      })
      
    // Check file sizes
    const originalSize = fs.statSync(inputPath).size
    const simplifiedSize = fs.statSync(outputPath).size
    
    console.log(`\nFile size reduction:`)
    console.log(`  Original: ${(originalSize / 1024 / 1024).toFixed(1)} MB`)
    console.log(`  Simplified: ${(simplifiedSize / 1024 / 1024).toFixed(1)} MB`)
    console.log(`  Reduction: ${((originalSize - simplifiedSize) / originalSize * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('Error simplifying Polk FLU:', error)
  }
}

simplifyPolkFLU()