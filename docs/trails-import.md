# Trails import (OSM → PostGIS)

How to populate `public.trails` (migration `0009_trails_spatial.sql`) with hiking
geometry + elevation profiles. This is a **one-time / periodic ETL you run**, not
part of the app build. The app reads the result through the `nearby_trails()`
RPC (see `src/lib/trails-api.ts`).

> **Validate on one state first.** Everything below works on a single Geofabrik
> state extract (e.g. Connecticut, a few MB) exactly as it does nationally —
> same commands, tiny data. Do that end-to-end before the national run.

## Prerequisites
- The migration applied: `supabase db push` (creates PostGIS, `public.trails`,
  the GiST index, and `nearby_trails()`).
- Tools: `osm2pgsql` (≥ 1.6, flex output), `raster2pgsql` + GDAL (for the DEM),
  and `psql` pointed at the same database (`$DATABASE_URL`).

## 1. Get the OSM extract
Download a Geofabrik `.osm.pbf` — a state to validate, or the US regions for the
national set (<https://download.geofabrik.de/north-america/us.html>).

```sh
curl -O https://download.geofabrik.de/north-america/us/connecticut-latest.osm.pbf
```

## 2. Import hiking geometry → staging `osm_trails`
```sh
osm2pgsql -O flex -S scripts/osm-trails.lua --slim -d "$DATABASE_URL" \
  connecticut-latest.osm.pbf
```
`scripts/osm-trails.lua` keeps foot-accessible `path/footway/track/bridleway/steps`
ways and `route=hiking` relations, writing geometry + `name`/`kind` to `osm_trails`.

## 3. Load a DEM → staging `dem` (for elevation)
Get elevation tiles covering the extract — SRTM 30 m (global) or USGS 3DEP
(US, higher-res) — reproject to 4326, and load as raster:

```sh
# Example: SRTM tiles merged to srtm.tif (EPSG:4326)
raster2pgsql -s 4326 -t 256x256 -I -C srtm.tif dem | psql "$DATABASE_URL"
```

> **Scale:** the `dem` table is a **staging artifact** — a national DEM raster is
> tens of GB and must NOT stay in the production DB. Drop it after step 4.

## 4. Transform + compute profiles → `public.trails`
```sh
psql "$DATABASE_URL" -f scripts/compute-profiles.sql
```
This normalizes staging geometry into `public.trails` (relations merged with
`ST_LineMerge`, longest component kept; `length_m` computed) and samples 64
points/trail against `dem` for `profile_ft` + `gain_ft/loss_ft/min_ft/max_ft`.

## 5. Clean up staging + verify
```sh
psql "$DATABASE_URL" -c "drop table if exists osm_trails; drop table if exists dem;"
psql "$DATABASE_URL" -c "select count(*) from public.trails;"
psql "$DATABASE_URL" -c "select id, name, gain_ft, round(distance_m) \
  from nearby_trails(41.4223, -72.9060, 20000, 10);"   -- Sleeping Giant area
```
You should get nearby trails ordered by distance, each with a gain figure.

## Periodic refresh
Re-run steps 1–5 on fresh extracts. `compute-profiles.sql` upserts by OSM id, so
re-imports update in place. Consider staging into a temp schema and swapping if
you want zero read downtime.

## No local DEM?
For a small regional run you can skip steps 3–4's DEM and instead fill
`profile_ft` with the Open Topo Data helper already in
`scripts/seed-trails.ts` (`elevationsFt`, `resample`) against `ST_AsGeoJSON(geom)`.
That path is rate-limited (1 req/s) so it does **not** scale to the national set —
use the DEM raster for that.
