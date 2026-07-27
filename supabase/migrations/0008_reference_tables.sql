-- Shared, read-only reference catalogs (exercises, peaks), seeded from the app
-- bundle by scripts/seed-reference.ts (service role). Any authenticated user
-- reads; only the service-role seed writes — same shared pattern as
-- programs/program_days (migration 0006).
--
-- Trails are NOT here: they get a real spatial table (PostGIS) populated by the
-- OSM import pipeline in migration 0009, not a curated jsonb catalog.
--
-- The app still ships an in-bundle copy of each as the runtime source (they
-- feed Node-safe program logic and synchronous UI). These tables are the
-- server-side source of record so the catalogs can be corrected/extended
-- without an app release once the client is wired to read them through (a
-- deliberate follow-up — see the plan's Phase D note). Full metadata is kept in
-- a `payload` jsonb; a few columns are surfaced for querying/ordering.
--
-- Idempotent (safe to re-run): guards + drop-policy-if-exists, so applying this
-- over a database where an earlier version already created these tables does
-- not error. Non-destructive to any exercises/peaks rows already present.

create table if not exists public.exercises (
  id text primary key,            -- stable slug, e.g. 'back_squat'
  name text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.peaks (
  id text primary key,
  name text not null,
  elevation_ft int not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Remove the pre-spatial placeholder `trails` table if an earlier version of
-- this migration created it — trails now live in the spatial table (0009).
drop table if exists public.trails cascade;

alter table public.exercises enable row level security;
alter table public.peaks enable row level security;
drop policy if exists read_all on public.exercises;
create policy read_all on public.exercises for select to authenticated using (true);
drop policy if exists read_all on public.peaks;
create policy read_all on public.peaks for select to authenticated using (true);
