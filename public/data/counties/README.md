# County GeoJSON Files

Place your county boundary GeoJSON files here with the following naming convention:

## File Naming:
- `walton-county.geojson`
- `okaloosa-county.geojson`
- `santa-rosa-county.geojson`
- `holmes-county.geojson`
- `washington-county.geojson`

## File Format:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "NAME": "Walton County",
        "STATE": "FL",
        "FIPS": "12131"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## Usage:
These files will be loaded automatically when users select a county in the portal.
The data service will fetch them from `/data/counties/{county-name}-county.geojson`
