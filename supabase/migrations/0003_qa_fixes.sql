-- I2: one cancel/extra per class slot. Remove existing duplicates first (keep the oldest).
delete from public.schedule_overrides a using public.schedule_overrides b
 where a.section = b.section and a.course_code = b.course_code and a.date = b.date and a.start = b.start
   and a.action = b.action and a.created_at > b.created_at;
create unique index schedule_overrides_one_per_slot on public.schedule_overrides (section, course_code, date, start, action);

-- M8: Classroom links must be Google Classroom https links, even for direct DB writes.
update public.courses set classroom_url = null where classroom_url is not null and classroom_url not like 'https://classroom.google.com/%';
alter table public.courses add constraint classroom_url_google check (classroom_url is null or classroom_url like 'https://classroom.google.com/%');

-- M5: remember the last successful sync for every user (snapshot users have no erp_credentials row).
alter table public.profiles add column synced_at timestamptz;
