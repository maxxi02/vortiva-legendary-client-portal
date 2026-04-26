# Vortiva Legendary Client Portal — React Query Implementation

## Status: COMPLETE as of 2026-04-26

---

## Infrastructure

| File | Purpose |
|---|---|
| `providers/QueryProvider.tsx` | QueryClient, staleTime 5min, gcTime 10min, refetchOnWindowFocus/Mount false, retry 1, ReactQueryDevtools |
| `app/layout.tsx` | Wraps `<TooltipProvider>` with `<QueryProvider>` |
| `lib/api/gym.ts` | 12 raw fetchers for `/api/v1/gym/...` with AbortSignal |
| `lib/api/fnb.ts` | 12 raw fetchers for `/api/v1/restaurant/...`, `/api/v1/inventory/...`, `/api/v1/staff`, `/api/v1/loyalty/...` |
| `hooks/useGymQueries.ts` | 12 React Query hooks for gym |
| `hooks/useFnbQueries.ts` | 12 React Query hooks for F&B |
| `hooks/useGymMutations.ts` | 10 mutation hooks for gym |
| `hooks/useFnbMutations.ts` | 12 mutation hooks for F&B |

## Migrated Pages (useQuery + useMutation)

| Page | Query keys | Notes |
|---|---|---|
| `team/page.tsx` | `["staff"]` | useMutation for invite, manual invalidate for patch |
| `analytics/page.tsx` | `["analytics"]` | read-only |
| `reservations/page.tsx` | `["reservations"]` | save + status mutations |
| `menu/page.tsx` | `["menu","categories"]` + `["menu","items"]` | 4 mutations |
| `inventory/page.tsx` | `["inventory","products"]` + `["inventory","categories"]` | restock/add/sell mutations |
| `loyalty/page.tsx` | `["loyalty","customers"]` + gym segment stats + gym badges | points + campaign mutations |

## NOT migrated (real-time, intentionally kept as-is)
- `orders`, `orders/new`, `kds`, `tables`, `dashboard` (Pusher real-time)

## AppSidebar Prefetch on Hover
Gym: `/portal/members`, `/portal/classes`, `/portal/bookings`, `/portal/equipment`, `/portal/analytics`, `/portal/inventory`, `/portal/team`
F&B: `/portal/orders`, `/portal/menu`, `/portal/tables`, `/portal/reservations`

---

## Original in-memory cache (still used by gym pages)
`lib/cache.ts` — `cachedFetch<T>(url, ttlMs, init?)`, `cacheInvalidate(...prefixes)`
All gym pages (`members`, `memberships`, `classes`, `bookings`, `equipment`, `checkin`, `trainers`, `attendance`, `payments`, `reports`) still use `cachedFetch`/`useEffect` — migration deferred.
