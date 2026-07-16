import AsyncStorage from '@react-native-async-storage/async-storage';

import { keyOf, todayDate } from '@/program/schedule';

// Trailhead forecast — the app's ONE runtime weather dependency (offline-first
// everywhere else). Primary: Open-Meteo (free, keyless, ~10k req/day
// non-commercial). Fallback: NWS api.weather.gov (keyless, US-only). Cached in
// AsyncStorage per trailhead per day; a cache entry counts as fresh only on
// the day it was fetched, so a Monday fetch of Saturday's forecast refreshes
// on the next open. With no network, the last cached forecast is returned
// marked stale — never a spinner, never a crash.

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

// WMO weather interpretation codes → poster-style labels.
const WMO: [number, string][] = [
  [0, 'CLEAR'],
  [1, 'MOSTLY CLEAR'],
  [2, 'PARTLY CLOUDY'],
  [3, 'OVERCAST'],
  [45, 'FOG'],
  [48, 'FREEZING FOG'],
  [51, 'LIGHT DRIZZLE'],
  [55, 'DRIZZLE'],
  [56, 'FREEZING DRIZZLE'],
  [61, 'LIGHT RAIN'],
  [63, 'RAIN'],
  [65, 'HEAVY RAIN'],
  [66, 'FREEZING RAIN'],
  [71, 'LIGHT SNOW'],
  [73, 'SNOW'],
  [75, 'HEAVY SNOW'],
  [77, 'SNOW GRAINS'],
  [80, 'SHOWERS'],
  [82, 'HEAVY SHOWERS'],
  [85, 'SNOW SHOWERS'],
  [95, 'THUNDERSTORM'],
  [99, 'THUNDERSTORM + HAIL'],
];

function wmoLabel(code: number): string {
  let label = 'UNSETTLED';
  for (const [c, l] of WMO) {
    if (code >= c) label = l;
  }
  return label;
}

const cacheKey = (trailId: string, dateKey: string) => `wx:${trailId}:${dateKey}`;

async function fromOpenMeteo(center: [number, number], dateKey: string): Promise<TrailheadWeather> {
  const [lon, lat] = center;
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch' +
    `&timezone=auto&start_date=${dateKey}&end_date=${dateKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = (await res.json()) as {
    daily: {
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
      precipitation_sum: number[];
      wind_speed_10m_max: number[];
      wind_gusts_10m_max: number[];
    };
  };
  const d = json.daily;
  return {
    dateKey,
    tempMaxF: Math.round(d.temperature_2m_max[0]),
    tempMinF: Math.round(d.temperature_2m_min[0]),
    windMph: Math.round(d.wind_speed_10m_max[0]),
    gustMph: Math.round(d.wind_gusts_10m_max[0]),
    precipProb: d.precipitation_probability_max[0],
    precipIn: d.precipitation_sum[0],
    label: wmoLabel(d.weather_code[0]),
    source: 'open-meteo',
    fetchedOn: keyOf(todayDate()),
  };
}

async function fromNws(center: [number, number], dateKey: string): Promise<TrailheadWeather> {
  const [lon, lat] = center;
  const headers = { 'User-Agent': 'Switchback personal training app', Accept: 'application/geo+json' };
  const ptRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers });
  if (!ptRes.ok) throw new Error(`nws points ${ptRes.status}`);
  const pt = (await ptRes.json()) as { properties: { forecast: string } };
  const fcRes = await fetch(pt.properties.forecast, { headers });
  if (!fcRes.ok) throw new Error(`nws forecast ${fcRes.status}`);
  const fc = (await fcRes.json()) as {
    properties: {
      periods: {
        startTime: string;
        isDaytime: boolean;
        temperature: number;
        windSpeed: string;
        shortForecast: string;
        probabilityOfPrecipitation?: { value: number | null };
      }[];
    };
  };
  const period = fc.properties.periods.find((p) => p.isDaytime && p.startTime.startsWith(dateKey));
  if (!period) throw new Error('nws: no daytime period for ' + dateKey);
  const windNums = period.windSpeed.match(/\d+/g)?.map(Number) ?? [0];
  return {
    dateKey,
    tempMaxF: period.temperature,
    tempMinF: null,
    windMph: Math.max(...windNums),
    gustMph: null,
    precipProb: period.probabilityOfPrecipitation?.value ?? null,
    precipIn: null,
    label: period.shortForecast.toUpperCase(),
    source: 'nws',
    fetchedOn: keyOf(todayDate()),
  };
}

/** Forecast for a trailhead on a given day (cached per trailhead per day). */
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

  for (const source of [fromOpenMeteo, fromNws]) {
    try {
      const weather = await source(trail.center, dateKey);
      await AsyncStorage.setItem(key, JSON.stringify(weather)).catch(() => {});
      return { weather, stale: false };
    } catch {
      // Try the next source; fall through to stale cache when both fail.
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
