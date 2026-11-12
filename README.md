# BunkSmart

Know exactly when you can skip, and when you can't. BunkSmart is an attendance and timetable planner for MITE that syncs with the college ERP. Built for Problem Statement #2, Smart Timetable Planner.

- **Web** (`apps/web`): Next.js 15 + Supabase + Tailwind. Has the student dashboard, timetable, calendar, study planner, ERP sync, teacher console, and an assistant with voice input.
- **Mobile** (`apps/mobile`): an Expo student app that works offline from a SQLite cache.
- **Core** (`packages/core`): shared TypeScript for the attendance maths, IST date handling, the study planner, and the rule-based assistant (no LLM).

## Run the web app
```bash
npm install
npm run dev -w web            # http://localhost:3000
```
`apps/web/.env.local` needs these values (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ERP_ENC_KEY`, `DEMO_PASSWORD`, `NEXT_PUBLIC_DEMO=1`, `DEMO_SNAPSHOT=1`.

To seed the demo accounts and load the ERP snapshot (safe to run more than once):
```bash
npm run seed -w web
```
The demo accounts are `student1@demo.bunk`, `student2@demo.bunk`, `teacher@demo.bunk` and `admin@demo.bunk`. All use the `DEMO_PASSWORD` from `.env.local`. On the login page, the quick buttons log you straight in.

## Run the mobile app
```bash
cd apps/mobile && npx expo start
```
Scan the QR code with Expo Go, then log in as `student1@demo.bunk` with `DEMO_PASSWORD`. Once it has synced, turn on airplane mode: everything except Sync keeps working.

## Tests
```bash
npm test -w @bunk/core && npm test -w web
```

## Deploy (Vercel)
1. Import the repo into Vercel and set **Root Directory** to `apps/web`. Vercel detects the npm workspace.
2. Add the same env vars as in `.env.local`.
3. Deploy.

## How the ERP sync works
`erp.mite.ac.in` uses a Keycloak login (realm `mite`, client `admissions-ui`) with a JSON API under `/academics-api/query/*`. The sync logs in (direct grant first, falling back to a headless browser if Playwright is installed) and fetches the attendance session logs, the timetable and the academic calendar. It then upserts them into Supabase and never deletes anything. ERP passwords are stored encrypted with AES-256-GCM. When `DEMO_SNAPSHOT=1` is set and a user has no ERP credentials, the sync loads `apps/web/fixtures/erp-snapshot.json` instead, which is real data with the student's name and USN removed. That way the demo never depends on the ERP being up.
