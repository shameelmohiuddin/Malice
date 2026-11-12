# ClassPilot API (v1)

This is the contract the frontend talks to. Any UI (the new design, the mobile app, or a script) only needs these endpoints.

- **Auth:** Supabase session cookie. Log in with `supabase.auth.signInWithPassword` or the `/login` page. Calls without a session get a `401`.
- **Envelope:** success is `{ ok: true, data }`. Errors are `{ ok: false, error, message }`, where `error` is one of `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `INVALID` (400), `NOT_FOUND` (404), `RATE_LIMITED` (429) or `SERVER` (500).
- **Formats:** dates are IST `YYYY-MM-DD`, times are `HH:MM`, and percentages are numbers such as `92.3`.
- **Advice values:** `"safe"` (ok to skip), `"risky"` (amber) and `"must"` (don't skip).

## Student

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/api/v1/me` | – | `{ id, email, name, role, section, minAttendance, erp: { connected, usn, lastSync, lastError } }` |
| GET | `/api/v1/dashboard` | – | `{ date, minAttendance, lastSync, overall: { present, held, percent }, nearLimit, courses: CourseView[], today: TodayClass[] }` |
| GET | `/api/v1/timetable` | `?from&to` (default: this Mon–Sat) | `{ from, to, today, slots: Slot[], events: Event[] }` |
| GET | `/api/v1/calendar` | – | `{ today, events: Event[], deadlines: Deadline[] }` |
| GET | `/api/v1/planner` | – | `{ today, deadlines, blocks: { date, start, end, deadlineId, title }[], unplaced: { deadlineId, hoursShort }[] }` |
| GET | `/api/v1/deadlines` | – | `Deadline[]` (class-wide plus your personal ones) |
| POST | `/api/v1/deadlines` | `{ title, due, kind: "exam"\|"quiz"\|"assignment", courseCode? }` | the created personal `Deadline` (201) |
| DELETE | `/api/v1/deadlines/:id` | – | `{ id }`. You can only delete your own personal deadlines. |
| POST | `/api/v1/assistant` | `{ text }` (max 300 chars) | `{ text, navigate?, openUrl?, options? }` |
| PATCH | `/api/v1/settings` | `{ minAttendance: 50..95 }` | `{ minAttendance }` |
| POST | `/api/erp/sync` | `{}` to sync now, or `{ usn, password }` to connect | `{ ok, counts }` or `{ ok:false, error: "ERP_AUTH"\|"ERP_DOWN"\|"NO_CREDS"\|"RATE_LIMITED", message }`. New credentials are saved only if the ERP accepts them. There's a 60 s cooldown between syncs. |

### Shapes
```ts
CourseView = {
  code, name, present, held, plannedTotal,
  percent,            // 90.0
  advice,             // "safe" | "risky" | "must"
  canSkip,            // classes you can still miss and stay ≥ minimum
  mustAttend,         // classes in a row needed to get back to the minimum
  skipNext: { before, after, drop },                       // 90 → 85.7 (−4.3)
  semester: { remaining, canMissRemaining, finalIfAllAttended },
  classroomUrl,       // string | null (only https://classroom.google.com/…)
}
TodayClass = Slot & { courseName, advice: Advice | null }  // null when the class is cancelled
Slot = { date, start, end, courseCode|null, kind, room|null, cancelled, extra, courseName?, classroomUrl?, advice? }
     // courseCode null = BREAK/LUNCH
Event = { id, title, start, end, category, isHoliday, cancelled }
Deadline = { id, courseCode|null, title, due, kind, scope: "class"|"personal" }
```

## Teacher / admin (403 for students)

| Method | Path | Body / query |
|---|---|---|
| GET | `/api/v1/teacher/day` | `?section=5CS3&date=YYYY-MM-DD` returns `{ classes: { start, end, courseCode, courseName, room, cancelled, overrideId, extra? }[] }` |
| POST | `/api/v1/teacher/overrides` | `{ action: "cancel"\|"extra", section, courseCode, date, start, end, room? }` |
| DELETE | `/api/v1/teacher/overrides/:id` | Undoes a cancel or extra class |
| POST | `/api/v1/teacher/events` | `{ title, start, end?, category? }` |
| PATCH | `/api/v1/teacher/events/:id` | `{ cancelled: boolean }` (only events created in the app; ERP events are read-only) |
| POST | `/api/v1/teacher/deadlines` | `{ title, due, kind, courseCode?, section }` |
| PATCH | `/api/v1/teacher/courses/:code` | `{ classroomUrl: string\|null }` |

## Realtime
Subscribe with Supabase Realtime to `schedule_overrides`, `events` and `deadlines`, then refetch when they change. That's how a teacher's cancellation shows up instantly for students.

## Auto-sync
`GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET` syncs every connected student, one at a time, skipping anyone synced in the last 30 minutes. Point any cron at it, e.g. every 30 minutes.
