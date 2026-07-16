import * as Crypto from 'expo-crypto';

import { notifyDataChanged } from '@/data/store';
import { db, upsertLocal, type SyncedTable } from '@/lib/db';
import { anchorMaxes } from '@/program/estimator';
import type { Anchor, Equipment, Experience } from '@/program/lifts';
import type { Activity, Sex } from '@/program/nutrition';
import { START_WEIGHT_LB } from '@/program/goals';
import { enqueue } from '@/sync/engine';
import type { Trail } from './trails';

// All writes go through here — SQLite first, then the outbox, then a store
// notification so the UI re-reads. Date keys are local-time yyyy-mm-dd.

const nowIso = () => new Date().toISOString();

function write(table: SyncedTable, row: Record<string, unknown>): void {
  upsertLocal(table, row);
  enqueue(table, row);
  notifyDataChanged();
}

/** Reuse the row id for a natural key so re-logging never duplicates. */
function existingId(sql: string, param: string): string {
  const row = db.getFirstSync<{ id: string }>(sql, [param]);
  return row?.id ?? Crypto.randomUUID();
}

export function completeWorkout(dateKey: string, details: object = {}): void {
  write('workout_completions', {
    id: existingId('select id from workout_completions where workout_date = ?', dateKey),
    workout_date: dateKey,
    program_version: 1,
    details,
    completed_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  });
}

export function uncompleteWorkout(dateKey: string): void {
  const row = db.getFirstSync<{ id: string; details: string; completed_at: string }>(
    'select id, details, completed_at from workout_completions where workout_date = ?',
    [dateKey],
  );
  if (row) {
    write('workout_completions', {
      id: row.id,
      workout_date: dateKey,
      program_version: 1,
      details: JSON.parse(row.details || '{}'),
      completed_at: row.completed_at,
      updated_at: nowIso(),
      deleted_at: nowIso(),
    });
  }
}

export function logWeight(dateKey: string, weightLbs: number): void {
  write('weight_entries', {
    id: existingId('select id from weight_entries where measured_on = ?', dateKey),
    measured_on: dateKey,
    weight_lbs: weightLbs,
    updated_at: nowIso(),
    deleted_at: null,
  });
}

/** One total per day, like the design's calorie log. */
export function setDailyCalories(dateKey: string, calories: number): void {
  write('calorie_entries', {
    id: existingId(
      'select id from calorie_entries where logged_on = ? and deleted_at is null',
      dateKey,
    ),
    logged_on: dateKey,
    label: null,
    calories,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    updated_at: nowIso(),
    deleted_at: null,
  });
}

// -- Personal food library (my_foods) ----------------------------------------
// Frequent items live locally so food logging works offline and the USDA /
// Open Food Facts lookups (src/lib/food-api.ts) stay rare.

export interface MyFood {
  id: string;
  label: string;
  brand: string | null;
  servingDesc: string | null;
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: 'usda' | 'off' | 'manual';
  sourceId: string | null;
  barcode: string | null;
  useCount: number;
}

interface MyFoodRow {
  id: string;
  label: string;
  brand: string | null;
  serving_desc: string | null;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: string;
  source_id: string | null;
  barcode: string | null;
  use_count: number;
}

const foodFromRow = (r: MyFoodRow): MyFood => ({
  id: r.id,
  label: r.label,
  brand: r.brand,
  servingDesc: r.serving_desc,
  kcal: r.kcal,
  proteinG: r.protein_g,
  carbsG: r.carbs_g,
  fatG: r.fat_g,
  source: (r.source as MyFood['source']) ?? 'manual',
  sourceId: r.source_id,
  barcode: r.barcode,
  useCount: r.use_count,
});

const MY_FOOD_COLS =
  'id, label, brand, serving_desc, kcal, protein_g, carbs_g, fat_g, source, source_id, barcode, use_count';

/** Library matches for a query — most-used first; empty query = top foods. */
export function searchMyFoods(q: string, limit = 6): MyFood[] {
  const rows = q.trim()
    ? db.getAllSync<MyFoodRow>(
        `select ${MY_FOOD_COLS} from my_foods
         where deleted_at is null and (label like ? or brand like ?)
         order by use_count desc, updated_at desc limit ?`,
        [`%${q.trim()}%`, `%${q.trim()}%`, limit],
      )
    : db.getAllSync<MyFoodRow>(
        `select ${MY_FOOD_COLS} from my_foods
         where deleted_at is null order by use_count desc, updated_at desc limit ?`,
        [limit],
      );
  return rows.map(foodFromRow);
}

/** Upsert a food into the library (dedupe by source id, then label) and count
 *  the use. Values may differ from the source's — edits are the point (Open
 *  Food Facts is crowd-sourced). */
export function saveMyFoodUse(food: Omit<MyFood, 'id' | 'useCount'>): void {
  const existing = food.sourceId
    ? db.getFirstSync<{ id: string; use_count: number }>(
        'select id, use_count from my_foods where source = ? and source_id = ? and deleted_at is null',
        [food.source, food.sourceId],
      )
    : db.getFirstSync<{ id: string; use_count: number }>(
        'select id, use_count from my_foods where label = ? and deleted_at is null',
        [food.label],
      );
  write('my_foods', {
    id: existing?.id ?? Crypto.randomUUID(),
    label: food.label,
    brand: food.brand,
    serving_desc: food.servingDesc,
    kcal: food.kcal,
    protein_g: food.proteinG,
    carbs_g: food.carbsG,
    fat_g: food.fatG,
    source: food.source,
    source_id: food.sourceId,
    barcode: food.barcode,
    use_count: (existing?.use_count ?? 0) + 1,
    updated_at: nowIso(),
    deleted_at: null,
  });
}

/** Earn dates are permanent; earnedOnKey preserves back-dated earns (e.g. lb_5). */
export function awardBadge(badgeKey: string, earnedOnKey?: string): void {
  const existing = db.getFirstSync<{ id: string }>(
    'select id from earned_badges where badge_key = ? and deleted_at is null',
    [badgeKey],
  );
  if (existing) {
    return;
  }
  write('earned_badges', {
    id: Crypto.randomUUID(),
    badge_key: badgeKey,
    earned_at: earnedOnKey ? earnedOnKey + 'T00:00:00.000Z' : nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  });
}

/** Logging a hike also marks that day's workout complete (design behavior). */
export function logHike(trail: Trail, dateKey: string): void {
  write('hike_logs', {
    id: existingId('select id from hike_logs where hiked_on = ?', dateKey),
    trail_id: trail.id,
    name: trail.name,
    hiked_on: dateKey,
    distance_mi: trail.dist,
    gain_ft: trail.gain,
    duration_min: null,
    pack_lbs: null,
    notes: null,
    updated_at: nowIso(),
    deleted_at: null,
  });
  completeWorkout(dateKey, { hike: trail.id });
}

// -- Onboarding profile -----------------------------------------------------

export interface ProfileInput {
  bodyweightLb: number;
  experience: Experience;
  equipment: Equipment;
  calibration: Partial<Record<Anchor, number>>;
  // Fuel stats; null = not provided (Fuel tab uses the design defaults).
  heightIn: number | null;
  ageYears: number | null;
  sex: Sex | null;
  activity: Activity | null;
}

function profileId(): string {
  // Prefer the synced/completed profile row so saves update it rather than
  // racing the server's unique(user_id) with a second id.
  const row = db.getFirstSync<{ id: string }>(
    'select id from user_profile order by onboarding_complete desc, updated_at desc limit 1',
  );
  return row?.id ?? Crypto.randomUUID();
}

export function saveProfile(input: ProfileInput, onboardingComplete = true): void {
  const maxes = anchorMaxes({
    bodyweightLb: input.bodyweightLb,
    experience: input.experience,
    calibration: input.calibration,
  });
  write('user_profile', {
    id: profileId(),
    bodyweight_lb: input.bodyweightLb,
    experience: input.experience,
    equipment: input.equipment,
    squat_max_lb: maxes.squat,
    deadlift_max_lb: maxes.deadlift,
    press_max_lb: maxes.press,
    row_max_lb: maxes.row,
    calibration: input.calibration,
    height_in: input.heightIn,
    age_years: input.ageYears,
    sex: input.sex,
    activity: input.activity,
    onboarding_complete: onboardingComplete,
    updated_at: nowIso(),
    deleted_at: null,
  });
}

/** Seed a conservative default profile on first run so weights render before
 *  onboarding. LOCAL-ONLY (never enqueued) with an epoch timestamp: a real
 *  profile pulled from the server always wins LWW, and the seed can never
 *  collide with the server's unique(user_id) from a second device. */
export function ensureDefaultProfile(): void {
  const existing = db.getFirstSync<{ id: string }>('select id from user_profile where deleted_at is null');
  if (existing) return;
  const maxes = anchorMaxes({ bodyweightLb: START_WEIGHT_LB, experience: 'new', calibration: {} });
  upsertLocal('user_profile', {
    id: Crypto.randomUUID(),
    bodyweight_lb: START_WEIGHT_LB,
    experience: 'new',
    equipment: 'full_gym',
    squat_max_lb: maxes.squat,
    deadlift_max_lb: maxes.deadlift,
    press_max_lb: maxes.press,
    row_max_lb: maxes.row,
    calibration: {},
    height_in: null,
    age_years: null,
    sex: null,
    activity: null,
    onboarding_complete: false,
    updated_at: '1970-01-01T00:00:00.000Z',
    deleted_at: null,
  });
  notifyDataChanged();
}

// -- Per-set strength logging -----------------------------------------------

export interface SetInput {
  weight: number;
  reps: number;
  done?: boolean;
}

export function logExerciseSets(p: {
  logDate: string;
  exerciseId: string;
  exerciseName: string;
  week: number;
  phase: string;
  repTarget: number;
  setTarget: number;
  suggestedWeightLb: number | null;
  sets: SetInput[];
}): void {
  const existing = db.getFirstSync<{ id: string }>(
    'select id from exercise_logs where log_date = ? and exercise_id = ?',
    [p.logDate, p.exerciseId],
  );
  write('exercise_logs', {
    id: existing?.id ?? Crypto.randomUUID(),
    log_date: p.logDate,
    exercise_id: p.exerciseId,
    exercise_name: p.exerciseName,
    week: p.week,
    phase: p.phase,
    rep_target: p.repTarget,
    set_target: p.setTarget,
    suggested_weight_lb: p.suggestedWeightLb,
    sets: p.sets,
    updated_at: nowIso(),
    deleted_at: null,
  });
}
