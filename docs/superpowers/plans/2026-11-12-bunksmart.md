# ClassPilot Implementation Plan (formerly BunkSmart)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A web app (and, if time allows, a separate offline mobile app) for MITE students. It pulls attendance and timetable data from the MITE ERP, shows exactly how many classes you can skip per subject, plans study time around your deadlines, and answers questions through a built-in assistant that doesn't use an LLM.

**Architecture:** An npm-workspaces monorepo. `packages/core` is pure TypeScript with no I/O: attendance maths, the study planner and the rule-based NLU assistant. It's shared by `apps/web` (Next.js App Router + Supabase + Tailwind, deployed on Vercel) and `apps/mobile` (Expo + expo-sqlite offline cache). The ERP sync runs server-side in a Next.js route, which logs into Keycloak, calls the ERP JSON API, and upserts into Supabase. Students see teacher schedule changes live through Supabase Realtime.

**Tech Stack:** Node 26, npm 12 workspaces, TypeScript 5, Next.js 15, React 19, Tailwind 4, @supabase/supabase-js 2 + @supabase/ssr, Vitest, Expo SDK (latest stable), expo-sqlite, Playwright (fallback ERP login only).

**Spec:** The decisions below were settled in the grilling session (2026-11-12). This section is the spec.

### Spec summary
- Problem Statement #2 (Smart Timetable Planner): attendance and the timetable in one place, plus a study planner that fits deadlines around classes without clashes.
- **Attendance source = ERP only** (`erp.mite.ac.in`). Teachers do **not** mark attendance in the app.
- **ERP credentials** are stored per student, encrypted with **AES-256-GCM**, so syncs can run automatically.
- **Calculations** are per subject, with an overall figure shown alongside. The minimum is **75%** and can be configured. Shown for each subject: current %, the cost of missing the next class (before → after, with the drop), safe-to-miss now, must-attend-to-recover, and a semester projection based on the full semester's planned class total.
- **Teachers** only manage the schedule, with **one-off** changes only: cancel a class on a date, or add an extra class. They can also create and cancel events, and post class-wide deadlines.
- **Events:** teachers and admins create them. Cancelled events stay visible, struck through, with a "Cancelled" badge. ERP calendar events are imported read-only.
- **Deadlines:** teachers post class-wide ones, and students add personal ones.
- **Google Classroom:** each subject stores a Classroom URL, and there's an "Open in Classroom" link on timetable and calendar items.
- **Login:** Supabase Auth with email and password. A `role` field on each profile (student, teacher or admin). New sign-ups default to student. Only an admin can promote someone to teacher. Seeded demo accounts have quick-login buttons.
- **Assistant:** rule-based intent engine with no LLM and no network calls. English only. Text input, plus voice through the Web Speech API on the web. It can answer questions and navigate to sections.
- **UI:** fast and lightweight, with minimal animation.
- **Mobile:** a separate Expo app for the student side, working offline from a SQLite cache and syncing when back online. The web app comes first, and mobile is the cut line if time runs out.

### ERP facts (mapped live on 2026-11-12)
- Auth uses Keycloak. Realm `mite`, client `admissions-ui`. The token endpoint is `POST https://erp.mite.ac.in/auth/realms/mite/protocol/openid-connect/token`. API calls need `Authorization: Bearer <access_token>`, and cookies alone get a 401.
- These endpoints all start with `/academics-api/query` and all return `{ success, data }`:
  - `GET /profile/me` returns the student UUID.
  - `GET /students/semesters?student_id=<uuid>` returns a list of `{termNumber, academicTermId, isCurrent, academicYearId, termMasterId}`.
  - `GET /attendance/session-logs/attendance?student_id&academic_term_id&from_date&to_date` returns `data[0].courses[]` with `{courseCode, courseName, presentCount, absentCount, totalEligible, logs[]: {logId, sessionDate, startTime, endTime, attendanceStatus: "PRESENT"|"ABSENT", attendanceEligible, isSwappedAway}}`.
  - `GET /faculty/timetable?studentUUID&from_date&to_date` returns a list of `{logId|null, entryId, sessionDate, dayOfWeek, startTime "HH:MM", endTime, course|null {courseCode, courseTitle}, room {roomCode|null}, group {groupCode, groupType}, logType: ["THEORY"|"LAB"|"TUTORIAL CLASS"|"BREAK"|"LUNCH"], isCancelled}`.
  - `GET /portal/calendar?academic_year_id&term_master_id` returns `data.months[].events[]` with `{event_id, event_title, start_date, end_date, is_holiday, is_class_suspended, event_code, category_name}`. Semester bounds come from `event_code` `CLASS_START` (2026-09-07) and `CLASS_END` (2026-12-30).

## Global Constraints
- Every date is an IST calendar date stored as the text `YYYY-MM-DD`. Never use `new Date(dateString)` on a date-only value (it parses as UTC). Use the helpers in `packages/core/src/dates.ts`.
- `MIN_ATTENDANCE` defaults to `0.75`. Every calc function takes `min` as a parameter.
- Percentages are shown with 1 decimal place (`82.4%`).
- Status colours: `safe` = green, `risky` = amber, `must` = red.
- No LLM or AI API anywhere. The assistant is deterministic.
- Secrets live only in `.env.local`: `SUPABASE_SERVICE_ROLE_KEY`, `ERP_ENC_KEY` (32 bytes, base64), and the demo account passwords. Nothing secret is ever committed or printed.
- No animations beyond CSS `transition` of 150ms or less.
- Package names are `@bunk/core`, `web` and `mobile`.

## Review Focus
1. **A subject with 0 classes held** (start of term, or a newly added elective). Every calc must return 0% or 100% sensibly, never `NaN` or `Infinity`. Tests for this go in Task 1.
2. **ERP sessions that aren't classes.** `BREAK` and `LUNCH` entries have a null course, and some sessions are `isCancelled: true`. These must not count as classes, show up in planned totals, or create study-plan clashes. Tests go in Tasks 4 and 3.
3. **Wrong ERP password or an expired token.** Sync must return `{ ok: false, error: "ERP_AUTH" }` with a readable message and must not wipe existing data. The test goes in Task 4.
4. **The assistant gets a subject it doesn't recognise, or a vague one** ("cn" could be Computer Networks or Computer Networks Laboratory). It must ask which one and list the options instead of guessing silently. The test goes in Task 2.
5. **Late-evening dates around the IST/UTC boundary.** "Tomorrow" asked at 23:30 IST must still mean the next IST day. The test goes in Task 1 (`dates.ts`).

---

## File Structure

```
package.json                     # npm workspaces: packages/*, apps/*
packages/core/src/
  dates.ts                       # IST date helpers
  attendance.ts                  # pct, costOfMiss, safeToMiss, mustAttend, projection, classAdvice
  planner.ts                     # freeSlots + planStudy (EDF)
  assistant/normalize.ts         # synonyms, lowercase
  assistant/subjects.ts          # acronym/fuzzy subject matcher
  assistant/intents.ts           # keyword-scored intent classifier + date extraction
  assistant/answer.ts            # Intent + data -> {text, navigate?}
  types.ts                       # shared domain types
  index.ts
packages/core/test/*.test.ts
supabase/migrations/0001_init.sql
supabase/seed.sql
apps/web/
  lib/supabase/{client,server}.ts
  lib/crypto.ts                  # AES-256-GCM
  lib/erp/{client,map,sync}.ts   # Keycloak login, API calls, ERP->rows mapping, upsert
  app/api/erp/sync/route.ts
  app/login/page.tsx
  app/(student)/{dashboard,timetable,calendar,planner,settings}/page.tsx
  app/teacher/page.tsx
  components/{AttendanceCard,WeekGrid,Assistant,VoiceButton,EventList}.tsx
  scripts/seed-users.ts
  fixtures/erp-snapshot.json     # demo fallback (anonymised)
apps/mobile/
  app/(tabs)/{index,timetable,calendar,assistant}.tsx
  lib/{db,sync}.ts
```

---

### Task 1: Monorepo, dates and attendance maths

**Files:**
- Create: `package.json`, `.gitignore`, `packages/core/{package.json,tsconfig.json,vitest.config.ts}`, `packages/core/src/{types,dates,attendance,index}.ts`
- Test: `packages/core/test/{dates,attendance}.test.ts`

**Interfaces:**
- Produces:
  - `type Status = "PRESENT" | "ABSENT"`
  - `type CourseStats = { code: string; name: string; present: number; held: number; plannedTotal: number }`
  - `pct(present: number, held: number): number`. Returns a 0–100 value, and 100 when `held === 0`.
  - `costOfMiss(present, held): { before: number; after: number; drop: number }`
  - `safeToMiss(present, held, min = 0.75): number`, calculated as `max(0, floor((present - min*held) / min))`
  - `mustAttend(present, held, min = 0.75): number`, calculated as `max(0, ceil((min*held - present) / (1 - min)))`
  - `projection(s: CourseStats, min = 0.75): { remaining: number; canMissRemaining: number; finalIfAllAttended: number }` where `remaining = max(0, plannedTotal - held)` and `canMissRemaining = max(0, floor(present + remaining - min*plannedTotal))`
  - `classAdvice(s: CourseStats, hasDeadlineThatDay: boolean, min = 0.75): "safe" | "risky" | "must"`. It returns `must` if `costOfMiss.after < min*100` or `hasDeadlineThatDay`, `risky` if `after < min*100 + 5`, and `safe` otherwise.
  - `overall(stats: CourseStats[]): CourseStats` sums the counts across subjects.
  - `dates.ts` exports `todayIST(now?: Date): string`, `addDays(d: string, n: number): string`, `weekday(d: string): 0..6`, `nextWeekday(from: string, wd: number): string`, `parseHHMM(s): number` (minutes since midnight). All work on IST `YYYY-MM-DD` strings.

- [ ] **Step 1:** Run `git init`, create the root `package.json` with `"workspaces": ["packages/*", "apps/*"]`, and set `.gitignore` to cover `node_modules`, `.env*`, `.next` and `.expo`. Then install: `npm i -D -w packages/core typescript vitest`.
- [ ] **Step 2: Write the failing tests**

```ts
// attendance.test.ts
expect(pct(18, 20)).toBe(90);
expect(pct(0, 0)).toBe(100);
expect(costOfMiss(18, 20)).toEqual({ before: 90, after: 85.7, drop: 4.3 }); // values rounded to 1 dp
expect(safeToMiss(18, 20)).toBe(4);          // 18/24 = 75%
expect(safeToMiss(11, 14)).toBe(0);          // 78.6%, one miss -> 73.3%
expect(mustAttend(10, 15)).toBe(5);          // 15/20 = 75%
expect(mustAttend(18, 20)).toBe(0);
expect(projection({ code: "X", name: "X", present: 18, held: 20, plannedTotal: 36 }))
  .toEqual({ remaining: 16, canMissRemaining: 7, finalIfAllAttended: 94.4 });
expect(classAdvice({ code:"H", name:"H", present: 11, held: 14, plannedTotal: 30 }, false)).toBe("must");
expect(classAdvice({ code:"F", name:"F", present: 18, held: 20, plannedTotal: 36 }, true)).toBe("must");
expect(classAdvice({ code:"F", name:"F", present: 18, held: 20, plannedTotal: 36 }, false)).toBe("safe");
// dates.test.ts
expect(todayIST(new Date("2026-11-12T18:00:00Z"))).toBe("2026-11-12"); // 23:30 IST
expect(todayIST(new Date("2026-11-12T18:31:00Z"))).toBe("2026-11-13");
expect(nextWeekday("2026-11-12", 5)).toBe("2026-11-13");               // Thu -> Fri
```

- [ ] **Step 3:** Run `npm test -w @bunk/core`. Expected: FAIL (the modules don't exist yet).
- [ ] **Step 4:** Implement the functions with the signatures above. Round results to 1 decimal place with `Math.round(x*10)/10`. Do date maths on UTC-midnight `Date` objects built from the string parts, so the local timezone never comes into it.
- [ ] **Step 5:** Run `npm test -w @bunk/core`. Expected: PASS.
- [ ] **Step 6:** Run `git commit -m "feat(core): attendance maths and IST dates"`.

### Task 2: Rule-based assistant (NLU)

**Files:**
- Create: `packages/core/src/assistant/{normalize,subjects,intents,answer}.ts`
- Test: `packages/core/test/assistant.test.ts`

**Interfaces:**
- Consumes: everything in `attendance.ts` and `dates.ts` (Task 1)
- Produces:
  - `type Intent = { kind: "attendance"|"can_skip"|"cost_of_skip"|"should_skip_day"|"next_class"|"events"|"open_section"|"open_classroom"|"help"; subject?: string /*course code*/; date?: string; section?: "dashboard"|"timetable"|"calendar"|"planner"|"settings" }`
  - `matchSubject(text: string, courses: {code: string; name: string}[]): { code: string } | { ambiguous: string[] } | null`
  - `classify(text: string, courses, today: string): Intent | { clarify: string; options: string[] }`
  - `type CalendarEvent = { id: string; title: string; start: string; end: string; category: string; isHoliday: boolean; cancelled: boolean }` (in `types.ts`)
  - `type AssistantData = { stats: CourseStats[]; timetable: TimetableSlot[]; events: CalendarEvent[]; deadlines: Deadline[]; classroom: Record<string,string> }`
  - `answer(intent: Intent, data: AssistantData, today: string): { text: string; navigate?: string; openUrl?: string }`
  - `ask(text: string, data: AssistantData, today: string)`, which runs `classify` then `answer`. This is the only function the UIs call.

How it works:
- **Normalise:** lowercase the text, strip punctuation, and map synonyms with `{bunk|skip|miss|leave|absent} → skip` and `{att|attendance|percentage|%} → attendance`.
- **Subject aliases:** each course has (a) its lowercased name, (b) an acronym of its words with `and|of|the|for` removed (so "Formal language and automata theory" becomes `flat`), and (c) its code (`23cspc304`) plus the number part (`304`). A course whose name contains `Laboratory` or `Lab` only matches if the text contains `lab`. Score each course by whole-word alias hits, then token overlap. If tokens are 4 or more characters long, Levenshtein distance of 1 or less also counts. If the top two scores are tied, the result is `ambiguous`.
- **Intent:** keyword scoring. `can_skip` needs `skip` together with `how many|can i|left`. `cost_of_skip` needs `skip` together with `if|what happens|lose|drop`. `should_skip_day` needs `skip` together with a date word. `open_section` uses `open|go to|show` plus a section name. `open_classroom` uses `classroom`. If nothing scores 1 or more, the result is `help`.
- **Dates:** `today`, `tomorrow`, weekday names (the next occurrence), and `on 15th` / `15 nov`.

- [ ] **Step 1: Write the failing tests.** Use the real MITE courses as fixtures: 23CSPE311 Full Stack Development, 23MEOE313 Product Development, 23CSPC304 Formal language and automata theory, 23CSPC303 Computer Networks, 23CSPC302 Database Management Systems, 23CSPC305 Computer Networks Laboratory, 23HMCC301 Entrepreneurship.

```ts
expect(classify("how many classes can I bunk in FLAT", C, T)).toMatchObject({ kind: "can_skip", subject: "23CSPC304" });
expect(classify("whats my dbms attendance", C, T)).toMatchObject({ kind: "attendance", subject: "23CSPC302" });
expect(classify("cn lab attendance", C, T)).toMatchObject({ subject: "23CSPC305" });
expect(classify("can i skip cn tomorrow", C, T)).toMatchObject({ subject: "23CSPC303" });          // the lab course is excluded because the text has no "lab"
expect(classify("development attendance", C, T)).toMatchObject({ clarify: expect.any(String), options: ["Full Stack Development", "Product Development"] });
expect(classify("what if i skip full stak", C, T)).toMatchObject({ kind: "cost_of_skip", subject: "23CSPE311" }); // typo
expect(classify("open calendar", C, T)).toMatchObject({ kind: "open_section", section: "calendar" });
expect(classify("should i skip on friday", C, "2026-11-12")).toMatchObject({ kind: "should_skip_day", date: "2026-11-13" });
expect(classify("asdfgh", C, T)).toMatchObject({ kind: "help" });
expect(classify("attendance in quantum physics", C, T)).toMatchObject({ clarify: expect.stringContaining("don't have") });
expect(ask("how many can i skip in fsd", D, T).text).toContain("4 more");   // 18/20, using the Task 1 numbers
```

- [ ] **Step 2:** Run `npm test -w @bunk/core`. Expected: FAIL.
- [ ] **Step 3:** Implement the four files as described above. The answer text templates are:
  - `can_skip`: `"You can skip {n} more {Name} class(es) and stay ≥75% (now {pct}%)."`
  - `cost_of_skip`: `"Skipping the next {Name} class takes you from {before}% → {after}% (−{drop}%)."`
  - `should_skip_day`: list each class on that date with its advice word and a reason.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Run `git commit -m "feat(core): rule-based assistant"`.

### Task 3: Study planner

**Files:**
- Create: `packages/core/src/planner.ts`
- Test: `packages/core/test/planner.test.ts`

**Interfaces:**
- Consumes: `dates.ts`
- Produces:
  - `type TimetableSlot = { date: string; start: string; end: string; courseCode: string | null; kind: string; room: string | null; cancelled: boolean; extra: boolean }`
  - `type Deadline = { id: string; courseCode: string | null; title: string; due: string /*YYYY-MM-DD*/; kind: "exam"|"quiz"|"assignment" }`
  - `type StudyBlock = { date: string; start: string; end: string; deadlineId: string; title: string }`
  - `freeSlots(timetable: TimetableSlot[], date: string): {start: string; end: string}[]`. The study window is `09:00–17:00` and `18:00–21:00`. Remove non-cancelled slots that have a course, and keep only gaps of 30 minutes or more. `BREAK` and `LUNCH` entries, which have a null course, are **not** treated as free time; they're removed too.
  - `planStudy(timetable, deadlines, today: string, horizonDays = 14): { blocks: StudyBlock[]; unplaced: { deadlineId: string; hoursShort: number }[] }`. Hours needed: exam 4, quiz 2, assignment 2. Fill blocks of up to 60 minutes into free slots from `today` to the day before the due date, earliest deadline first, with at most 3 study hours per day.

- [ ] **Step 1: Write the failing tests.**
  - One quiz due in 2 days produces blocks totalling 120 minutes, and no block overlaps a class.
  - A cancelled class's time becomes free.
  - Two deadlines: the earlier one gets the earlier slots.
  - A deadline due today gives `unplaced` with `hoursShort: 2`.
  - Lunch (12:05–12:50) never gets a block.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the functions above.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 4: Supabase schema, ERP client, encryption and sync

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, `apps/web/lib/crypto.ts`, `apps/web/lib/erp/{client,map,sync}.ts`, `apps/web/app/api/erp/sync/route.ts`, `apps/web/fixtures/erp-snapshot.json`
- Test: `apps/web/test/{crypto,erp-map,sync}.test.ts`

**Interfaces:**
- Consumes: `TimetableSlot` and `CourseStats` from core
- Produces these Supabase tables (all with RLS enabled):
  - `profiles(id uuid pk → auth.users, name text, role text check in ('student','teacher','admin') default 'student', usn text, section text)`. A trigger creates a profile on signup. Users can update their own row, but not `role`; only admins can.
  - `erp_credentials(user_id pk, usn text, ciphertext text, iv text, tag text, last_sync timestamptz, last_error text)`. Only the owner can access it, and the service role reads it during sync.
  - `courses(code pk, name, classroom_url text)`. Anyone logged in can read it. Teachers and admins can update `classroom_url`.
  - `attendance_logs(user_id, erp_log_id bigint, course_code, date, start, "end", status text, primary key(user_id, erp_log_id))`. Owner can read only.
  - `timetable(user_id, date, start, "end", course_code null, kind, room, section, cancelled bool, erp_entry_id, primary key(user_id, date, start))`. Owner can read.
  - `schedule_overrides(id, section, course_code, date, start, "end", action text check in ('cancel','extra'), room, created_by, created_at)`. Logged-in users can read. Teachers and admins can write.
  - `events(id, title, start_date, end_date, category, is_holiday bool, cancelled bool default false, source text check in ('erp','app'), erp_event_id int unique null, created_by)`. Logged-in users can read. Teachers and admins can write rows with source `app`.
  - `deadlines(id, course_code null, title, due date, kind, scope text check in ('class','personal'), section, owner_id)`. Rows with scope `class` are readable by everyone, `personal` only by the owner. Teachers write `class` deadlines and students write `personal` ones.
  - Realtime is enabled on `schedule_overrides`, `events` and `deadlines`.
- `encrypt(plain: string): {ciphertext, iv, tag}` and `decrypt(c): string` use the `ERP_ENC_KEY` env value and AES-256-GCM.
- `erpLogin(usn: string, password: string): Promise<string /*access token*/>`. It **first** tries `grant_type=password` with `client_id=admissions-ui, scope=openid`. If the response is `unauthorized_client` or `invalid_grant` with the error "not allowed", it falls back to a Playwright headless login: go to `https://erp.mite.ac.in/student/dashboard`, fill `#username` and `#password`, click `#kc-login`, then capture the bearer token from the first `/academics-api/` request's `authorization` header. Wrong credentials throw `ErpAuthError`.
- `fetchErp(token): Promise<ErpRaw>` calls profile, semesters (picks `isCurrent`), calendar, attendance from CLASS_START to today, and timetable from CLASS_START to CLASS_END.
- `mapErp(raw: ErpRaw): { courses; logs; timetable; events; stats: CourseStats[] }`. Logs with `attendanceEligible === false` or `isSwappedAway` are dropped. Timetable rows whose `logType` is `BREAK` or `LUNCH` keep `course_code=null`. `plannedTotal` counts the non-cancelled timetable rows that have a course, from CLASS_START to CLASS_END. If the ERP timetable has no future rows, take the weekly pattern from the last 7 days that have data and repeat it up to CLASS_END, skipping days where `is_holiday` is true.
- `syncUser(userId: string): Promise<{ ok: true; counts } | { ok: false; error: "ERP_AUTH"|"ERP_DOWN"|"NO_CREDS"; message: string }>`. It upserts data and never deletes it, so a failed sync leaves the old data in place.
- `POST /api/erp/sync`: the body `{usn, password}` (optional) stores the credentials and then syncs. An empty body syncs with the stored credentials. When `DEMO_SNAPSHOT=1`, it loads `fixtures/erp-snapshot.json` instead of calling the ERP.

- [ ] **Step 1:** Write `0001_init.sql` and apply it through the Supabase connector (the user is adding it). Expected: the tables are listed.
- [ ] **Step 2:** Build the snapshot fixture from the responses captured on 2026-11-12 (attendance summary for 8 courses, the 12 Nov timetable, and the full calendar). Replace the student's name and USN with `DEMO STUDENT` and `4MT24CS000`.
- [ ] **Step 3: Write the failing tests.**
  - `decrypt(encrypt("p@ss")) === "p@ss"`, and decrypting with a tampered tag throws.
  - `mapErp(snapshot)` gives FSD stats `{present: 18, held: 20}`, a BREAK row with `course_code: null`, and an `events` list that includes "CIE Test-2" on `2026-12-21`.
  - `plannedTotal` is at least `held` for every course.
  - `syncUser` with a mocked `erpLogin` that throws `ErpAuthError` returns `{ok: false, error: "ERP_AUTH"}` and makes no calls to the upsert spy.
- [ ] **Step 4:** Run `npm test -w web`. Expected: FAIL.
- [ ] **Step 5:** Implement the files above.
- [ ] **Step 6:** Run the tests. Expected: PASS. Then make a manual check: the user runs `curl -X POST localhost:3000/api/erp/sync` once with their **own** credentials, entered through the Settings form. Claude never types them. Expected: `ok: true`, and the counts are greater than 0. If both login paths fail, set `DEMO_SNAPSHOT=1` and continue.
- [ ] **Step 7:** Commit.

### Task 5: Web app shell, login and student dashboard

**Files:**
- Create: `apps/web/` (`create-next-app` with TypeScript, Tailwind and App Router), `lib/supabase/{client,server}.ts`, `middleware.ts`, `app/login/page.tsx`, `app/(student)/layout.tsx`, `app/(student)/dashboard/page.tsx`, `components/AttendanceCard.tsx`, `scripts/seed-users.ts`

**Interfaces:**
- Consumes: Task 1 (calc), Task 4 (tables)
- Produces: the `(student)` layout with a nav for Dashboard, Timetable, Calendar, Planner and Settings, and a slot for `<Assistant/>` in the bottom-right corner.

- [ ] **Step 1:** `scripts/seed-users.ts` uses the service-role admin API to create `admin@demo.bunk`, `teacher@demo.bunk`, `student1@demo.bunk` and `student2@demo.bunk`. Passwords are read from `.env.local` (`DEMO_PASSWORD`). The script sets the roles, and the students get section `5CS3`. Run it. Expected: it prints 4 user ids.
- [ ] **Step 2:** On the login page, add email/password sign-in and sign-up, plus four **"Login as …"** buttons that appear only when `NEXT_PUBLIC_DEMO=1`. The middleware sends teachers and admins to `/teacher` and students to `/dashboard`.
- [ ] **Step 3:** Build the dashboard:
  - An overall % at the top.
  - An `AttendanceCard` for each course showing the %, `present/held`, safe-to-miss, must-attend, "Skip next: 85.7% (−4.3%)", the projection, a status colour from `classAdvice` (using deadline-today from the `deadlines` table), and an "Open in Classroom" link if a URL is set.
  - Today's classes, each with its own advice chip.
- [ ] **Step 4: Verify.** Run `npm run dev -w web`, log in as student1 with demo sync data, and check that the FSD card shows 90.0% and "can skip 4".
- [ ] **Step 5:** Commit.

### Task 6: Timetable, calendar, planner and settings pages

**Files:**
- Create: `app/(student)/{timetable,calendar,planner,settings}/page.tsx`, `components/{WeekGrid,EventList}.tsx`

**Interfaces:**
- Consumes: the `timetable`, `schedule_overrides`, `events` and `deadlines` tables, plus `planStudy` (Task 3)
- Produces: `mergeOverrides(slots: TimetableSlot[], overrides): TimetableSlot[]` in `packages/core/src/planner.ts`. A `cancel` sets `cancelled=true`, and an `extra` adds a slot with `extra=true`. Add a core test: cancelling DBMS on 2026-11-13 marks that slot as cancelled, and an extra OS class on a Saturday appears.

- [ ] **Step 1:** Write the `mergeOverrides` test. Run it. Expected: FAIL. Implement the function. Run it again. Expected: PASS.
- [ ] **Step 2:** Timetable page: a week grid with day columns and time rows. Cancelled slots are struck through, and extra slots get an "Extra" badge. Each slot has an advice chip and a Classroom link. Subscribe to `schedule_overrides` through Realtime and re-render when it changes.
- [ ] **Step 3:** Calendar page: a month list of `events`. Holidays are highlighted, and cancelled events are struck through with a "Cancelled" badge. Class deadlines appear alongside the events.
- [ ] **Step 4:** Planner page: a form to add a personal deadline, and the `planStudy` blocks grouped by day. Show the `unplaced` warnings.
- [ ] **Step 5:** Settings page: an ERP USN and password form that POSTs to `/api/erp/sync`, the last sync time and error, and a "Sync now" button.
- [ ] **Step 6: Verify.** Open two browsers, one as teacher and one as student. Cancelling a class (in Task 7) should show it struck through in the student's view within 2 seconds.
- [ ] **Step 7:** Commit.

### Task 7: Teacher console

**Files:**
- Create: `app/teacher/page.tsx`, `app/teacher/actions.ts` (server actions)

**Interfaces:**
- Consumes: the `schedule_overrides`, `events`, `deadlines` and `courses` tables
- Produces: these server actions: `cancelClass(section, courseCode, date, start)`, `addExtraClass(section, courseCode, date, start, end, room)`, `createEvent({...})`, `cancelEvent(id)`, `postDeadline({...})`, `setClassroomUrl(code, url)`. Each checks the caller's role on the server and throws `FORBIDDEN` for students.

- [ ] **Step 1:** Write a test (with a mocked Supabase) that `cancelClass` called by a student throws `FORBIDDEN`. Run it. Expected: FAIL. Implement the actions. Run it again. Expected: PASS.
- [ ] **Step 2:** UI: a section picker, then that day's classes for the section, each with Cancel. Below that, an "Add extra class" form, an Events list with Create/Cancel, a Deadlines form, and a Classroom URL field per course.
- [ ] **Step 3: Verify.** Run the two-browser realtime check from Task 6, step 6.
- [ ] **Step 4:** Commit.

### Task 8: Assistant UI and voice

**Files:**
- Create: `components/Assistant.tsx`, `components/VoiceButton.tsx`

**Interfaces:**
- Consumes: `ask()` from core, and the current student's data, loaded once in the layout and passed down as `AssistantData`.

- [ ] **Step 1:** A floating button opens a panel with a text input. Answers show as chat bubbles. A `navigate` result calls `router.push` and an `openUrl` result opens a new tab. A `clarify` result shows the options as tappable chips. On first open, show suggestion chips: "Can I skip tomorrow?", "DBMS attendance", "Open calendar".
- [ ] **Step 2:** `VoiceButton` uses `window.SpeechRecognition || webkitSpeechRecognition` with `lang="en-IN"`, and its result feeds the same `ask()`. If speech recognition isn't supported, the button is hidden.
- [ ] **Step 3: Verify in Chrome.** Typing "how many can i skip in fsd" should answer with "4 more". Saying "open calendar" should navigate to the calendar.
- [ ] **Step 4:** Commit, then deploy with `vercel --prod` (env vars set in the Vercel dashboard by the user).

### Task 9: Mobile app (student, offline). Cut line: skip if under 60 minutes remain

**Files:**
- Create: `apps/mobile` (`npx create-expo-app`), `lib/db.ts`, `lib/sync.ts`, `app/(tabs)/{index,timetable,calendar,assistant}.tsx`, `app/login.tsx`

**Interfaces:**
- Consumes: `@bunk/core` (calc, `ask`, `mergeOverrides`, `planStudy`) and Supabase.
- Produces: `syncDown(supabase, userId): Promise<void>` copies the user's rows from `courses`, `attendance_logs`, `timetable`, `schedule_overrides`, `events` and `deadlines` into the matching SQLite tables, and records `last_sync`. `loadAssistantData(): Promise<AssistantData>` reads from SQLite only.

- [ ] **Step 1:** Log in with supabase-js, with the session stored in SecureStore. Run `syncDown` on launch and whenever `NetInfo` reports the connection is back. Every screen reads **only** from SQLite.
- [ ] **Step 2:** The Dashboard, Timetable and Calendar tabs reuse the core functions. The Assistant tab is text-only (voice needs a dev build, which is out of scope). Show an "Offline · last synced 10:42" banner when there's no connection.
- [ ] **Step 3: Verify on a phone with Expo Go.** Log in, wait for the sync, turn on airplane mode, and kill and reopen the app. The dashboard and assistant should still work.
- [ ] **Step 4:** Commit.

---

## Time budget (5h)
| Task | Min |
|---|---|
| 1 Core maths | 25 |
| 2 Assistant | 45 |
| 3 Planner | 25 |
| 4 Schema + ERP sync | 50 |
| 5 Shell + dashboard | 45 |
| 6 Pages + realtime | 40 |
| 7 Teacher | 30 |
| 8 Assistant UI + deploy | 20 |
| 9 Mobile (cut line) | 40 |

The demo always runs from the snapshot or synced data, so it never depends on the ERP being up during judging.
