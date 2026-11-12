# ClassPilot: Manual Test Run (12 Nov 2026)

I ran the app as each kind of user (logged out, student, teacher, and a student going straight to the database) against the live Supabase project, with the real ERP data synced. Problems were logged during the run, fixed afterwards, and then re-tested the same way.

**Result:** 58 checks. 47 passed first time, 10 failed and are now fixed and re-verified, and 1 was only partly checked (sign-up). One more hardening issue came out of the security pass (M8), so there are 11 fixes in total. 3 areas were not covered (listed below).

## 1. Auth and roles
| # | Check | Result |
|---|---|---|
| A1 | Logged out: `/dashboard`, `/teacher` and `/` redirect to login | Pass |
| A2 | Logged out: `GET /api/v1/dashboard` returns 401 | Pass |
| A3 | Wrong password shows "Invalid login credentials" | Pass |
| A4 | Demo Student button opens `/dashboard` | Pass |
| A5 | Demo Teacher button opens `/teacher` | Pass |
| A6 | Log out returns to `/login` | Pass |
| A7 | Student opening `/teacher` is redirected | Pass |
| A8 | Sign up with a new email | Partial: Supabase rejects the made-up `.classpilot` domain. Real college emails are fine, but I didn't sign up with one because that would send a real confirmation email |

## 2. Student
| # | Check | Result |
|---|---|---|
| S1 | Dashboard overall 92.3% (143/155) matches the ERP | Pass |
| S2 | EMF 78.6% → 73.3% on the next miss, "can miss 3 of 11 left" (hand-checked) | Pass |
| S3 | Riskiest subject listed first, "1 subject near the limit" | Pass |
| S4 | Today's classes in time order, breaks and lunch hidden | Pass |
| S5 | Classes that already ended today show no skip advice | **Fixed** (M1) |
| S6 | Timetable week view, Prev/Next, CIE and lab-test weeks have no classes, holidays shown | Pass |
| S7 | Timetable `?week=garbage` falls back to this week | Pass |
| S8 | Calendar lists all ERP events and holidays | Pass |
| S9 | Add a DBMS quiz due tomorrow: 2h of study placed today after the last class | Pass |
| S10 | That quiz makes Friday's DBMS class "don't skip" (deadline) | Pass |
| S11 | Remove the deadline | Pass |
| S12 | Settings → Sync now (demo snapshot): 155 records, 344 slots, 22 events | Pass |
| S13 | Settings shows when you last synced | **Fixed** (M5) |
| S14 | Minimum 80%: CN 20/23 becomes "can skip 2", amber | Pass |
| S15 | Minimum "abc" or 101 is rejected | Pass |
| S16 | Clarify chip from an earlier question answers that earlier question | Pass |

## 3. Assistant
| # | Question | Answer | Result |
|---|---|---|---|
| Q1 | how many classes of my DBMS can I skip | You can skip the next 7 DBMS classes. | Pass |
| Q2 | how many CN classes can I skip | You can skip the next 3 CN classes and the next 5 lab sessions. | Pass |
| Q3 | can i bunk cn lab | You can skip the next 5 CN lab sessions. | **Fixed** (M2). It used to say "CN classes" |
| Q4 | can i skip tomorrow | Lists Friday's classes with advice for each | Pass |
| Q5 | can I skip dbms tomorrow (quiz that day) | don't skip (deadline) | Pass |
| Q6 | when is my next class | Next: … with day, time and room | Pass |
| Q7 | what is my attendance in quantum physics? | I don't have a subject called "quantum physics". Pick one: | Pass |
| Q8 | open planner / open classroom for fsd | Goes to the planner / opens the Classroom link | Pass |
| Q9 | events on 14th | Sat 14 Nov: PTM-1 | Pass |

## 4. Teacher
| # | Check | Result |
|---|---|---|
| T1 | Cancel a class: struck through, with Undo | Pass |
| T2 | Cancelling the same class twice is refused | **Fixed** (I2). It used to create a duplicate, and Undo then left the class cancelled |
| T3 | Cancelling a class that doesn't exist is refused | **Fixed** (I3). It used to be accepted and also lowered the semester projection |
| T4 | An extra class that clashes with a class or another extra is refused | **Fixed** (I4) |
| T5 | An extra class in a free slot, or a slot freed by a cancellation, is allowed | Pass |
| T6 | An extra class with end before start is refused | Pass |
| T7 | Create an event, then cancel it: the student sees it as cancelled | Pass |
| T8 | An event ending before it starts is refused | Pass |
| T9 | Trying to cancel an ERP calendar event says it can't be changed | **Fixed** (M3). It used to answer "cancelled: true" |
| T10 | A class deadline reaches the student and makes that class "don't skip" | Pass |
| T11 | A `javascript:` Classroom link is refused, a real Classroom link is saved and shown to students | Pass |
| T12 | Setting the Classroom link of an unknown course returns 404 | **Fixed** (M4) |
| T13 | Teacher day list and student timetable are in time order (extras included) | **Fixed** (M6) |
| T14 | Undo restores the class, and a second Undo returns 404 | Pass |

## 5. Live updates
| # | Check | Result |
|---|---|---|
| R1 | A teacher change appears on an open student page without a reload | **Fixed** (I1). The socket was connecting before the login was attached, so the database rules hid every change from it. It's now verified live: SUBSCRIBED, and the change appeared within 5 seconds |

## 6. Security (student using their own login token directly against the database)
| # | Attempt | Result |
|---|---|---|
| X1 | Promote self to teacher | Blocked ("only admins can change roles") |
| X2 | Insert a cancellation, event or class deadline | Blocked (database rules) |
| X3 | Read other users' attendance, ERP credentials or profiles | Returns nothing |
| X4 | Edit own attendance numbers | No effect |
| X5 | Set minimum attendance to 0 | Blocked (database constraint) |
| X6 | Change a Classroom link | No effect. Teachers are now also limited to Classroom links at the database level (M8) |
| X7 | Student calling the teacher API | 403 |

## 7. ERP
| # | Check | Result |
|---|---|---|
| E1 | Live sync with real credentials | Pass (155 records) |
| E2 | A second sync within 60 s | 429 "Try again in Ns" |
| E3 | Auto-sync endpoint without the secret / with it | 403 / runs and skips recent syncs |

## Not covered
- **Mobile app on a phone.** It needs Expo Go on your device. The Android bundle builds and the code type-checks.
- **Wrong ERP password against the real ERP.** I didn't attempt failed logins on the college system. This is covered by automated tests instead.
- **Calendar date ranges across a month** show "31 Oct – 3". That's in the current frontend, which is being replaced by the new design.

## Fix summary
| ID | Problem | Fix | Verified by |
|---|---|---|---|
| I1 | Live updates never arrived | Attach the user's token to the socket before subscribing | Live: page updated without a reload |
| I2 | Duplicate cancellations | Unique rule in the database, plus a clear error | API 400 and automated test |
| I3 | Cancelling a nonexistent class | Check the section's timetable first | API 400 |
| I4 | Extra classes could clash | Overlap check against classes and extras | API 400 (both cases) and automated test |
| M1 | Advice shown for finished classes | `past` flag, no advice once a class has ended | API at 11:27 IST and automated test |
| M2 | Lab question answered as "classes" | Lab-aware wording | Live API and automated test |
| M3 | ERP event "cancelled: true" | 404 with an explanation | API |
| M4 | Unknown course link "updated" | 404 | API |
| M5 | "Last sync: never" after a demo sync | Store `profiles.synced_at` | API |
| M6 | Extra classes out of order | Sort after merging | API and automated test |
| M8 | Teacher could store any link directly in the database | Database rule: Classroom links only | Migration applied |
