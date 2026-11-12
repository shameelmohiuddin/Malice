-- Events from the official MITE Calendar of Events, Semester V (2023 scheme), 7 Sep – 30 Dec 2026,
-- that the ERP calendar doesn't carry. Read-only: the staff write policy only allows source = 'app'.
alter table public.events drop constraint if exists events_source_check;
alter table public.events add constraint events_source_check check (source in ('erp','app','official'));

insert into public.events (title, start_date, end_date, category, is_holiday, source)
select v.title, v.start_date, v.end_date, v.category, false, 'official'
from (values
  ('Theory Examination',            '2027-01-07', '2027-01-23', 'EXAMINATION'),
  ('Practical Examination',         '2027-01-25', '2027-02-01', 'EXAMINATION'),
  ('Commencement of Semester VI',   '2027-02-15', '2027-02-15', 'ACADEMIC DEADLINE'),
  ('Make-up Examination',           '2027-02-18', '2027-02-25', 'EXAMINATION')
) as v(title, start_date, end_date, category)
where not exists (select 1 from public.events e where e.title = v.title and e.start_date = v.start_date);
