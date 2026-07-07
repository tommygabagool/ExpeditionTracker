import { useSyncExternalStore } from 'react';

import { db } from '@/lib/db';
import type { AnchorMaxes, LastAttempt } from '@/program/estimator';
import { START_WEIGHT_LB } from '@/program/goals';
import type { Equipment, Experience } from '@/program/lifts';
import { PROGRAM_START } from '@/program/schedule';

// UI-facing snapshot of the local database, in the shapes the design's logic
// used. Repos (and the sync engine after a pull) call notifyDataChanged().

export interface WeightEntry {
  date: string;
  lb: number;
}

export interface Profile {
  bodyweightLb: number;
  experience: Experience;
  equipment: Equipment;
  maxes: AnchorMaxes | null; // null until onboarding computes them
  calibration: Partial<Record<'squat' | 'deadlift' | 'press' | 'row', number>>;
  onboardingComplete: boolean;
}

export interface AppData {
  completions: Record<string, boolean>;
  calories: Record<string, number>;
  weights: WeightEntry[];
  hikes: Record<string, string>; // dateKey -> trail id
  badges: Record<string, string>; // badge id -> earned dateKey
  profile: Profile | null;
  lastAttempts: Record<string, LastAttempt>; // exercise_id -> most recent logged attempt
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

  return {
    completions,
    calories,
    weights,
    hikes,
    badges,
    profile: readProfile(),
    lastAttempts: readLastAttempts(),
  };
}

function readProfile(): Profile | null {
  const r = db.getFirstSync<{
    bodyweight_lb: number;
    experience: string;
    equipment: string;
    squat_max_lb: number | null;
    deadlift_max_lb: number | null;
    press_max_lb: number | null;
    row_max_lb: number | null;
    calibration: string;
    onboarding_complete: number;
  }>('select * from user_profile where deleted_at is null limit 1');
  if (!r) return null;
  const hasMaxes =
    r.squat_max_lb != null && r.deadlift_max_lb != null && r.press_max_lb != null && r.row_max_lb != null;
  return {
    bodyweightLb: r.bodyweight_lb,
    experience: r.experience as Experience,
    equipment: r.equipment as Equipment,
    maxes: hasMaxes
      ? {
          squat: r.squat_max_lb!,
          deadlift: r.deadlift_max_lb!,
          press: r.press_max_lb!,
          row: r.row_max_lb!,
        }
      : null,
    calibration: safeJson(r.calibration, {}),
    onboardingComplete: r.onboarding_complete === 1,
  };
}

interface LoggedSet {
  weight: number;
  reps: number;
}

// Most recent logged attempt per exercise — the seed for self-correction.
function readLastAttempts(): Record<string, LastAttempt> {
  const rows = db.getAllSync<{
    exercise_id: string;
    rep_target: number;
    set_target: number;
    sets: string;
    log_date: string;
  }>(
    `select exercise_id, rep_target, set_target, sets, log_date
     from exercise_logs
     where deleted_at is null
     order by log_date desc`,
  );
  const out: Record<string, LastAttempt> = {};
  for (const r of rows) {
    if (out[r.exercise_id]) continue; // rows are date-desc, so first seen is most recent
    const sets = safeJson<LoggedSet[]>(r.sets, []);
    if (sets.length === 0) continue;
    const workingWeight = Math.max(...sets.map((s) => s.weight));
    const hitSets = sets.filter((s) => s.reps >= r.rep_target).length;
    const totalPrescribed = r.rep_target * r.set_target;
    const totalDone = sets.reduce((acc, s) => acc + s.reps, 0);
    out[r.exercise_id] = {
      workingWeight,
      hitAll: hitSets >= r.set_target,
      fractionReps: totalPrescribed > 0 ? Math.min(1, totalDone / totalPrescribed) : 0,
    };
  }
  return out;
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
