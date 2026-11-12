-- Official weekly timetable per section (MITE CSE, Semester 5, Section 5CS3/CSE3, w.e.f. 07/09/2026).
-- Future weeks are generated from this; ERP-published sessions for a date still take precedence.

create table public.sections (
  section text primary key,
  department text,
  semester int,
  class_advisor text,
  effective_from text
);

create table public.section_timetable (
  id bigint generated always as identity primary key,
  section text not null references public.sections(section) on delete cascade,
  weekday int not null check (weekday between 1 and 6),       -- 1 = Monday
  start text not null, "end" text not null,
  options text[] not null default '{}',                        -- electives list alternatives; 'OE*' = the student's open elective
  kind text not null check (kind in ('THEORY','LAB','TUTORIAL','ACTIVITY','BREAK','LUNCH')),
  room text
);

alter table public.courses add column if not exists instructor text;
alter table public.courses add column if not exists counts_attendance boolean not null default true;

alter table public.sections enable row level security;
alter table public.section_timetable enable row level security;
create policy "sections read" on public.sections for select using (auth.uid() is not null);
create policy "sections admin write" on public.sections for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "section timetable read" on public.section_timetable for select using (auth.uid() is not null);
create policy "section timetable staff write" on public.section_timetable for all
  using (public.my_role() in ('teacher','admin')) with check (public.my_role() in ('teacher','admin'));

insert into public.sections values ('5CS3', 'Computer Science & Engineering', 5, 'Ms. Suma K', '2026-09-07');

-- Courses: titles and instructors from the timetable sheet. Non-credit sessions don't count toward attendance.
insert into public.courses (code, name, instructor, counts_attendance) values
  ('23HMCC301', 'Entrepreneurship, Management & Finance', 'Ms. Susanna Zeena Dsilva', true),
  ('23CSPC302', 'Database Management System', 'Dr. Sumalatha', true),
  ('23CSPC303', 'Computer Networks', 'Ms. Suma K', true),
  ('23CSPC304', 'Formal language and automata theory', 'Mr. Ashwin Kumar M', true),
  ('23CSPC305', 'Computer Networks Laboratory', 'Ms. Suma K', true),
  ('23CSPE311', 'Full Stack Development', 'Dr. Clara Kanamani', true),
  ('23CSPE312', 'Internet of Things', 'Ms. Suma K', true),
  ('23NMCC321', 'Yoga - III', 'Dr. Dinesha L', true),
  ('23NMCC322', 'Physical Education - III', 'Mr. Shreejith K B', true),
  ('23NMCC323', 'NSS - III', 'Mr. Shivaprasad', true),
  ('23NMCC324', 'Arts - III', 'Ms. Amrutha', true),
  ('23AEOE312', 'Basics of Unmanned Aerial Vehicles', null, true),
  ('23MTOE311', 'Mechatronics System Design', null, true),
  ('23MTOE313', 'Introduction to Industry 4.0', null, true),
  ('23RIOE311', 'Principles of Robotics', null, true),
  ('23RIOE313', 'Human Robot Interaction', null, true),
  ('ESDP01', 'Problem Solving Skills', 'Mr. Deepak Poojary', false),
  ('CP-WIPRO', 'Wipro-Salesforce', 'Ms. Amrutha', false),
  ('CP-PLACE', 'Placement Training', 'Ms. Sunitha N V', false),
  ('CP-COMM', 'Communication Skills', 'Ms. Shwetha Kamath', false),
  ('CP-CLUB', 'Club Activities', null, false)
on conflict (code) do update set name = excluded.name, instructor = excluded.instructor, counts_attendance = excluded.counts_attendance;

-- Weekly slots. Lab times follow the ERP's recorded sessions (e.g. DBMS lab 09:00–10:50).
insert into public.section_timetable (section, weekday, start, "end", options, kind, room) values
  -- Monday
  ('5CS3', 1, '09:00', '09:55', '{23CSPC303}', 'THEORY', '205'),
  ('5CS3', 1, '09:55', '10:15', '{}', 'BREAK', null),
  ('5CS3', 1, '10:15', '12:05', '{ESDP01}', 'ACTIVITY', 'Audi-3'),
  ('5CS3', 1, '12:05', '12:50', '{}', 'LUNCH', null),
  ('5CS3', 1, '12:50', '13:45', '{23HMCC301}', 'THEORY', '107'),
  ('5CS3', 1, '13:45', '14:40', '{23CSPC302}', 'THEORY', '107'),
  ('5CS3', 1, '14:40', '15:35', '{CP-WIPRO}', 'ACTIVITY', null),
  -- Tuesday
  ('5CS3', 2, '09:00', '09:55', '{OE*}', 'THEORY', '203'),
  ('5CS3', 2, '09:55', '10:15', '{}', 'BREAK', null),
  ('5CS3', 2, '10:15', '11:10', '{23HMCC301}', 'THEORY', '203'),
  ('5CS3', 2, '11:10', '12:05', '{23CSPE312}', 'THEORY', '205'),
  ('5CS3', 2, '11:10', '13:00', '{23CSPE311}', 'LAB', 'LB A103'),
  ('5CS3', 2, '12:05', '12:50', '{}', 'LUNCH', null),
  -- Wednesday
  ('5CS3', 3, '09:00', '10:50', '{23CSPC302}', 'LAB', 'LB A003'),
  ('5CS3', 3, '11:10', '12:05', '{23CSPC304}', 'THEORY', '309'),
  ('5CS3', 3, '12:05', '12:50', '{}', 'LUNCH', null),
  ('5CS3', 3, '12:50', '13:45', '{OE*}', 'THEORY', '309'),
  ('5CS3', 3, '13:45', '14:40', '{23CSPE311,23CSPE312}', 'THEORY', '309'),
  ('5CS3', 3, '15:35', '16:30', '{23NMCC321,23NMCC322,23NMCC323,23NMCC324}', 'THEORY', null),
  -- Thursday
  ('5CS3', 4, '09:00', '09:55', '{OE*}', 'THEORY', '203'),
  ('5CS3', 4, '09:55', '10:15', '{}', 'BREAK', null),
  ('5CS3', 4, '10:15', '11:10', '{23CSPC304}', 'THEORY', '203'),
  ('5CS3', 4, '11:10', '12:05', '{23CSPC305}', 'TUTORIAL', '203'),
  ('5CS3', 4, '12:05', '12:50', '{}', 'LUNCH', null),
  ('5CS3', 4, '12:50', '14:40', '{23CSPC305}', 'LAB', 'LB A003'),
  -- Friday
  ('5CS3', 5, '09:00', '09:55', '{23HMCC301}', 'THEORY', '206'),
  ('5CS3', 5, '09:55', '10:15', '{}', 'BREAK', null),
  ('5CS3', 5, '10:15', '11:10', '{23CSPC303}', 'THEORY', '206'),
  ('5CS3', 5, '11:10', '12:05', '{23CSPC302}', 'THEORY', '206'),
  ('5CS3', 5, '12:05', '12:50', '{}', 'LUNCH', null),
  ('5CS3', 5, '12:50', '13:45', '{23CSPC304}', 'THEORY', '206'),
  ('5CS3', 5, '13:45', '14:40', '{CP-PLACE}', 'ACTIVITY', '206'),
  ('5CS3', 5, '14:40', '15:35', '{CP-COMM}', 'ACTIVITY', '206'),
  -- Saturday
  ('5CS3', 6, '09:00', '09:55', '{23CSPE311,23CSPE312}', 'THEORY', '309'),
  ('5CS3', 6, '09:55', '10:15', '{}', 'BREAK', null),
  ('5CS3', 6, '10:15', '11:10', '{23CSPC302}', 'THEORY', '309'),
  ('5CS3', 6, '11:10', '12:05', '{23CSPC303}', 'THEORY', '309'),
  ('5CS3', 6, '12:05', '12:50', '{}', 'LUNCH', null),
  ('5CS3', 6, '13:45', '15:35', '{CP-CLUB}', 'ACTIVITY', null);
