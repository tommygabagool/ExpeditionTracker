-- Shared, read-only reference catalogs (exercises, trails, peaks), seeded from
-- the app bundle by scripts/seed-reference.ts (service role). Any authenticated
-- user reads; only the service-role seed writes — same shared pattern as
-- programs/program_days (migration 0006).
--
-- The app still ships an in-bundle copy of each as the runtime source (they
-- feed Node-safe program logic and synchronous UI). These tables are the
-- server-side source of record so the catalogs can be corrected/extended
-- without an app release once the client is wired to read them through (a
-- deliberate follow-up — see the plan's Phase D note). Full metadata is kept in
-- a `payload` jsonb; a few columns are surfaced for querying/ordering.

create table public.exercises (
  id text primary key,            -- stable slug, e.g. 'back_squat'
  name text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.trails (
  id text primary key,
  name text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.peaks (
  id text primary key,
  name text not null,
  elevation_ft int not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.exercises enable row level security;
alter table public.trails enable row level security;
alter table public.peaks enable row level security;
create policy read_all on public.exercises for select to authenticated using (true);
create policy read_all on public.trails for select to authenticated using (true);
create policy read_all on public.peaks for select to authenticated using (true);
