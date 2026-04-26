# vortiva-legendary-client-portal — Progress Status

## Reference Document
`c:\development-projects\vortiva-erp\food and beverage business type modules.md`

## Business Type Coverage
- **Food & Beverage (Restaurant)** — frontend 100% ✅
- **Gym & Fitness** — frontend 100% ✅ (all 11 modules + React Query infrastructure)
- Retail, Salon & Spa, Bakery, Clinic — defined in config, status: coming_soon

## Tech Stack
- Next.js 16.2.4, React 19, TypeScript 5
- Tailwind CSS v4 (CSS-first, no tailwind.config.js)
- shadcn/ui 4.4.0, radix-ui, lucide-react 1.11.0
- Zustand, @tanstack/react-table, recharts
- @tanstack/react-query 5.100.5 + devtools
- pnpm (NOT npm)

## Frontend Pages — ✅ Complete

### F&B (Restaurant)
Dashboard, Orders, KDS, Tables, Inventory, Menu Builder, Your Team, Analytics, Settings, Tenants, Reservations, Loyalty & CRM

### Gym & Fitness
Dashboard (business-type-aware), Check-In, Members, Members/[id], Memberships, Memberships/Renewals, Classes, Classes/Catalog, Bookings, Equipment, Equipment/Maintenance, Trainers, Trainers/[id], Attendance, Payments, Reports

### Member Self-Service Portal (`/member/*`) ✅
Layout (bottom nav), Dashboard, Classes, Bookings, Profile, Rewards

### Super Admin
Tenants (master-detail), Business Types

## Dashboard — Business-Type-Aware ✅ (fixed 2026-04-26)
- Reads `business_type` from `user-info` cookie
- Gym: fetches `/api/v1/gym/dashboard/stats` + `/api/v1/gym/checkins/today`
  - Cards: Today's Check-ins, Active Members, Classes Today, Expiring Soon
  - Table: today's check-in list
  - Quick actions: Check-In Member, View Members, Classes Today
- F&B: original stats + orders + Pusher real-time (unchanged)

## Sidebar — Grouped Navigation ✅ (2026-04-26)
- Gym sidebar: 6 labeled groups (Overview, Members, Schedule, Operations, Insights, System)
- F&B sidebar: flat "Navigation" group (unchanged)
- `config/nav.ts`: `GymNavItem.group` field + `GYM_NAV_GROUPS` constant
- Collapsed/icon mode: group labels hidden via `group-data-[collapsible=icon]:hidden`
- Hover prefetch preserved on all items

## React Query Infrastructure ✅
- `QueryProvider` wraps root layout
- `lib/api/gym.ts` + `lib/api/fnb.ts` — raw fetchers
- `hooks/useGymQueries.ts` + `hooks/useFnbQueries.ts` — query hooks
- `hooks/useGymMutations.ts` + `hooks/useFnbMutations.ts` — mutation hooks
- 6 F&B pages migrated to React Query (team, analytics, reservations, menu, inventory, loyalty)
- Gym pages still use `cachedFetch`/`useEffect` (migration deferred)

## Auth & Routing ✅
- Role-gated nav, portal layout route guard
- `proxy.ts` — JWT header forwarding, gym route guard
- `middleware.ts` — JWT cookie → `user-info` cookie
- Member portal (`/member/*`) guarded separately

## Shared Components ✅
AppSidebar (grouped gym nav, prefetch on hover), DashboardHeader, DataTable, MetricCard, StatusBadge, RoleGate, AddOnSelector, DateRangePicker, usePusher

## API Proxy
`app/api/v1/[...path]/route.ts` — forwards to `NEXT_PUBLIC_API_URL`

## Settings Tabs ✅
Profile, Business, Password, Notifications, Branding, Payments, Tax, Devices, Audit Log
