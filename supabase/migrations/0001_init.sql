-- BunkSmart schema. Dates are IST calendar dates.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  role text not null default 'student' check (role in ('student','teacher','admin')),
  usn text,
  section text default '5CS3',
  min_attendance numeric not null default 0.75
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Only admins may change role.
create or replace function public.guard_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and coalesce(public.my_role(),'') <> 'admin' and auth.uid() is not null then
    raise exception 'FORBIDDEN: only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles for each row execute function public.guard_role();

create table public.erp_credentials (
  user_id uuid primary key references auth.users on delete cascade,
  usn text not null,
  ciphertext text not null, iv text not null, tag text not null,
  last_sync timestamptz, last_error text
);

create table public.courses (
  code text primary key,
  name text not null,
  classroom_url text
);

create table public.attendance_logs (
  user_id uuid references auth.users on delete cascade,
  erp_log_id bigint,
  course_code text not null,
  date text not null, start text not null, "end" text not null,
  status text not null check (status in ('PRESENT','ABSENT')),
  primary key (user_id, erp_log_id)
);

create table public.timetable (
  user_id uuid references auth.users on delete cascade,
  date text not null, start text not null, "end" text not null,
  course_code text, kind text not null, room text, section text,
  cancelled boolean not null default false, erp_entry_id bigint,
  primary key (user_id, date, start)
);

create table public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  section text not null, course_code text not null,
  date text not null, start text not null, "end" text not null,
  action text not null check (action in ('cancel','extra')),
  room text, created_by uuid references auth.users, created_at timestamptz default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null, start_date text not null, end_date text not null,
  category text not null default 'EVENT', is_holiday boolean not null default false,
  cancelled boolean not null default false,
  source text not null default 'app' check (source in ('erp','app')),
  erp_event_id int unique, created_by uuid references auth.users
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  course_code text, title text not null, due text not null,
  kind text not null check (kind in ('exam','quiz','assignment')),
  scope text not null check (scope in ('class','personal')),
  section text, owner_id uuid references auth.users default auth.uid()
);

alter table public.profiles enable row level security;
alter table public.erp_credentials enable row level security;
alter table public.courses enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.timetable enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.events enable row level security;
alter table public.deadlines enable row level security;

create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.my_role() in ('teacher','admin'));
create policy "own profile update" on public.profiles for update using (id = auth.uid() or public.my_role() = 'admin');

create policy "own creds" on public.erp_credentials for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "courses read" on public.courses for select using (auth.uid() is not null);
create policy "courses staff update" on public.courses for update using (public.my_role() in ('teacher','admin'));

create policy "own logs" on public.attendance_logs for select using (user_id = auth.uid());
create policy "own timetable" on public.timetable for select using (user_id = auth.uid() or public.my_role() in ('teacher','admin'));

create policy "overrides read" on public.schedule_overrides for select using (auth.uid() is not null);
create policy "overrides staff write" on public.schedule_overrides for all
  using (public.my_role() in ('teacher','admin')) with check (public.my_role() in ('teacher','admin'));

create policy "events read" on public.events for select using (auth.uid() is not null);
create policy "events staff write" on public.events for all
  using (public.my_role() in ('teacher','admin') and source = 'app')
  with check (public.my_role() in ('teacher','admin') and source = 'app');

create policy "deadlines read" on public.deadlines for select
  using (scope = 'class' or owner_id = auth.uid());
create policy "deadlines write" on public.deadlines for all
  using (owner_id = auth.uid() and (scope = 'personal' or public.my_role() in ('teacher','admin')))
  with check (owner_id = auth.uid() and (scope = 'personal' or public.my_role() in ('teacher','admin')));

alter publication supabase_realtime add table public.schedule_overrides, public.events, public.deadlines;

-- ERP's own per-course counts are authoritative for present/held.
create table public.course_stats (
  user_id uuid references auth.users on delete cascade,
  course_code text not null,
  present int not null, held int not null, planned_total int not null,
  primary key (user_id, course_code)
);
alter table public.course_stats enable row level security;
create policy "own stats" on public.course_stats for select using (user_id = auth.uid());
