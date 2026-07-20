import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut' | 'unconfigured';

/**
 * Reflects the Supabase auth state. 'unconfigured' (no .env keys) means the
 * app runs local-only and no login gate is shown.
 */
export function useSession(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>(supabase ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(
      ({ data }) => {
        if (mounted) {
          setStatus(data.session ? 'signedIn' : 'signedOut');
        }
      },
      () => {
        // A rejected initial check must not leave the app gated on 'loading'
        // forever — fall back to signed-out (Login/offline mode is reachable).
        if (mounted) {
          setStatus('signedOut');
        }
      },
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setStatus(session ? 'signedIn' : 'signedOut');
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return status;
}
