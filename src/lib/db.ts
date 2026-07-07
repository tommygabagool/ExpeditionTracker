import * as SQLite from 'expo-sqlite';

// Local mirror of supabase/migrations/0001_init.sql. user_id stays server-side
// (this device is single-user); timestamps are ISO-8601 UTC strings.
export const db = SQLite.openDatabaseSync('expedition.db');

db.execSync(`
pragma journal_mode = WAL;

create table if not exists workout_completions (
  id text primary key,
  workout_date text not null unique,
  program_version integer not null default 1,
  details text not null default '{}',
  completed_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists weight_entries (
  id text primary key,
  measured_on text not null unique,
  weight_lbs real not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists calorie_entries (
  id text primary key,
  logged_on text not null,
  label text,
  calories integer not null,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  updated_at text not null,
  deleted_at text
);

create table if not exists earned_badges (
  id text primary key,
  badge_key text not null unique,
  earned_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists hike_logs (
  id text primary key,
  trail_id text,
  name text not null,
  hiked_on text not null,
  distance_mi real,
  gain_ft integer,
  duration_min integer,
  pack_lbs real,
  notes text,
  updated_at text not null,
  deleted_at text
);

create table if not exists programs (
  id text primary key,
  name text not null,
  start_date text not null,
  version integer not null,
  updated_at text not null
);

create table if not exists program_days (
  id text primary key,
  program_id text not null,
  week integer not null,
  day integer not null,
  phase text not null,
  is_deload integer not null default 0,
  title text not null,
  blocks text not null default '[]',
  updated_at text not null,
  unique (program_id, week, day)
);

create table if not exists user_profile (
  id text primary key,
  bodyweight_lb real not null default 260,
  experience text not null default 'new',
  equipment text not null default 'full_gym',
  squat_max_lb real,
  deadlift_max_lb real,
  press_max_lb real,
  row_max_lb real,
  calibration text not null default '{}',
  onboarding_complete integer not null default 0,
  updated_at text not null,
  deleted_at text
);

create table if not exists exercise_logs (
  id text primary key,
  log_date text not null,
  exercise_id text not null,
  exercise_name text not null,
  week integer,
  phase text,
  rep_target integer not null,
  set_target integer not null,
  suggested_weight_lb real,
  sets text not null default '[]',
  updated_at text not null,
  deleted_at text,
  unique (log_date, exercise_id)
);

create table if not exists outbox (
  seq integer primary key autoincrement,
  table_name text not null,
  row_id text not null,
  payload text not null,
  queued_at text not null
);

create table if not exists sync_state (
  table_name text primary key,
  last_pulled_at text not null
);
`);

export const TABLE_COLUMNS = {
  workout_completions: [
    'id',
    'workout_date',
    'program_version',
    'details',
    'completed_at',
    'updated_at',
    'deleted_at',
  ],
  weight_entries: ['id', 'measured_on', 'weight_lbs', 'updated_at', 'deleted_at'],
  calorie_entries: [
    'id',
    'logged_on',
    'label',
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
    'updated_at',
    'deleted_at',
  ],
  earned_badges: ['id', 'badge_key', 'earned_at', 'updated_at', 'deleted_at'],
  hike_logs: [
    'id',
    'trail_id',
    'name',
    'hiked_on',
    'distance_mi',
    'gain_ft',
    'duration_min',
    'pack_lbs',
    'notes',
    'updated_at',
    'deleted_at',
  ],
  programs: ['id', 'name', 'start_date', 'version', 'updated_at'],
  program_days: [
    'id',
    'program_id',
    'week',
    'day',
    'phase',
    'is_deload',
    'title',
    'blocks',
    'updated_at',
  ],
  user_profile: [
    'id',
    'bodyweight_lb',
    'experience',
    'equipment',
    'squat_max_lb',
    'deadlift_max_lb',
    'press_max_lb',
    'row_max_lb',
    'calibration',
    'onboarding_complete',
    'updated_at',
    'deleted_at',
  ],
  exercise_logs: [
    'id',
    'log_date',
    'exercise_id',
    'exercise_name',
    'week',
    'phase',
    'rep_target',
    'set_target',
    'suggested_weight_lb',
    'sets',
    'updated_at',
    'deleted_at',
  ],
} as const;

export type SyncedTable = keyof typeof TABLE_COLUMNS;

type SqliteValue = string | number | null;

// Serialize server/JS values into SQLite bindings: jsonb objects -> JSON text,
// booleans -> 0/1. Unknown columns (e.g. user_id on pulled rows) are dropped.
function toSqliteValue(value: unknown): SqliteValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value as string | number;
}

export function upsertLocal(table: SyncedTable, row: Record<string, unknown>): void {
  const columns = TABLE_COLUMNS[table].filter((col) => col in row);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((col) => toSqliteValue(row[col]));
  // OR REPLACE also resolves natural-key collisions (e.g. two devices created
  // different ids for the same workout_date) by keeping the incoming row.
  db.runSync(
    `insert or replace into ${table} (${columns.join(', ')}) values (${placeholders})`,
    values,
  );
}

export function getLocalUpdatedAt(table: SyncedTable, id: string): string | null {
  const row = db.getFirstSync<{ updated_at: string }>(
    `select updated_at from ${table} where id = ?`,
    [id],
  );
  return row?.updated_at ?? null;
}
