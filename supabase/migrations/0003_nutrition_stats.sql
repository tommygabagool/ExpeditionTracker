-- Fuel stats for the calorie calculation (Mifflin-St Jeor + activity factor).
-- Nullable on purpose: profiles saved before these existed fall back to the
-- design's frozen defaults in the app.

alter table public.user_profile
  add column height_in numeric(4, 1),
  add column age_years int,
  add column sex text check (sex in ('male', 'female')),
  add column activity text check (activity in ('desk', 'active', 'hard'));
