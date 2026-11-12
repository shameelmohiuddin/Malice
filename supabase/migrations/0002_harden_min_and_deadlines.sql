alter table public.profiles add constraint min_attendance_range check (min_attendance > 0 and min_attendance < 1);
drop policy "deadlines read" on public.deadlines;
create policy "deadlines read" on public.deadlines for select
  using (auth.uid() is not null and (scope = 'class' or owner_id = auth.uid()));
