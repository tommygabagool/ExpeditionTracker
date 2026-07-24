-- Server-side caches in front of the external APIs, so ten thousand users
-- checking Saturday's forecast at one trailhead is one upstream call, and each
-- unique food is fetched from USDA / Open Food Facts once, ever, userbase-wide.
--
-- Written ONLY by the edge functions (service role, which bypasses RLS).
-- Readable by authenticated users, but the app consumes them via the edge
-- function response — they are NOT synced to the client (not in the sync
-- engine's pulled tables).

-- Trailhead forecast cache: keyed on (trailhead, forecast day), short TTL
-- enforced in the weather function by comparing fetched_at.
create table public.weather_cache (
  trailhead_id text not null,
  forecast_date date not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (trailhead_id, forecast_date)
);

-- Normalized food cache: keyed on (source, source_id) — a USDA fdcId or an
-- Open Food Facts barcode. Effectively permanent (nutrition facts don't move).
create table public.foods (
  source text not null check (source in ('usda', 'off')),
  source_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (source, source_id)
);

alter table public.weather_cache enable row level security;
alter table public.foods enable row level security;
create policy read_all on public.weather_cache for select to authenticated using (true);
create policy read_all on public.foods for select to authenticated using (true);
