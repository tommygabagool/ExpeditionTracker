-- Multi-tenancy foundation: split program data from per-user data.
--
--   * programs / program_days become SHARED, read-only reference data — any
--     authenticated user may READ them; only the service-role seed writes.
--     (They previously carried user_id + owner RLS, i.e. a per-user copy.)
--   * program_enrollments (NEW, per-user) binds a user to a program version,
--     their start_date (the week-1 anchor that replaces the global
--     PROGRAM_START constant), and goal_params (start/goal weight).
--
-- Pre-production: programs/program_days are recreated, not migrated — there is
-- no production data to preserve. If that ever changes, replace the DROPs with
-- an ALTER that drops user_id and backfills a shared copy.

drop table if exists public.program_days;
drop table if exists public.programs;

-- Each programs row is one immutable template VERSION. The app reads the
-- version its enrollment pins (see program_enrollments.program_id).
create table public.programs (
  id uuid primary key,
  key text not null,                 -- template family, e.g. 'expedition-26'
  name text not null,
  length_weeks int not null,
  version int not null,
  params jsonb not null default '{}', -- phase boundaries, deloads, rates (Phase B)
  start_date date,                    -- nominal default; enrollment overrides per user
  updated_at timestamptz not null default now(),
  unique (key, version)
);

create table public.program_days (
  id uuid primary key,
  program_id uuid not null references public.programs (id) on delete cascade,
  week int not null check (week between 1 and 52),
  day int not null check (day between 0 and 6), -- 0 = Sunday
  phase text not null,
  is_deload boolean not null default false,
  title text not null,
  blocks jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (program_id, week, day)
);

-- Shared read-only: read to any authenticated user, no write policy (only the
-- service-role seed, which bypasses RLS, can write).
alter table public.programs enable row level security;
alter table public.program_days enable row level security;
create policy read_all on public.programs for select to authenticated using (true);
create policy read_all on public.program_days for select to authenticated using (true);
-- Pull queries walk updated_at (no user_id on shared tables).
create index on public.programs (updated_at);
create index on public.program_days (updated_at);

-- Per-user enrollment: the week-1 anchor + goal params + pinned program version.
-- Same conventions as the other per-user tables (0001): client uuid PK,
-- client-supplied updated_at (LWW), soft delete, owner-only RLS.
create table public.program_enrollments (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  start_date date not null,
  goal_params jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id)
);

alter table public.program_enrollments enable row level security;
create policy own_rows on public.program_enrollments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on public.program_enrollments (user_id, updated_at);
