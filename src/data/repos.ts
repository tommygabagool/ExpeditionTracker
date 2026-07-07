import * as Crypto from 'expo-crypto';

import { notifyDataChanged } from '@/data/store';
import { db, upsertLocal, type SyncedTable } from '@/lib/db';
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
