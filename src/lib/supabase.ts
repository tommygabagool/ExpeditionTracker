import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

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
          // PKCE so the magic link comes back as ?code=… we can exchange
          // in-app (the code verifier lives in AsyncStorage on this device).
          flowType: 'pkce',
        },
      })
    : null;

function requireClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured — set EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in .env');
  }
  return supabase;
}

export async function signIn(email: string, password: string) {
  const { error } = await requireClient().auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

/**
 * Magic-link sign-in/sign-up: emails a link (and, if the template includes
 * {{ .Token }}, a 6-digit code). A new email auto-creates the account.
 * Requires `expedition://auth-callback` in the Supabase redirect allowlist.
 */
export async function sendMagicLink(email: string) {
  const { error } = await requireClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: Linking.createURL('auth-callback'),
    },
  });
  if (error) {
    throw error;
  }
}

/** The typed-code path — works even if the link opens on the wrong device. */
export async function verifyEmailCode(email: string, token: string) {
  const { error } = await requireClient().auth.verifyOtp({ email: email, token, type: 'email' });
  if (error) {
    throw error;
  }
}

/**
 * Complete a magic-link sign-in from an incoming deep link. Returns true when
 * the URL produced a session; silently false for unrelated URLs.
 */
export async function handleAuthUrl(incoming: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }
  try {
    const code = Linking.parse(incoming).queryParams?.code;
    if (typeof code === 'string' && code.length > 0) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return !error;
    }
    // Implicit-flow fallback: tokens arrive in the URL fragment.
    const frag = incoming.split('#')[1];
    if (frag) {
      const params = new URLSearchParams(frag);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        return !error;
      }
    }
  } catch {
    // Malformed or unrelated URL — not ours to handle.
  }
  return false;
}

export async function hasSession(): Promise<boolean> {
  if (!supabase) {
    return false;
  }
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}
