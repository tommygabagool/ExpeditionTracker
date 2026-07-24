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
  key text,
  name text not null,
  start_date text,
  version integer not null,
  params text not null default '{}',
  updated_at text not null
);

create table if not exists program_enrollments (
  id text primary key,
  program_id text,
  start_date text not null,
  goal_params text not null default '{}',
  updated_at text not null,
  deleted_at text
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
  height_in real,
  age_years integer,
  sex text,
  activity text,
  trip_name text,
  trip_date text,
  trip_style text,
  trip_gain_ft integer,
  trip_pack_lb real,
  trip_max_alt_ft integer,
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

create table if not exists my_foods (
  id text primary key,
  label text not null,
  brand text,
  serving_desc text,
  kcal integer not null,
  protein_g real,
  carbs_g real,
  fat_g real,
  source text not null default 'manual',
  source_id text,
  barcode text,
  use_count integer not null default 0,
  updated_at text not null,
  deleted_at text
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

-- Local-only key/value bookkeeping (never synced). Tracks the last-synced user
-- id so the sync engine can wipe per-user data when a different user signs in.
create table if not exists meta (
  key text primary key,
  value text not null
);
`);

// 0003: fuel stats — additive columns for databases created before them.
{
  const existing = db
    .getAllSync<{ name: string }>('pragma table_info(user_profile)')
    .map((r) => r.name);
  const added: [string, string][] = [
    ['height_in', 'height_in real'],
    ['age_years', 'age_years integer'],
    ['sex', 'sex text'],
    ['activity', 'activity text'],
  ];
  for (const [col, ddl] of added) {
    if (!existing.includes(col)) db.execSync(`alter table user_profile add column ${ddl}`);
  }
}

// 0005: trip objective — additive columns for databases created before them.
{
  const existing = db
    .getAllSync<{ name: string }>('pragma table_info(user_profile)')
    .map((r) => r.name);
  const added: [string, string][] = [
    ['trip_name', 'trip_name text'],
    ['trip_date', 'trip_date text'],
    ['trip_style', 'trip_style text'],
    ['trip_gain_ft', 'trip_gain_ft integer'],
    ['trip_pack_lb', 'trip_pack_lb real'],
    ['trip_max_alt_ft', 'trip_max_alt_ft integer'],
  ];
  for (const [col, ddl] of added) {
    if (!existing.includes(col)) db.execSync(`alter table user_profile add column ${ddl}`);
  }
}

// 0006: shared program catalog columns — additive for pre-existing databases.
{
  const existing = db
    .getAllSync<{ name: string }>('pragma table_info(programs)')
    .map((r) => r.name);
  const added: [string, string][] = [
    ['key', 'key text'],
    ['params', "params text not null default '{}'"],
  ];
  for (const [col, ddl] of added) {
    if (!existing.includes(col)) db.execSync(`alter table programs add column ${ddl}`);
  }
}

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
  programs: ['id', 'key', 'name', 'start_date', 'version', 'params', 'updated_at'],
  program_enrollments: ['id', 'program_id', 'start_date', 'goal_params', 'updated_at', 'deleted_at'],
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
    'height_in',
    'age_years',
    'sex',
    'activity',
    'trip_name',
    'trip_date',
    'trip_style',
    'trip_gain_ft',
    'trip_pack_lb',
    'trip_max_alt_ft',
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
  my_foods: [
    'id',
    'label',
    'brand',
    'serving_desc',
    'kcal',
    'protein_g',
    'carbs_g',
    'fat_g',
    'source',
    'source_id',
    'barcode',
    'use_count',
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
