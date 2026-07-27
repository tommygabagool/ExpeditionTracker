-- Spatial trails backend: bulk OSM hiking geometry in PostGIS, GiST-indexed,
-- with precomputed elevation profiles. Populated by the ETL in
-- docs/trails-import.md (osm2pgsql import → transform → elevation), NOT by the
-- app or a curated seed. "Trails near me" is the nearby_trails() RPC below.
--
-- Scale note: the live DB holds only geometry + precomputed profiles. The DEM
-- used to compute profiles is a STAGING artifact in the ETL and is never kept
-- here (a national DEM raster would be tens of GB). See the plan / runbook.

create extension if not exists postgis;

-- Idempotent: drop ONLY a pre-spatial placeholder `trails` (no geom column)
-- left by an earlier 0008. Never drop an already-spatial trails table — that
-- would discard an OSM import, which is expensive to rebuild.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'trails'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trails' and column_name = 'geom'
  ) then
    drop table public.trails cascade;
  end if;
end $$;

create table if not exists public.trails (
  id bigint primary key,                       -- OSM way/relation id (negative for relations, osm2pgsql convention)
  osm_type text not null check (osm_type in ('way', 'relation')),
  name text,
  kind text,                                   -- path | footway | track | bridleway | steps | route_hiking
  geom geometry (LineString, 4326) not null,
  length_m double precision,
  gain_ft int,
  loss_ft int,
  min_ft int,
  max_ft int,
  profile_ft int[],                            -- elevation (ft) resampled along geom, trailhead-first
  updated_at timestamptz not null default now()
);

-- Spatial index powering ST_DWithin / KNN proximity.
create index if not exists trails_geom_gix on public.trails using gist (geom);
-- Optional attribute filters for the app's list (distance/gain).
create index if not exists trails_kind_idx on public.trails (kind);

-- Shared read-only: any authenticated user reads; only the service-role ETL
-- writes (no write policy). Same pattern as programs/exercises (0006/0008).
alter table public.trails enable row level security;
drop policy if exists read_all on public.trails;
create policy read_all on public.trails for select to authenticated using (true);

-- "Trails near me": everything within radius_m of (lat, lon), nearest first,
-- with straight-line distance and the route as GeoJSON for the map. STABLE so
-- PostgREST exposes it as an RPC; runs as the caller, so the read_all policy
-- above applies.
create or replace function public.nearby_trails(
  lat double precision,
  lon double precision,
  radius_m double precision default 25000,
  max_results int default 50
)
returns table (
  id bigint,
  name text,
  kind text,
  length_m double precision,
  gain_ft int,
  profile_ft int[],
  distance_m double precision,
  geojson jsonb
)
language sql
stable
as $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(lon, lat), 4326) as pt
  )
  select
    t.id,
    t.name,
    t.kind,
    t.length_m,
    t.gain_ft,
    t.profile_ft,
    ST_Distance(t.geom::geography, o.pt::geography) as distance_m,
    ST_AsGeoJSON(t.geom)::jsonb as geojson
  from public.trails t, origin o
  where ST_DWithin(t.geom::geography, o.pt::geography, radius_m)
  order by t.geom <-> o.pt
  limit greatest(1, least(max_results, 200));
$$;

grant execute on function public.nearby_trails(double precision, double precision, double precision, int) to authenticated;
