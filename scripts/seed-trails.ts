// Enriches the curated trail set (src/data/trails.ts) with real route
// geometry and elevation profiles. BUILD-TIME ONLY — run once when a trail is
// added, commit the generated file, and the app never touches these APIs:
//
//   geometry  OpenStreetMap via Overpass (named hiking ways near the trailhead)
//   profile   Open Topo Data ned10m (free public API: 100 locs/req, 1 req/sec)
//
// Run with: npm run seed:trails      →  writes src/data/trail-geo.ts
//
// Resolved trails are snapshotted in scripts/.trail-geo/<id>.json (committed),
// so re-runs only fetch trails without a snapshot — an API outage can never
// lose a previously good trail. Force a refetch by deleting the snapshot:
//   npm run seed:trails -- --refresh <id>
//
// To add a trail: add it to trails.ts, add an OSM name hint below, re-run.
// Trails that fail (no OSM match, API down) are skipped with a warning — the
// app falls back to procedural art for them.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TRAILS } from '../src/data/trails';

// OSM name regex per trail id, matched case-insensitively against hiking
// relations (CT's blue-blazed trails are mapped as route=hiking relations)
// and path-like named ways near `center`. radiusM must cover the whole route
// from the trailhead — through-trail relations (AT, Metacomet) get clipped to
// this radius.
const OSM_HINTS: Record<string, { nameRe: string; radiusM: number }> = {
  talcott: { nameRe: 'Metacomet|Tower', radiusM: 3500 },
  giant: { nameRe: 'Quinnipiac|Tower', radiusM: 3500 },
  chauncey: { nameRe: 'Mattabesett|Chauncey', radiusM: 4500 },
  ragged: { nameRe: 'Metacomet|Ragged Mountain', radiusM: 5000 },
  bear: { nameRe: 'Undermountain|Appalachian', radiusM: 6500 },
};

const PROFILE_POINTS = 80; // ≤100 per Open Topo Data request
const M_TO_FT = 3.28084;
const UA = 'SwitchbackTrailSeeder/1.0 (personal training app; one-time data prep)';

type LonLat = [number, number];

interface OverpassWay {
  type: string;
  geometry?: { lat: number; lon: number }[];
}

function haversineM(a: LonLat, b: LonLat): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la = (a[1] * Math.PI) / 180;
  const lb = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function fetchWays(nameRe: string, radiusM: number, center: LonLat): Promise<LonLat[][]> {
  const around = `(around:${radiusM},${center[1]},${center[0]})`;
  const q = `[out:json][timeout:120];
relation["route"~"hiking|foot"]["name"~"${nameRe}",i]${around}->.rels;
way(r.rels)${around}->.relways;
way["highway"~"^(path|footway|track|steps|bridleway)$"]["name"~"${nameRe}",i]${around}->.namedways;
(.relways; .namedways;);
out geom;`;
  let lastErr = 'no mirror tried';
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        // Overpass 406s requests without a User-Agent.
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: 'data=' + encodeURIComponent(q),
      });
      if (!res.ok) {
        lastErr = `${mirror} → ${res.status}`;
        continue;
      }
      const json = (await res.json()) as { elements: OverpassWay[] };
      return json.elements
        .filter((e) => e.type === 'way' && e.geometry && e.geometry.length > 1)
        .map((e) => e.geometry!.map((g): LonLat => [g.lon, g.lat]));
    } catch (e) {
      lastErr = `${mirror} → ${String(e)}`;
    }
  }
  throw new Error(`Overpass failed on all mirrors (${lastErr})`);
}

/** Greedy-stitch way segments into one chain, starting nearest the trailhead. */
function stitch(segments: LonLat[][], start: LonLat): LonLat[] {
  const JOIN_M = 60;
  const pool = segments.map((s) => [...s]);
  if (!pool.length) return [];

  let bestI = 0;
  let bestD = Infinity;
  pool.forEach((s, i) => {
    for (const end of [s[0], s[s.length - 1]]) {
      const d = haversineM(end, start);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
  });
  let first = pool.splice(bestI, 1)[0];
  if (haversineM(first[first.length - 1], start) < haversineM(first[0], start)) first.reverse();
  const chain = first;

  for (;;) {
    const tail = chain[chain.length - 1];
    let hit = -1;
    let reverse = false;
    let hitD = JOIN_M;
    pool.forEach((s, i) => {
      const dHead = haversineM(s[0], tail);
      const dTail = haversineM(s[s.length - 1], tail);
      if (dHead < hitD) {
        hitD = dHead;
        hit = i;
        reverse = false;
      }
      if (dTail < hitD) {
        hitD = dTail;
        hit = i;
        reverse = true;
      }
    });
    if (hit < 0) break;
    const seg = pool.splice(hit, 1)[0];
    if (reverse) seg.reverse();
    chain.push(...seg.slice(1));
  }
  return chain;
}

/** Evenly resample a chain to n points by cumulative distance. */
function resample(chain: LonLat[], n: number): LonLat[] {
  const cum = [0];
  for (let i = 1; i < chain.length; i++) {
    cum.push(cum[i - 1] + haversineM(chain[i - 1], chain[i]));
  }
  const total = cum[cum.length - 1];
  const out: LonLat[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * total;
    while (j < chain.length - 2 && cum[j + 1] < target) j++;
    const span = cum[j + 1] - cum[j] || 1;
    const t = (target - cum[j]) / span;
    out.push([
      chain[j][0] + (chain[j + 1][0] - chain[j][0]) * t,
      chain[j][1] + (chain[j + 1][1] - chain[j][1]) * t,
    ]);
  }
  return out;
}

async function elevationsFt(points: LonLat[]): Promise<number[]> {
  const locs = points.map((p) => p[1].toFixed(6) + ',' + p[0].toFixed(6)).join('|');
  const res = await fetch(`https://api.opentopodata.org/v1/ned10m?locations=${locs}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Open Topo Data ${res.status}`);
  const json = (await res.json()) as { results: { elevation: number | null }[] };
  return json.results.map((r) => Math.round((r.elevation ?? 0) * M_TO_FT));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GeoSnapshot {
  path: [number, number][];
  profileFt: number[];
}

const CACHE_DIR = join(import.meta.dirname, '.trail-geo');

async function main() {
  const refresh = new Set(process.argv.filter((a) => !a.startsWith('-')).slice(2));
  mkdirSync(CACHE_DIR, { recursive: true });
  const resolved = new Map<string, GeoSnapshot>();

  for (const trail of TRAILS) {
    const snapFile = join(CACHE_DIR, `${trail.id}.json`);
    if (!refresh.has(trail.id) && existsSync(snapFile)) {
      resolved.set(trail.id, JSON.parse(readFileSync(snapFile, 'utf8')) as GeoSnapshot);
      console.log(`  ${trail.id}: from snapshot`);
      continue;
    }
    const hint = OSM_HINTS[trail.id];
    if (!hint) {
      console.warn(`! ${trail.id}: no OSM hint — skipped (add one to OSM_HINTS)`);
      continue;
    }
    try {
      const ways = await fetchWays(hint.nameRe, hint.radiusM, trail.center);
      const chain = stitch(ways, trail.center);
      if (chain.length < 10) {
        console.warn(`! ${trail.id}: only ${chain.length} pts stitched from ${ways.length} ways — skipped`);
        continue;
      }
      const path = resample(chain, PROFILE_POINTS);
      await sleep(1200); // Open Topo Data: 1 req/sec
      const profileFt = await elevationsFt(path);
      let lenM = 0;
      for (let i = 1; i < chain.length; i++) lenM += haversineM(chain[i - 1], chain[i]);
      const relief = Math.max(...profileFt) - Math.min(...profileFt);
      console.log(
        `  ${trail.id}: ${ways.length} ways → ${(lenM / 1609.34).toFixed(1)} mi chain, ` +
          `${Math.min(...profileFt)}–${Math.max(...profileFt)} ft`,
      );
      // A match whose relief is nowhere near the trail's listed gain is almost
      // certainly the wrong feature (e.g. a street sharing the name) — skip it.
      if (relief < trail.gain * 0.4) {
        console.warn(`! ${trail.id}: relief ${relief} ft vs listed gain ${trail.gain} ft — suspect match, skipped`);
        continue;
      }
      const snap: GeoSnapshot = {
        path: path.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)] as [number, number]),
        profileFt,
      };
      writeFileSync(snapFile, JSON.stringify(snap));
      resolved.set(trail.id, snap);
    } catch (e) {
      console.warn(`! ${trail.id}: ${String(e)} — skipped`);
    }
  }

  const entries = TRAILS.filter((t) => resolved.has(t.id)).map((t) => {
    const s = resolved.get(t.id)!;
    return (
      `  ${JSON.stringify(t.id)}: {\n` +
      `    path: ${JSON.stringify(s.path)},\n` +
      `    profileFt: ${JSON.stringify(s.profileFt)},\n` +
      `  },`
    );
  });

  const module_ = `// GENERATED by scripts/seed-trails.ts — do not edit by hand.
// Route geometry from OpenStreetMap (© OSM contributors, ODbL) via Overpass;
// elevations from Open Topo Data (USGS NED 10m). Fetched once at build time
// and bundled so maps and profiles work fully offline.

export interface TrailGeo {
  /** Route points as [longitude, latitude] — Mapbox order, trailhead first. */
  path: [number, number][];
  /** Elevation in feet at each path point (same length as path). */
  profileFt: number[];
}

export const TRAIL_GEO: Record<string, TrailGeo> = {
${entries.join('\n')}
};
`;
  writeFileSync(join(import.meta.dirname, '..', 'src', 'data', 'trail-geo.ts'), module_);
  console.log(`Wrote src/data/trail-geo.ts with ${entries.length}/${TRAILS.length} trails.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
