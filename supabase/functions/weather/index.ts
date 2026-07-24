// Trailhead forecast proxy with a shared server-side cache. The app used to
// call Open-Meteo / NWS directly from every device; now one call per
// (trailhead, day) within the TTL serves the whole userbase.
//
// Primary source: Open-Meteo (free, keyless). Fallback: NWS api.weather.gov
// (keyless, US-only). Cache: public.weather_cache, keyed (trailhead_id,
// forecast_date), refreshed when older than CACHE_TTL_MS. On a total upstream
// failure the last cached row is returned marked stale, so the client still
// renders something offline.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // a few hours

interface TrailheadWeather {
  dateKey: string;
  tempMaxF: number;
  tempMinF: number | null;
  windMph: number;
  gustMph: number | null;
  precipProb: number | null;
  precipIn: number | null;
  label: string;
  source: 'open-meteo' | 'nws';
  fetchedOn: string;
}

const WMO: [number, string][] = [
  [0, 'CLEAR'], [1, 'MOSTLY CLEAR'], [2, 'PARTLY CLOUDY'], [3, 'OVERCAST'],
  [45, 'FOG'], [48, 'FREEZING FOG'], [51, 'LIGHT DRIZZLE'], [55, 'DRIZZLE'],
  [56, 'FREEZING DRIZZLE'], [61, 'LIGHT RAIN'], [63, 'RAIN'], [65, 'HEAVY RAIN'],
  [66, 'FREEZING RAIN'], [71, 'LIGHT SNOW'], [73, 'SNOW'], [75, 'HEAVY SNOW'],
  [77, 'SNOW GRAINS'], [80, 'SHOWERS'], [82, 'HEAVY SHOWERS'], [85, 'SNOW SHOWERS'],
  [95, 'THUNDERSTORM'], [99, 'THUNDERSTORM + HAIL'],
];

function wmoLabel(code: number): string {
  let label = 'UNSETTLED';
  for (const [c, l] of WMO) {
    if (code >= c) label = l;
  }
  return label;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

async function fromOpenMeteo(lon: number, lat: number, dateKey: string): Promise<TrailheadWeather> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch' +
    `&timezone=auto&start_date=${dateKey}&end_date=${dateKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();
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
    fetchedOn: todayKey(),
  };
}

async function fromNws(lon: number, lat: number, dateKey: string): Promise<TrailheadWeather> {
  const headers = { 'User-Agent': 'Switchback personal training app', Accept: 'application/geo+json' };
  const ptRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers });
  if (!ptRes.ok) throw new Error(`nws points ${ptRes.status}`);
  const pt = await ptRes.json();
  const fcRes = await fetch(pt.properties.forecast, { headers });
  if (!fcRes.ok) throw new Error(`nws forecast ${fcRes.status}`);
  const fc = await fcRes.json();
  const period = fc.properties.periods.find(
    (p: { isDaytime: boolean; startTime: string }) => p.isDaytime && p.startTime.startsWith(dateKey),
  );
  if (!period) throw new Error('nws: no daytime period for ' + dateKey);
  const windNums = (period.windSpeed.match(/\d+/g) ?? ['0']).map(Number);
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
    fetchedOn: todayKey(),
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const { trailheadId, center, date } = body as {
    trailheadId?: string;
    center?: [number, number];
    date?: string;
  };
  if (!trailheadId || !Array.isArray(center) || center.length !== 2 || !date) {
    return Response.json(
      { error: 'body must be { trailheadId: string, center: [lon, lat], date: "YYYY-MM-DD" }' },
      { status: 400 },
    );
  }
  const [lon, lat] = center;

  // Fresh cache hit → serve without touching upstream.
  const { data: cached } = await supabase
    .from('weather_cache')
    .select('payload, fetched_at')
    .eq('trailhead_id', trailheadId)
    .eq('forecast_date', date)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return Response.json({ weather: cached.payload, stale: false });
  }

  for (const source of [fromOpenMeteo, fromNws]) {
    try {
      const weather = await source(lon, lat, date);
      await supabase
        .from('weather_cache')
        .upsert({ trailhead_id: trailheadId, forecast_date: date, payload: weather, fetched_at: new Date().toISOString() });
      return Response.json({ weather, stale: false });
    } catch {
      // Try the next source; fall through to a stale cache row if both fail.
    }
  }

  if (cached) {
    return Response.json({ weather: cached.payload, stale: true });
  }
  return Response.json({ weather: null, stale: false });
});
