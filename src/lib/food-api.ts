import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

// Remote food lookups — the app's only runtime nutrition network calls, both
// via Supabase edge functions and both cached hard in AsyncStorage (searches
// a week, barcodes a month). The personal my_foods library (see repos.ts) is
// always consulted first by the UI, so these should fire rarely. Offline or
// signed-out, lookups quietly return nothing and the local library carries.

export interface FoodHit {
  label: string;
  brand: string | null;
  /** Human serving the values describe, e.g. '1 bar (68 g)' or '100 g'. */
  servingDesc: string | null;
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: 'usda' | 'off';
  sourceId: string;
  barcode: string | null;
}

const SEARCH_TTL_MS = 7 * 86_400_000;
const BARCODE_TTL_MS = 30 * 86_400_000;
const NETWORK_TIMEOUT_MS = 10_000;

interface CacheEntry<T> {
  at: number;
  value: T;
}

/** A stalled connection must not hang the caller forever — food-lookup.tsx
 *  flips `busy` back off only when this settles. */
function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('food lookup timed out')), NETWORK_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

async function cached<T>(key: string, ttlMs: number, miss: () => Promise<T>): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (Date.now() - entry.at < ttlMs) return entry.value;
    }
  } catch {
    // Unreadable cache — fall through to the network.
  }
  const value = await withTimeout(miss());
  await AsyncStorage.setItem(key, JSON.stringify({ at: Date.now(), value })).catch(() => {});
  return value;
}

/** USDA FoodData Central search (via the food-search edge function). */
export async function searchFoods(q: string): Promise<FoodHit[]> {
  const query = q.trim().toLowerCase();
  const client = supabase;
  if (!client || query.length < 2) return [];
  try {
    return await cached(`food-q:${query}`, SEARCH_TTL_MS, async () => {
      const { data, error } = await client.functions.invoke('food-search', {
        body: { q: query },
      });
      if (error) throw error;
      return (data as { hits: FoodHit[] }).hits;
    });
  } catch {
    return []; // offline / signed out / function not deployed — library only
  }
}

/** Open Food Facts barcode lookup (via the food-barcode edge function). */
export async function lookupBarcode(code: string): Promise<FoodHit | null> {
  const client = supabase;
  if (!client) return null;
  try {
    return await cached(`food-bc:${code}`, BARCODE_TTL_MS, async () => {
      const { data, error } = await client.functions.invoke('food-barcode', {
        body: { code },
      });
      if (error) throw error;
      return (data as { hit: FoodHit | null }).hit;
    });
  } catch {
    return null;
  }
}
