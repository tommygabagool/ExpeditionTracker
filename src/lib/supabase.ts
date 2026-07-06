import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Null until .env is configured — the app runs local-only and the sync engine idles.
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export async function signIn(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured — set EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in .env');
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function hasSession(): Promise<boolean> {
  if (!supabase) {
    return false;
  }
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}
