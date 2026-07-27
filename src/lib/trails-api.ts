import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

// "Trails near me" — the nearby_trails() PostGIS RPC (migration 0009) with an
// AsyncStorage fallback so the last result survives offline. Trail geometry +
// elevation come from the OSM import pipeline (docs/trails-import.md); the
// curated in-bundle set (src/data/trails.ts) remains the zero-signal fallback
// in the UI.

export interface NearbyTrail {
  id: number;
  name: string | null;
  kind: string | null;
  lengthMi: number | null;
  gainFt: number | null;
  distanceMi: number;
  /** Route as [longitude, latitude] points (Mapbox order), trailhead-first. */
  path: [number, number][];
  profileFt: number[] | null;
}

interface RpcRow {
  id: number;
  name: string | null;
  kind: string | null;
  length_m: number | null;
  gain_ft: number | null;
  profile_ft: number[] | null;
  distance_m: number;
  geojson: { type: string; coordinates: [number, number][] } | null;
}

const M_PER_MI = 1609.34;
const CACHE_KEY = 'trails:nearby';
const NETWORK_TIMEOUT_MS = 10_000;
const round1 = (x: number) => Math.round(x * 10) / 10;

/** Reject a stalled request so the caller falls back to cache instead of
 *  hanging the "LOCATING…" state on a slow-but-not-offline connection. */
function withTimeout<T>(p: PromiseLike<T>, ms = NETWORK_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

function fromRow(r: RpcRow): NearbyTrail {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    lengthMi: r.length_m != null ? round1(r.length_m / M_PER_MI) : null,
    gainFt: r.gain_ft,
    distanceMi: round1(r.distance_m / M_PER_MI),
    path: r.geojson?.coordinates ?? [],
    profileFt: r.profile_ft,
  };
}

/** Trails within radiusMi of (lat, lon), nearest first. Caches the last result;
 *  returns the cache (or []) when offline / signed out / not yet imported. */
export async function nearbyTrails(lat: number, lon: number, radiusMi = 15): Promise<NearbyTrail[]> {
  const client = supabase;
  if (client) {
    try {
      const { data, error } = await withTimeout(
        client.rpc('nearby_trails', {
          lat,
          lon,
          radius_m: radiusMi * M_PER_MI,
          max_results: 50,
        }),
      );
      if (error) throw error;
      const trails = (data as RpcRow[]).map(fromRow);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(trails)).catch(() => {});
      return trails;
    } catch {
      // fall through to the cached result
    }
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as NearbyTrail[];
  } catch {
    // unreadable cache — treat as empty
  }
  return [];
}
