import Mapbox from '@rnmapbox/maps';

// Public access token (pk.…) — safe to ship, like the Supabase anon key.
// Set EXPO_PUBLIC_MAPBOX_TOKEN in .env / EAS env. Distinct from the secret
// download token (sk.…) that only the native build uses (see app.config.ts).
const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

export const MAPBOX_READY = token.length > 0;

// Outdoors style (contours + trails on parchment tones) — fits the Ranger
// Poster language. Swap for a custom Studio style URL to push it further.
export const MAP_STYLE_URL = 'mapbox://styles/mapbox/outdoors-v12';

let configured = false;

export function initMapbox(): void {
  if (configured || !MAPBOX_READY) {
    return;
  }
  Mapbox.setAccessToken(token);
  configured = true;
}
