import { useSyncExternalStore } from 'react';

import { db } from '@/lib/db';
import { START_WEIGHT_LB } from '@/program/goals';
import { PROGRAM_START } from '@/program/schedule';

// UI-facing snapshot of the local database, in the shapes the design's logic
// used. Repos (and the sync engine after a pull) call notifyDataChanged().

export interface WeightEntry {
  date: string;
  lb: number;
}

export interface AppData {
  completions: Record<string, boolean>;
  calories: Record<string, number>;
  weights: WeightEntry[];
  hikes: Record<string, string>; // dateKey -> trail id
  badges: Record<string, string>; // badge id -> earned dateKey
}

let version = 0;
let cached: AppData | null = null;
let cachedVersion = -1;
const listeners = new Set<() => void>();

export function notifyDataChanged(): void {
  version++;
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readAll(): AppData {
  const completions: AppData['completions'] = {};
  for (const r of db.getAllSync<{ workout_date: string }>(
    'select workout_date from workout_completions where deleted_at is null',
  )) {
    completions[r.workout_date] = true;
  }

  const calories: AppData['calories'] = {};
  for (const r of db.getAllSync<{ logged_on: string; calories: number }>(
    'select logged_on, calories from calorie_entries where deleted_at is null order by updated_at',
  )) {
    calories[r.logged_on] = r.calories; // one entry per day; latest write wins
  }

  const weights: WeightEntry[] = db
    .getAllSync<{ measured_on: string; weight_lbs: number }>(
      'select measured_on, weight_lbs from weight_entries where deleted_at is null order by measured_on',
    )
    .map((r) => ({ date: r.measured_on, lb: r.weight_lbs }));
  if (!weights.some((w) => w.date === PROGRAM_START)) {
    // Virtual day-zero point so the chart always anchors at the start weight.
    weights.unshift({ date: PROGRAM_START, lb: START_WEIGHT_LB });
    weights.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  const hikes: AppData['hikes'] = {};
  for (const r of db.getAllSync<{ hiked_on: string; trail_id: string | null }>(
    'select hiked_on, trail_id from hike_logs where deleted_at is null order by updated_at',
  )) {
    if (r.trail_id) hikes[r.hiked_on] = r.trail_id;
  }

  const badges: AppData['badges'] = {};
  for (const r of db.getAllSync<{ badge_key: string; earned_at: string }>(
    'select badge_key, earned_at from earned_badges where deleted_at is null',
  )) {
    badges[r.badge_key] = r.earned_at.slice(0, 10);
  }

  return { completions, calories, weights, hikes, badges };
}

function getSnapshot(): AppData {
  if (cachedVersion !== version) {
    cached = readAll();
    cachedVersion = version;
  }
  return cached!;
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot);
}
