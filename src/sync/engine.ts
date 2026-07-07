import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { notifyDataChanged } from '@/data/store';
import { db, getLocalUpdatedAt, upsertLocal, type SyncedTable } from '@/lib/db';
import { supabase } from '@/lib/supabase';

// Offline-first sync: SQLite is the source of truth for the UI; every local
// write lands in `outbox` and is pushed as an idempotent upsert (client
// UUIDs). Pulls walk an updated_at cursor per table with an overlap window;
// conflicts resolve last-write-wins by updated_at.

const PUSHED_TABLES: SyncedTable[] = [
  'workout_completions',
  'weight_entries',
  'calorie_entries',
  'earned_badges',
  'hike_logs',
  'user_profile',
  'exercise_logs',
];
const PULLED_TABLES: SyncedTable[] = [...PUSHED_TABLES, 'programs', 'program_days'];

const OVERLAP_MS = 5 * 60_000;
const EPOCH = '1970-01-01T00:00:00.000Z';
const PAGE_SIZE = 500;

let syncing = false;

export function enqueue(table: SyncedTable, row: Record<string, unknown>): void {
  db.runSync(
    'insert into outbox (table_name, row_id, payload, queued_at) values (?, ?, ?, ?)',
    [table, String(row.id), JSON.stringify(row), new Date().toISOString()],
  );
  void syncNow();
}

export async function syncNow(): Promise<void> {
  if (syncing || !supabase) {
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return;
  }
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    return;
  }
  syncing = true;
  try {
    await pushOutbox();
    await pullAll();
    notifyDataChanged();
  } catch (err) {
    console.warn('[sync] failed, will retry on next trigger', err);
  } finally {
    syncing = false;
  }
}

async function pushOutbox(): Promise<void> {
  for (const table of PUSHED_TABLES) {
    const rows = db.getAllSync<{ seq: number; row_id: string; payload: string }>(
      'select seq, row_id, payload from outbox where table_name = ? order by seq',
      [table],
    );
    if (rows.length === 0) {
      continue;
    }
    // Keep only the latest payload per row id — upserting the same PK twice in
    // one statement is a Postgres error, and the last write wins anyway.
    const latest = new Map<string, string>();
    for (const row of rows) {
      latest.set(row.row_id, row.payload);
    }
    const payloads = [...latest.values()].map((p) => JSON.parse(p));
    const { error } = await supabase!.from(table).upsert(payloads);
    if (error) {
      throw error;
    }
    db.runSync('delete from outbox where table_name = ? and seq <= ?', [
      table,
      rows[rows.length - 1].seq,
    ]);
  }
}

async function pullAll(): Promise<void> {
  for (const table of PULLED_TABLES) {
    const state = db.getFirstSync<{ last_pulled_at: string }>(
      'select last_pulled_at from sync_state where table_name = ?',
      [table],
    );
    let cursor = state?.last_pulled_at ?? EPOCH;
    let since = state
      ? new Date(Date.parse(state.last_pulled_at) - OVERLAP_MS).toISOString()
      : EPOCH;

    for (;;) {
      const { data, error } = await supabase!
        .from(table)
        .select('*')
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(PAGE_SIZE);
      if (error) {
        throw error;
      }
      for (const remote of data) {
        const localUpdatedAt = getLocalUpdatedAt(table, remote.id);
        // Local-newer rows win here; their outbox entry pushes them up later.
        if (!localUpdatedAt || Date.parse(localUpdatedAt) <= Date.parse(remote.updated_at)) {
          upsertLocal(table, remote);
        }
      }
      if (data.length > 0) {
        const lastUpdatedAt = data[data.length - 1].updated_at as string;
        if (Date.parse(lastUpdatedAt) > Date.parse(cursor)) {
          cursor = lastUpdatedAt;
        }
        since = lastUpdatedAt;
      }
      if (data.length < PAGE_SIZE) {
        break;
      }
    }

    db.runSync(
      `insert into sync_state (table_name, last_pulled_at) values (?, ?)
       on conflict (table_name) do update set last_pulled_at = excluded.last_pulled_at`,
      [table, cursor],
    );
  }
}

/** Wire connectivity/foreground/auth triggers. Returns a cleanup function. */
export function startSyncEngine(): () => void {
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void syncNow();
    }
  });
  const appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void syncNow();
    }
  });
  const authSub = supabase?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
      void syncNow();
    }
  });
  void syncNow();
  return () => {
    unsubscribeNet();
    appStateSub.remove();
    authSub?.data.subscription.unsubscribe();
  };
}
