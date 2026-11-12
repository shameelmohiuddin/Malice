-- Class-wide deadlines are visible only to students of that section; staff see every section.
create or replace function public.my_section() returns text
language sql stable security definer set search_path = public as
$$ select section from public.profiles where id = auth.uid() $$;

drop policy "deadlines read" on public.deadlines;
create policy "deadlines read" on public.deadlines for select
  using (auth.uid() is not null and (
    owner_id = auth.uid()
    or (scope = 'class' and (section is null or section = public.my_section() or public.my_role() in ('teacher','admin')))
  ));
