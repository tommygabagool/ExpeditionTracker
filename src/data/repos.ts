import * as Crypto from 'expo-crypto';

import { db, upsertLocal, type SyncedTable } from '@/lib/db';
import { enqueue } from '@/sync/engine';

// All UI reads and writes go through here — SQLite first, then the outbox.
// Dates are ISO yyyy-mm-dd strings; timestamps are ISO-8601 UTC.

const nowIso = () => new Date().toISOString();

function write(table: SyncedTable, row: Record<string, unknown>): void {
  upsertLocal(table, row);
  enqueue(table, row);
}

/** Reuse the row id for a natural key so re-logging never duplicates. */
function existingId(sql: string, param: string): string {
  const row = db.getFirstSync<{ id: string }>(sql, [param]);
  return row?.id ?? Crypto.randomUUID();
}

// -- Workouts ---------------------------------------------------------------

export function completeWorkout(workoutDate: string, details: object = {}): void {
  write('workout_completions', {
    id: existingId('select id from workout_completions where workout_date = ?', workoutDate),
    workout_date: workoutDate,
    program_version: 1,
    details,
    completed_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  });
}

export function uncompleteWorkout(workoutDate: string): void {
  const row = db.getFirstSync<Record<string, unknown>>(
    'select * from workout_completions where workout_date = ?',
    [workoutDate],
  );
  if (row) {
    write('workout_completions', { ...row, deleted_at: nowIso(), updated_at: nowIso() });
  }
}

export function getCompletion(workoutDate: string) {
  return db.getFirstSync<Record<string, unknown>>(
    'select * from workout_completions where workout_date = ? and deleted_at is null',
    [workoutDate],
  );
}

// -- Weight -----------------------------------------------------------------

export function logWeight(measuredOn: string, weightLbs: number): void {
  write('weight_entries', {
    id: existingId('select id from weight_entries where measured_on = ?', measuredOn),
    measured_on: measuredOn,
    weight_lbs: weightLbs,
    updated_at: nowIso(),
    deleted_at: null,
  });
}

export function getWeightEntries() {
  return db.getAllSync<{ measured_on: string; weight_lbs: number }>(
    'select measured_on, weight_lbs from weight_entries where deleted_at is null order by measured_on',
  );
}

// -- Fuel -------------------------------------------------------------------

export interface CalorieEntryInput {
  loggedOn: string;
  label?: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

export function addCalorieEntry(input: CalorieEntryInput): string {
  const id = Crypto.randomUUID();
  write('calorie_entries', {
    id,
    logged_on: input.loggedOn,
    label: input.label ?? null,
    calories: input.calories,
    protein_g: input.proteinG ?? null,
    carbs_g: input.carbsG ?? null,
    fat_g: input.fatG ?? null,
    updated_at: nowIso(),
    deleted_at: null,
  });
  return id;
}

export function removeCalorieEntry(id: string): void {
  const row = db.getFirstSync<Record<string, unknown>>(
    'select * from calorie_entries where id = ?',
    [id],
  );
  if (row) {
    write('calorie_entries', { ...row, deleted_at: nowIso(), updated_at: nowIso() });
  }
}

export function getCalorieEntries(loggedOn: string) {
  return db.getAllSync<Record<string, unknown>>(
    'select * from calorie_entries where logged_on = ? and deleted_at is null order by updated_at',
    [loggedOn],
  );
}

// -- Badges -----------------------------------------------------------------

export function awardBadge(badgeKey: string): void {
  const existing = db.getFirstSync<{ id: string }>(
    'select id from earned_badges where badge_key = ? and deleted_at is null',
    [badgeKey],
  );
  if (existing) {
    return; // earn date is permanent
  }
  write('earned_badges', {
    id: Crypto.randomUUID(),
    badge_key: badgeKey,
    earned_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  });
}

export function getEarnedBadges() {
  return db.getAllSync<{ badge_key: string; earned_at: string }>(
    'select badge_key, earned_at from earned_badges where deleted_at is null order by earned_at',
  );
}

// -- Hikes ------------------------------------------------------------------

export interface HikeLogInput {
  trailId?: string;
  name: string;
  hikedOn: string;
  distanceMi?: number;
  gainFt?: number;
  durationMin?: number;
  packLbs?: number;
  notes?: string;
}

export function logHike(input: HikeLogInput): string {
  const id = Crypto.randomUUID();
  write('hike_logs', {
    id,
    trail_id: input.trailId ?? null,
    name: input.name,
    hiked_on: input.hikedOn,
    distance_mi: input.distanceMi ?? null,
    gain_ft: input.gainFt ?? null,
    duration_min: input.durationMin ?? null,
    pack_lbs: input.packLbs ?? null,
    notes: input.notes ?? null,
    updated_at: nowIso(),
    deleted_at: null,
  });
  return id;
}

export function getHikeLogs() {
  return db.getAllSync<Record<string, unknown>>(
    'select * from hike_logs where deleted_at is null order by hiked_on desc',
  );
}

// -- Program (pull-only; seeded via scripts/seed-program.ts) -----------------

export function getProgramDaysForWeek(week: number) {
  return db.getAllSync<Record<string, unknown>>(
    `select pd.* from program_days pd
     join programs p on p.id = pd.program_id
     where pd.week = ? and p.version = (select max(version) from programs)
     order by pd.day`,
    [week],
  );
}
