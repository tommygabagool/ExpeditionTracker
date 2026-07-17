-- THE OBJECTIVE — the trip the program is personalized around. Nullable on
-- purpose: no trip = the stock 26-week program, bit for bit. The trip date
-- re-anchors the calendar END at read time; program_days stays the stock seed.

alter table public.user_profile
  add column trip_name text,
  add column trip_date date,
  add column trip_style text check (trip_style in ('trail', 'technical', 'expedition')),
  add column trip_gain_ft int check (trip_gain_ft between 0 and 30000),
  add column trip_pack_lb numeric(5, 1) check (trip_pack_lb between 0 and 200),
  add column trip_max_alt_ft int check (trip_max_alt_ft between 0 and 30000);
