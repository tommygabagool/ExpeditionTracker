import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { keyOf, todayDate } from '@/program/schedule';

// Trailhead forecast. Fetching + the Open-Meteo→NWS source logic now live in
// the `weather` edge function, which caches per (trailhead, day) server-side so
// the whole userbase shares one upstream call. The client keeps a per-device
// AsyncStorage copy purely as a fast path (same-day) and an offline fallback:
// a same-day cache entry short-circuits the call, and if the function is
// unreachable the last cached forecast is returned marked stale — never a
// spinner, never a crash.

export interface TrailheadWeather {
  /** Forecast target day, YYYY-MM-DD. */
  dateKey: string;
  tempMaxF: number;
  tempMinF: number | null;
  windMph: number;
  gustMph: number | null;
  /** Probability of precipitation, 0-100, when the source provides it. */
  precipProb: number | null;
  precipIn: number | null;
  /** Small-caps condition summary, e.g. 'PARTLY CLOUDY'. */
  label: string;
  source: 'open-meteo' | 'nws';
  /** Day the forecast was fetched — entries from a previous day are stale. */
  fetchedOn: string;
}

export interface WeatherResult {
  weather: TrailheadWeather;
  /** True when this came from cache after a failed refresh (offline). */
  stale: boolean;
}

const cacheKey = (trailId: string, dateKey: string) => `wx:${trailId}:${dateKey}`;

/** Forecast for a trailhead on a given day. Same-day AsyncStorage hit → fast
 *  path; otherwise the `weather` edge function (server cache + upstream calls);
 *  offline → the last cached forecast marked stale. */
export async function getTrailheadWeather(
  trail: { id: string; center: [number, number] },
  dateKey: string,
): Promise<WeatherResult | null> {
  const key = cacheKey(trail.id, dateKey);
  let cached: TrailheadWeather | null = null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) cached = JSON.parse(raw) as TrailheadWeather;
  } catch {
    // Unreadable cache — treat as empty.
  }
  if (cached && cached.fetchedOn === keyOf(todayDate())) {
    return { weather: cached, stale: false };
  }

  const client = supabase;
  if (client) {
    try {
      const { data, error } = await client.functions.invoke('weather', {
        body: { trailheadId: trail.id, center: trail.center, date: dateKey },
      });
      if (error) throw error;
      const result = data as { weather: TrailheadWeather | null; stale?: boolean };
      if (result.weather) {
        await AsyncStorage.setItem(key, JSON.stringify(result.weather)).catch(() => {});
        return { weather: result.weather, stale: !!result.stale };
      }
    } catch {
      // Function unreachable / offline — fall through to the stale cache.
    }
  }
  return cached ? { weather: cached, stale: true } : null;
}

/** One-line summary for notifications and compact UI. */
export function weatherLine(w: TrailheadWeather): string {
  const temp = w.tempMinF !== null ? `${w.tempMinF}–${w.tempMaxF}°F` : `${w.tempMaxF}°F`;
  const precip = w.precipProb !== null ? ` · PRECIP ${w.precipProb}%` : '';
  return `${w.label} · ${temp} · WIND ${w.windMph} MPH${precip}`;
}
