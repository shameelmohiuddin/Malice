-- MITE rule: 85% required; 75%–85% needs condonation; below 75% not eligible.
-- The student's chosen minimum can't go below the 75% floor.
alter table public.profiles alter column min_attendance set default 0.85;
update public.profiles set min_attendance = 0.85 where min_attendance < 0.85;
alter table public.profiles drop constraint if exists min_attendance_range;
alter table public.profiles add constraint min_attendance_range check (min_attendance >= 0.75 and min_attendance <= 0.95);
