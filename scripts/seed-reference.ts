// Seeds the SHARED reference catalogs (exercises, trails, peaks) from the app's
// in-bundle data into Supabase (migration 0008). These are read-only reference
// tables — written only by this service-role script. Re-runnable: every row is
// upserted by id. Run with: npm run seed:reference
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// The app still reads the in-bundle copies at runtime; this makes the DB the
// server-side source of record so the catalogs can be corrected without an app
// release once the client is wired to read them through.

import { createClient } from '@supabase/supabase-js';

import { PEAKS } from '../src/data/peaks';
import { TRAILS } from '../src/data/trails';
import { EXERCISE_INFO } from '../src/program/exercise-library';
import { LIFTS } from '../src/program/lifts';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const now = new Date().toISOString();

async function upsertAll(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`Seeded ${table}: ${rows.length} rows.`);
}

async function main() {
  // Exercises: field-guide content (EXERCISE_INFO) merged with the estimator's
  // weight-suggestion meta (LIFTS), keyed by the exercise name.
  const exercises = Object.entries(EXERCISE_INFO).map(([name, info]) => ({
    id: info.id,
    name,
    payload: { ...info, lift: LIFTS[name] ?? null },
    updated_at: now,
  }));

  const trails = TRAILS.map((t) => ({ id: t.id, name: t.name, payload: t, updated_at: now }));

  const peaks = PEAKS.map((p) => ({
    id: p.id,
    name: p.name,
    elevation_ft: p.elevationFt,
    payload: p,
    updated_at: now,
  }));

  await upsertAll('exercises', exercises);
  await upsertAll('trails', trails);
  await upsertAll('peaks', peaks);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
