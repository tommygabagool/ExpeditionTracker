import * as Location from 'expo-location';

// Device location for "trails near me". Foreground-only, read on demand — the
// app never tracks in the background. Every path is defensive: a denial or
// failure returns null and the caller falls back to the curated trail set.

export interface Coords {
  lat: number;
  lon: number;
}

/** Current position, requesting foreground permission on first use. Prefers a
 *  cached last-known fix for speed, then a fresh reading. Null when denied or
 *  unavailable. */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync();
    const pos =
      last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    if (!pos) return null;
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Whether foreground location is already granted (no prompt). */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
