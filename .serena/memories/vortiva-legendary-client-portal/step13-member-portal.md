# Step 13 — Member Self-Service Portal `/member/*`

**Last updated:** 2026-04-26

## Status\nALL TASKS COMPLETE as of 2026-04-26.

## Completed
- **Task 1 ✅** `proxy.ts` — `/member` guarded: no session → login, member role → `/member/*`, non-member → `/portal/dashboard`, member blocked from `/portal`
- **Task 2 ✅** `app/member/layout.tsx` — `"use client"`, fixed bottom nav (5 items: Home, Classes, Bookings, Rewards, Profile), `max-w-lg mx-auto`, `pb-20`, `backdrop-blur`

## Pending Tasks
- **Task 3 ✅** `app/member/dashboard/page.tsx`
- **Task 4 ✅** `app/member/classes/page.tsx`
- **Task 5 ✅** `app/member/bookings/page.tsx`
- **Task 6 ✅** `app/member/profile/page.tsx`
- **Task 7 ✅** `app/member/rewards/page.tsx`