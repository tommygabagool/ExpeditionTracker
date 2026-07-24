// Seeds the SHARED program catalog from the builder (the program's source of
// truth). Each run inserts a NEW version of the template; the app pins the
// version an enrollment started on, prior versions stay for mid-program users,
// and completions (keyed by date) are untouched. Run with: npm run seed:program
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (No SEED_USER_ID: programs/program_days are shared read-only reference data,
//  written only by this service-role script — see migration 0006.)

import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { buildProgram, PROGRAM_TEMPLATE } from '../src/program/builder';
import { PROGRAM_START } from '../src/program/schedule';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const days = buildProgram();
  const now = new Date().toISOString();

  // Next version for this template family (key), across all users.
  const { data: prev, error: prevError } = await supabase
    .from('programs')
    .select('version')
    .eq('key', PROGRAM_TEMPLATE.key)
    .order('version', { ascending: false })
    .limit(1);
  if (prevError) throw prevError;
  const version = (prev?.[0]?.version ?? 0) + 1;

  const programId = randomUUID();
  const { error: programError } = await supabase.from('programs').insert({
    id: programId,
    key: PROGRAM_TEMPLATE.key,
    name: PROGRAM_TEMPLATE.name,
    length_weeks: PROGRAM_TEMPLATE.lengthWeeks,
    version,
    params: PROGRAM_TEMPLATE.params,
    start_date: PROGRAM_START,
    updated_at: now,
  });
  if (programError) throw programError;

  const rows = days.map((d) => ({
    id: randomUUID(),
    program_id: programId,
    week: d.week,
    day: d.day,
    phase: d.phase,
    is_deload: d.isDeload,
    title: d.title,
    blocks: d.blocks,
    updated_at: now,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('program_days').insert(rows.slice(i, i + 500));
    if (error) throw error;
  }

  console.log(`Seeded ${PROGRAM_TEMPLATE.key} version ${version}: ${rows.length} days.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
