const fs = require('fs');

// Load both county data
const hernando = JSON.parse(fs.readFileSync('Hernando_Parcels.geojson', 'utf8'));
const manatee = JSON.parse(fs.readFileSync('Manatee_Parcels.geojson', 'utf8'));

// Calculate Hernando totals
let hernandoTotal = 0;
let hernandoCount = 0;
hernando.features.forEach(feature => {
  const acres = parseFloat(feature.properties.ACRES);
  if (!isNaN(acres) && acres > 0) {
    hernandoTotal += acres;
    hernandoCount++;
  }
});

// Calculate Manatee totals
let manateeTotal = 0;
let manateeCount = 0;
manatee.features.forEach(feature => {
  const acres = parseFloat(feature.properties.LAND_ACREAGE_CAMA);
  if (!isNaN(acres) && acres > 0) {
    manateeTotal += acres;
    manateeCount++;
  }
});

const totalAcres = hernandoTotal + manateeTotal;
const totalParcels = hernandoCount + manateeCount;
const avgAcreage = totalParcels > 0 ? totalAcres / totalParcels : 0;

console.log('=== ACREAGE CALCULATION ===');
console.log(`Hernando: ${hernandoCount} parcels, ${hernandoTotal.toFixed(1)} acres`);
console.log(`Manatee: ${manateeCount} parcels, ${manateeTotal.toFixed(1)} acres`);
console.log(`TOTAL: ${totalParcels} parcels, ${totalAcres.toFixed(1)} acres`);
console.log(`AVERAGE: ${avgAcreage.toFixed(1)} acres per parcel`);
