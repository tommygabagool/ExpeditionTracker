-- Transform osm2pgsql staging (osm_trails) into public.trails, then compute
-- elevation profiles from a STAGING DEM raster table `dem` (raster2pgsql of
-- SRTM / USGS 3DEP tiles, SRID 4326). Drop `osm_trails` and `dem` afterward —
-- neither belongs in the live DB (see docs/trails-import.md).
--
-- No local DEM? For a small/regional validation run you can instead fill
-- profile_ft with the Open Topo Data helper (scripts/seed-trails.ts:elevationsFt)
-- against ST_AsGeoJSON(geom); the DEM path below is the one that scales
-- nationally without rate limits.

-- 1) Normalize staging geometry + attributes into public.trails.
--    Relations (osm_type 'R') get negated ids so they never collide with ways.
insert into public.trails (id, osm_type, name, kind, geom, length_m, updated_at)
select
  case when o.osm_type = 'R' then -o.osm_id else o.osm_id end,
  case when o.osm_type = 'R' then 'relation' else 'way' end,
  o.name,
  o.kind,
  g.geom_ls,
  ST_Length(g.geom_ls::geography),
  now()
from osm_trails o
cross join lateral (
  -- Merge a multilinestring into one line where topology allows; if it stays
  -- multi, keep the longest component so map + profile stay coherent.
  select case
    when ST_GeometryType(m.g) = 'ST_LineString'
      then m.g::geometry(LineString, 4326)
    else (
      select dp.geom::geometry(LineString, 4326)
      from ST_Dump(m.g) dp
      order by ST_Length(dp.geom::geography) desc
      limit 1
    )
  end as geom_ls
  from (select ST_LineMerge(o.geom) as g) m
) g
where g.geom_ls is not null and ST_NPoints(g.geom_ls) > 1
on conflict (id) do update set
  osm_type = excluded.osm_type,
  name = excluded.name,
  kind = excluded.kind,
  geom = excluded.geom,
  length_m = excluded.length_m,
  updated_at = now();

-- 2) Elevation profile from the staging DEM: sample SAMPLE_N points evenly
--    along each trail (trailhead-first), in feet, and derive gain/loss/min/max.
do $$
declare
  sample_n constant int := 64;
  m_to_ft constant double precision := 3.28084;
  t record;
  i int;
  fr double precision;
  pt geometry;
  elev_m double precision;
  elevs int[];
  gain int;
  loss int;
  prev int;
  cur int;
begin
  for t in select id, geom from public.trails loop
    elevs := array[]::int[];
    for i in 0 .. sample_n - 1 loop
      fr := case when sample_n = 1 then 0 else i::double precision / (sample_n - 1) end;
      pt := ST_LineInterpolatePoint(t.geom, fr);
      select ST_Value(d.rast, pt) into elev_m
        from dem d
        where ST_Intersects(d.rast, pt)
        limit 1;
      if elev_m is not null then
        elevs := elevs || round(elev_m * m_to_ft)::int;
      end if;
    end loop;

    if array_length(elevs, 1) is not null then
      gain := 0;
      loss := 0;
      prev := null;
      foreach cur in array elevs loop
        if prev is not null then
          if cur > prev then gain := gain + (cur - prev);
          elsif cur < prev then loss := loss + (prev - cur);
          end if;
        end if;
        prev := cur;
      end loop;

      update public.trails set
        profile_ft = elevs,
        gain_ft = gain,
        loss_ft = loss,
        min_ft = (select min(x) from unnest(elevs) as x),
        max_ft = (select max(x) from unnest(elevs) as x)
      where id = t.id;
    end if;
  end loop;
end $$;
