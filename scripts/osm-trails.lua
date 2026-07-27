-- osm2pgsql FLEX config: extract hiking geometry (foot-accessible ways +
-- route=hiking relations) from a Geofabrik .osm.pbf into a staging table
-- `osm_trails`. scripts/compute-profiles.sql then transforms that into
-- public.trails and computes elevation profiles. See docs/trails-import.md.
--
--   osm2pgsql -O flex -S scripts/osm-trails.lua --slim -d <db> <extract>.osm.pbf

local trails = osm2pgsql.define_table({
  name = 'osm_trails',
  -- Accept both ways and relations in one table; osm2pgsql records which in
  -- osm_type ('W'/'R') so the transform can de-collide way/relation ids.
  ids = { type = 'any', id_column = 'osm_id', type_column = 'osm_type' },
  columns = {
    { column = 'name', type = 'text' },
    { column = 'kind', type = 'text' },
    { column = 'geom', type = 'geometry', projection = 4326, not_null = true },
  },
})

-- Foot-travel line types worth showing as trails.
local WAY_KINDS = {
  path = true,
  footway = true,
  track = true,
  bridleway = true,
  steps = true,
}

local function foot_blocked(tags)
  return tags.access == 'private' or tags.access == 'no' or tags.foot == 'no'
end

function osm2pgsql.process_way(object)
  local hw = object.tags.highway
  if not (hw and WAY_KINDS[hw]) then return end
  if foot_blocked(object.tags) then return end
  local geom = object:as_linestring()
  if geom:is_null() then return end
  trails:insert({ name = object.tags.name, kind = hw, geom = geom })
end

function osm2pgsql.process_relation(object)
  local route = object.tags.route
  if route ~= 'hiking' and route ~= 'foot' then return end
  local geom = object:as_multilinestring()
  if geom:is_null() then return end
  trails:insert({ name = object.tags.name, kind = 'route_hiking', geom = geom })
end
