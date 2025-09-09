# Parcel GeoJSON Files

Place your parcel data GeoJSON files here with the following naming convention:

## File Naming:
- `walton-parcels.geojson` (all parcels for county)
- `walton-parcels-district-1.geojson` (parcels by district/region)
- `okaloosa-parcels.geojson`
- `santa-rosa-parcels.geojson`

## File Format:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "PARCEL_ID": "12345-67890",
        "ADDRESS": "123 Main Street",
        "OWNER": "John Smith",
        "ACREAGE": 2.5,
        "VALUE": 450000,
        "ZONING": "Residential",
        "COUNTY": "Walton"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## Performance Tips:
- For large datasets (>5MB), consider splitting by geographic regions
- Use compressed files (.geojson.gz) for better loading times
- Include only essential properties to reduce file size

## Usage:
These files will be loaded when users navigate to specific county map pages.
The data service will fetch them from `/data/parcels/{county-name}-parcels.geojson`
