import * as Crypto from 'expo-crypto';

import { initSchedule, notifyDataChanged } from '@/data/store';
import { db, upsertLocal, type SyncedTable } from '@/lib/db';
import { syncSaturdayRuckNotification } from '@/lib/ruck-notify';
import { anchorMaxes } from '@/program/estimator';
import { DEFAULT_GOAL_WEIGHT_LB, DEFAULT_START_WEIGHT_LB } from '@/program/goals';
import type { Anchor, Equipment, Experience } from '@/program/lifts';
import type { Activity, Sex } from '@/program/nutrition';
import { type GoalParams, keyOf, todayDate, type TripConfig } from '@/program/schedule';
import { enqueueLocal, syncNow } from '@/sync/engine';
import type { Trail } from './trails';

// All writes go through here — SQLite first, then the outbox, then a store
// notification so the UI re-reads. Date keys are local-time yyyy-mm-dd.

const nowIso = () => new Date().toISOString();
const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

/** The Sunday on-or-before today, yyyy-mm-dd — the week-1 anchor for a new
 *  enrollment. Program weeks run Sun–Sat, so anchoring to a Sunday keeps the
 *  dateOf()/weekOfKey() calendar math aligned. */
function weekAnchorKey(): string {
  const t = todayDate();
  const sun = new Date(t);
  sun.setDate(sun.getDate() - t.getDay());
  return keyOf(sun);
}

function write(table: SyncedTable, row: Record<string, unknown>): void {
  // Atomic: a process kill between the local write and the outbox insert
  // must never leave one committed without the other.
  db.withTransactionSync(() => {
    upsertLocal(table, row);
    enqueueLocal(table, row);
  });
  void syncNow();
  notifyDataChanged();
}

/** Deterministic id for a natural-key row: same seed -> same id, so two
 *  offline devices (or a fresh install racing the initial pull) that create
 *  a row for the same natural key land on identical ids instead of colliding
 *  on push — the server upsert resolves conflicts on this primary key, not
 *  the table's separate natural-key unique constraint. Only used as the
 *  fallback when no local row exists yet; an already-synced row keeps
 *  whatever id it already has. Fine under this app's single-user scope (see
 *  the migrations' "single user today" note) — a second real account would
 *  need user_id folded into the seed too. */
function deriveId(seed: string): string {
  const fnv = (salt: string) => {
    let h = 0x811c9dc5 ^ salt.length;
    const s = salt + seed;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  const hex = fnv('a') + fnv('b') + fnv('c') + fnv('d');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Reuse the row id for a natural key so re-logging never duplicates. */
function existingId(sql: string, param: string, seed: string): string {
  const row = db.getFirstSync<{ id: string }>(sql, [param]);
  return row?.id ?? deriveId(seed);
}

export function completeWorkout(dateKey: string, details: object = {}): void {
  write('workout_completions', {
    id: existingId(
      'select id from workout_completions where workout_date = ?',
      dateKey,
      `workout_completions:${dateKey}`,
    ),
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
    id: existingId(
      'select id from weight_entries where measured_on = ?',
      dateKey,
      `weight_entries:${dateKey}`,
    ),
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
      `calorie_entries:${dateKey}`,
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

/** Add to today's calorie total atomically: reads the current SQLite value
 *  and writes the sum in one call, so two rapid taps on "+ ADD" (a double
 *  tap landing before the parent re-renders with the updated total prop)
 *  can't both add against the same stale total and clobber one another. */
export function addDailyCalories(dateKey: string, delta: number): void {
  const existing = db.getFirstSync<{ id: string; calories: number }>(
    'select id, calories from calorie_entries where logged_on = ? and deleted_at is null',
    [dateKey],
  );
  write('calorie_entries', {
    id: existing?.id ?? deriveId(`calorie_entries:${dateKey}`),
    logged_on: dateKey,
    label: null,
    calories: (existing?.calories ?? 0) + delta,
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
    id: deriveId(`earned_badges:${badgeKey}`),
    badge_key: badgeKey,
    earned_at: earnedOnKey ? earnedOnKey + 'T00:00:00.000Z' : nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  });
}

/** Logging a hike also marks that day's workout complete (design behavior). */
export function logHike(trail: Trail, dateKey: string): void {
  write('hike_logs', {
    id: existingId(
      'select id from hike_logs where hiked_on = ?',
      dateKey,
      `hike_logs:${dateKey}`,
    ),
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
  /** THE OBJECTIVE; null = stock 26-week program. */
  trip: TripConfig | null;
}

function profileId(): string {
  // Prefer the synced/completed profile row so saves update it rather than
  // racing the server's unique(user_id) with a second id. The fallback is
  // deterministic (not a fresh random uuid): a fresh install saving onboarding
  // before the initial pull has downloaded a pre-existing server profile must
  // land on the SAME id that profile already has, or the push collides with
  // the server's unique(user_id) on a mismatched id and wedges the sync loop.
  const row = db.getFirstSync<{ id: string }>(
    'select id from user_profile order by onboarding_complete desc, updated_at desc limit 1',
  );
  return row?.id ?? deriveId('user_profile:singleton');
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
    trip_name: input.trip?.name ?? null,
    trip_date: input.trip?.date ?? null,
    trip_style: input.trip?.style ?? null,
    trip_gain_ft: input.trip?.biggestDayGainFt ?? null,
    trip_pack_lb: input.trip?.packWeightLb ?? null,
    trip_max_alt_ft: input.trip?.maxAltitudeFt ?? null,
    onboarding_complete: onboardingComplete,
    updated_at: nowIso(),
    deleted_at: null,
  });

  // Enrollment: the week-1 anchor + goal targets + pinned program version.
  // start_date is set once (the Sunday of the week the user first enrolled —
  // the default seed already holds it) and preserved across re-saves so
  // recalibration never resets the clock. program_id pins the latest available
  // version at first enrollment and is preserved thereafter, so a re-seed never
  // moves a mid-program user onto a newer template.
  const existingEnr = db.getFirstSync<{ id: string; program_id: string | null; start_date: string }>(
    'select id, program_id, start_date from program_enrollments where deleted_at is null order by updated_at desc limit 1',
  );
  const goalParams: GoalParams = {
    startWeightLb: DEFAULT_START_WEIGHT_LB,
    goalWeightLb: DEFAULT_GOAL_WEIGHT_LB,
  };
  write('program_enrollments', {
    id: existingEnr?.id ?? deriveId('program_enrollments:singleton'),
    program_id: existingEnr?.program_id ?? latestProgramId(),
    start_date: existingEnr?.start_date ?? weekAnchorKey(),
    goal_params: goalParams,
    updated_at: nowIso(),
    deleted_at: null,
  });

  // Re-anchor the calendar from the freshly written rows (start + goals +
  // pinned template params), then refresh Saturday's alert so a trip edit
  // reschedules it with the new week/prescription.
  initSchedule();
  void syncSaturdayRuckNotification();
}

/** The newest locally-known program version to pin a new enrollment to, or null
 *  when none has synced yet (the engine then falls back to the in-code builder,
 *  which is byte-identical to the stock seed). */
function latestProgramId(): string | null {
  const row = db.getFirstSync<{ id: string }>('select id from programs order by version desc limit 1');
  return row?.id ?? null;
}

/** Seed a conservative default profile on first run so weights render before
 *  onboarding. LOCAL-ONLY (never enqueued) with an epoch timestamp: a real
 *  profile pulled from the server always wins LWW, and the seed can never
 *  collide with the server's unique(user_id) from a second device. */
export function ensureDefaultProfile(): void {
  ensureDefaultEnrollment();
  const existing = db.getFirstSync<{ id: string }>('select id from user_profile where deleted_at is null');
  if (existing) return;
  const maxes = anchorMaxes({ bodyweightLb: DEFAULT_START_WEIGHT_LB, experience: 'new', calibration: {} });
  upsertLocal('user_profile', {
    id: Crypto.randomUUID(),
    bodyweight_lb: DEFAULT_START_WEIGHT_LB,
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
    trip_name: null,
    trip_date: null,
    trip_style: null,
    trip_gain_ft: null,
    trip_pack_lb: null,
    trip_max_alt_ft: null,
    onboarding_complete: false,
    updated_at: EPOCH_ISO,
    deleted_at: null,
  });
  notifyDataChanged();
}

/** Seed a local-only default enrollment so the calendar anchors to THIS week
 *  (week 1 = now) from first boot, rather than the stock 2026-07-05. Epoch
 *  timestamp + never enqueued: a real enrollment pulled from the server always
 *  wins LWW, and this can never collide with the server's unique(user_id). */
function ensureDefaultEnrollment(): void {
  const existing = db.getFirstSync<{ id: string }>(
    'select id from program_enrollments where deleted_at is null',
  );
  if (existing) return;
  upsertLocal('program_enrollments', {
    id: deriveId('program_enrollments:singleton'),
    program_id: null,
    start_date: weekAnchorKey(),
    goal_params: { startWeightLb: DEFAULT_START_WEIGHT_LB, goalWeightLb: DEFAULT_GOAL_WEIGHT_LB },
    updated_at: EPOCH_ISO,
    deleted_at: null,
  });
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
    id: existing?.id ?? deriveId(`exercise_logs:${p.logDate}:${p.exerciseId}`),
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
