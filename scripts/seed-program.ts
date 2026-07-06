// Seeds the program tables from the builder (the program's source of truth).
// Each run inserts a NEW program version — the app reads the highest version,
// prior versions stay for history, and completions (keyed by date) are
// untouched. Run with: npm run seed:program
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_ID

import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { buildProgram } from '../src/program/builder';
import { PROGRAM_START } from '../src/program/schedule';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.SEED_USER_ID;

if (!url || !serviceRoleKey || !userId) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_USER_ID.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const days = buildProgram();
  const now = new Date().toISOString();

  const { data: prev, error: prevError } = await supabase
    .from('programs')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1);
  if (prevError) throw prevError;
  const version = (prev?.[0]?.version ?? 0) + 1;

  const programId = randomUUID();
  const { error: programError } = await supabase.from('programs').insert({
    id: programId,
    user_id: userId,
    name: 'Expedition Conditioning',
    start_date: PROGRAM_START,
    version,
    updated_at: now,
  });
  if (programError) throw programError;

  const rows = days.map((d) => ({
    id: randomUUID(),
    user_id: userId,
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

  console.log(`Seeded program version ${version}: ${rows.length} days.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
