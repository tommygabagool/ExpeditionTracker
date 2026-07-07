-- Weight-suggestion system: onboarding profile + per-set strength logs.
-- Same conventions as 0001: client uuid PKs, client-supplied updated_at (LWW),
-- soft deletes, owner-only RLS, auth-ready.

create table public.user_profile (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bodyweight_lb numeric(5, 1) not null default 260,
  experience text not null default 'new' check (experience in ('new', 'returning', 'trained')),
  equipment text not null default 'full_gym'
    check (equipment in ('full_gym', 'dumbbells', 'home_minimal')),
  -- Seed working-max per anchor (lb). Null until onboarding computes them.
  squat_max_lb numeric(6, 1),
  deadlift_max_lb numeric(6, 1),
  press_max_lb numeric(6, 1),
  row_max_lb numeric(6, 1),
  -- Raw 8-rep calibration inputs, kept for transparency / re-derivation.
  calibration jsonb not null default '{}',
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id)
);

create table public.exercise_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  exercise_id text not null, -- stable slug, e.g. 'back_squat'
  exercise_name text not null,
  week int,
  phase text,
  rep_target int not null,
  set_target int not null,
  suggested_weight_lb numeric(6, 1),
  -- [{ set:1, weight:135, reps:5, done:true }, …] — one atomic unit per
  -- (date, exercise) so an offline edit re-pushes one row (LWW), and "last
  -- session" is a single-row lookup. A child table would only pay off for
  -- cross-exercise set analytics, which we don't need.
  sets jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, log_date, exercise_id)
);

do $$
declare t text;
begin
  foreach t in array array['user_profile', 'exercise_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
       using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create index on public.%I (user_id, updated_at)', t);
  end loop;
end $$;
