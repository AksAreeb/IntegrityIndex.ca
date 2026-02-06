# 343-Seat Federal Map (2023 Representation Order)

The federal map uses **2023 Representation Order** boundaries (343 electoral districts). To keep the map fast and under 1MB, use TopoJSON simplified with Mapshaper.

## 1. Download 2023 FED boundaries (Open Canada)

- **Dataset:** [Federal Electoral Districts - Canada 2023](https://open.canada.ca/data/en/dataset/18bf3ea7-1940-46ec-af52-9ba3f77ed708) (Elections Canada, Open Government Licence).
- **Formats:** Shapefile (SHP), FGDB, KMZ. GeoJSON is not provided directly.
- **FTP (English):**  
  `https://ftp.maps.canada.ca/pub/elections_elections/Electoral-districts_Circonscription-electorale/federal_electoral_districts_boundaries_2023/`
- Download the Shapefile (e.g. English) and extract.

## 2. Convert to GeoJSON (optional step)

If you have [Mapshaper](https://mapshaper.org/) CLI or QGIS:

- **Mapshaper (GUI):** Open the `.shp` in [mapshaper.org](https://mapshaper.org/), export as GeoJSON.
- **Mapshaper (CLI):**  
  `mapshaper fed_2023.shp -o format=geojson fed_2023.json`

## 3. Simplify and convert to TopoJSON (&lt;1MB)

In Mapshaper (recommended):

1. Load the GeoJSON (or Shapefile).
2. Run simplification, e.g. **Simplify** with a value that keeps file &lt;1MB (e.g. 10–20% or a small `%`).
3. Export as **TopoJSON**. The output will have one object (e.g. `fed_2023` or `default`). The map uses the first non-`default` object key.

**CLI example:**

```bash
mapshaper fed_2023.json -simplify 15% -o format=topojson fed_2023.topojson
```

## 4. Place the file

- Save the TopoJSON as:  
  **`public/data/canada_ridings_2023.topojson`**
- The map will load this first. If it’s missing, it falls back to `public/data/canada_ridings.json` (e.g. placeholder or legacy 338/343 GeoJSON).

## 5. Data-join and choropleth

- **Riding activity** comes from **TradeTicker** (Material Change disclosures) via **`/api/riding-activity`**.
- The frontend joins activity to map shapes by **riding key** (normalized riding name, e.g. `st-johns-east`).
- **Choropleth:** Ridings with more Material Changes are drawn in a **darker shade**; no activity = light fill. Same behaviour as integrityindex.us.

## Property names for join

The map expects each feature to have a name in one of:

- `properties.name`
- `properties.ridingName`
- `properties.ENNAME`
- `properties.ED_NAMEE` (Elections Canada / Open Canada)

`ridingId` is derived as a normalized key from that name for joining to `/api/riding-activity` (which keys by `ridingKey` = normalized MP riding name from the Member table).
