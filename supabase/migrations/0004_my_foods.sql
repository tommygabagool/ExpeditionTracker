-- Personal food library: frequent items land here so lookups barely hit the
-- USDA / Open Food Facts APIs. Rows come from remote lookups the user chose
-- to log (values editable — Open Food Facts is crowd-sourced) or manual adds.

create table public.my_foods (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  brand text,
  -- Human serving the kcal/macros describe, e.g. '1 bar (68 g)' or '100 g'.
  serving_desc text,
  kcal int not null,
  protein_g numeric(6, 1),
  carbs_g numeric(6, 1),
  fat_g numeric(6, 1),
  source text not null default 'manual' check (source in ('usda', 'off', 'manual')),
  source_id text, -- USDA fdcId or Open Food Facts barcode
  barcode text,
  use_count int not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.my_foods enable row level security;
create policy own_rows on public.my_foods for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Pull queries walk (user_id, updated_at), matching 0001's sync pattern.
create index on public.my_foods (user_id, updated_at);
