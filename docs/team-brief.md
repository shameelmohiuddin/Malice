# BunkSmart: Team Brief (wireframes and PPT)

**One line:** BunkSmart pulls your attendance and timetable straight from the MITE ERP. It tells you exactly which classes you can skip and which you can't, plans your study time around deadlines, and answers questions through a built-in assistant that doesn't use any AI API.

**Problem statement:** #2, Smart Timetable Planner.
**Users:** students (view, plan, ask) and teachers (cancel or add classes, post events and deadlines).
**Platforms:** web app (priority) and a separate mobile app that works offline.

---

## Part 1: Screens to wireframe

Keep it clean and fast: cards, clear colours, no heavy animation.
Status colours: **green = safe to skip, amber = risky, red = don't skip.**

### 1. Login
- Email + password, plus a "Sign up" link
- Demo buttons: **Login as Student**, **Login as Teacher**, **Login as Admin**

### 2. Student Dashboard (the main screen)
- Top: **Overall attendance %**, a big number such as `91.8%`, plus the last ERP sync time
- **One card per subject:**
  - Subject name and code (e.g. *Full Stack Development, 23CSPE311*)
  - `90.0%` and `18/20 attended`
  - **"Can skip 4 more"** (green), or **"Attend next 3 to reach 75%"** (red)
  - **"Skip next class → 85.7% (−4.3%)"**
  - **"By semester end: can miss 7 of 16 remaining"**
  - Card border or chip coloured green, amber or red
  - "Open in Classroom" link
- **Today's classes** strip: time, subject, room, and an advice chip (ok to skip / risky / don't skip)
- A floating **assistant button** (bottom-right) on every student screen

### 3. Timetable (week view)
- Days as columns, times as rows (9:00–4:40, with breaks and lunch shown greyed out)
- Each class block shows subject, room and an advice chip
- **Cancelled class:** ~~struck through~~ with a "Cancelled" tag
- **Extra class:** an "Extra" badge
- Tapping a class opens its details and a Google Classroom link

### 4. Calendar / Events
- Month view or list, synced from the ERP calendar (holidays, CIE tests, PTM) plus events teachers add
- Holidays highlighted
- **Cancelled events stay visible**, ~~struck through~~, with a "Cancelled" badge
- Class deadlines shown on their dates

### 5. Study Planner
- "Add deadline" form: title, subject, due date, type (exam, quiz or assignment)
- The **auto-generated plan**, grouped by day: e.g. "Thu 12 Nov · 14:40–15:40 · Study for DBMS quiz"
- A warning when there isn't enough free time ("Need 1 more hour for the OS exam")

### 6. Settings
- ERP USN and password ("stored encrypted")
- A **Sync now** button, the last sync time and any error
- Minimum attendance % (default 75)

### 7. Assistant panel (opens from the floating button)
- Chat bubbles, a text box and a 🎤 mic button
- Suggestion chips: *"Can I skip tomorrow?"*, *"DBMS attendance"*, *"Open calendar"*
- Example exchange:
  - **You:** how many classes can I bunk in FLAT
  - **BunkSmart:** You can skip 7 more Formal language and automata theory classes and stay ≥75% (now 92.0%).
- When it isn't sure, it asks back with chips: "Which subject do you mean? [Full Stack Development] [Product Development]"

### 8. Teacher Console
- Section picker (e.g. 5CS3) with today's classes, each with a **Cancel** button
- **Add extra class** form: subject, date, time and room
- **Events:** create and cancel
- **Deadlines:** post to the whole class
- **Classroom links:** a URL field per subject

### 9. Mobile app (student only, works offline)
- Bottom tabs: **Home** (dashboard), **Timetable**, **Calendar**, **Assistant**
- Banner when offline: "Offline · last synced 10:42"

---

## Part 2: PPT outline (8–10 slides)

1. **Title:** BunkSmart, "Know exactly when you can skip, and when you can't." Team names.
2. **Problem:** students don't know their real attendance standing until it's too late. The 75% rule causes stress, condonation fees and debarment. The timetable, attendance and deadlines all live in different places, and nobody tells you whether skipping this one class is safe.
3. **Problem statement #2:** Smart Timetable Planner. We merged it with attendance because that's the real pain point on our campus.
4. **Solution:** one screen showing per-subject attendance, a safe-to-skip count, the cost of the next miss, a semester projection, and a clash-free study plan.
5. **How it works (architecture):**
   - MITE ERP → secure sync (encrypted credentials) → Supabase database
   - Web app (Next.js) and mobile app (Expo, offline SQLite)
   - Shared core logic: attendance maths, study planner, assistant
   - Realtime: a teacher cancels a class and students see it instantly
6. **The maths (judges like this):**
   - Safe to skip = ⌊(present − 0.75 × held) / 0.75⌋
   - Must attend = ⌈(0.75 × held − present) / 0.25⌉
   - Example: 18/20 = 90%, so you can skip 4 more (18/24 = 75%)
7. **Our own assistant, no LLM:** a custom rule-based language engine. It understands "bunk", "skip" and "miss", subject nicknames (FLAT, DBMS, FSD) and dates ("tomorrow", "Friday"). It never makes up numbers, works offline, and needs no API costs. Voice input too.
8. **Teacher side:** one-tap cancel or extra class, events, deadlines and Classroom links, all reaching students live.
9. **Demo:** a live walkthrough (see the flow below).
10. **Future scope:** Kannada and Hindi in the assistant, push notifications ("you're at 76%, don't skip tomorrow"), the full Google Classroom API for assignments, and a college-wide rollout.

## Part 3: Demo flow (for the "Demo" slide and the rehearsal)
1. Log in as a student. The dashboard shows each subject in green, amber or red.
2. Ask the assistant: *"How many classes can I skip in DBMS?"* and then *"Can I skip tomorrow?"*
3. Log in as a teacher in a second window and cancel tomorrow's class. The student's timetable shows it struck through right away.
4. Add a quiz deadline. The study planner fills free slots around classes.
5. Open the mobile app in airplane mode. It still works.
