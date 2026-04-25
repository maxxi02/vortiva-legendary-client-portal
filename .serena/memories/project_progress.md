# vortiva-legendary-client-portal — Progress Status

## Reference Document
`c:\development-projects\vortiva-erp\food and beverage business type modules.md`

## Business Type Coverage
- **Food & Beverage (Restaurant)** — frontend 100% ✅ (backend already built by user)
- Retail, Salon & Spa, Bakery, Gym & Fitness, Clinic — defined in config, status: coming_soon
- Business type config: `config/business-types.ts` — single source of truth (key, label, description, icon, status)

## Super Admin Pages
- `app/portal/tenants/page.tsx` — master-detail: info + billing tabs, BizTypeBadge for business_type
- `app/portal/business-types/page.tsx` — platform business type availability cards (live/beta/coming_soon)
- Nav: Tenants + Business Types (super_admin only), Settings (all roles)

## Frontend Pages (app/portal/) — ✅ 100% done (F&B)

### ✅ Completed
| Module | Path |
|---|---|
| Dashboard | `app/portal/dashboard/page.tsx` |
| Orders (list + new) | `app/portal/orders/` |
| KDS | `app/portal/kds/page.tsx` |
| Tables | `app/portal/tables/page.tsx` |
| Inventory | `app/portal/inventory/page.tsx` |
| Menu Builder | `app/portal/menu/page.tsx` |
| Your Team | `app/portal/team/page.tsx` |
| Analytics | `app/portal/analytics/page.tsx` |
| Settings | `app/portal/settings/page.tsx` (address editable by client_admin) |
| Tenants (super_admin) | `app/portal/tenants/page.tsx` (master-detail: info + billing tabs) |
| Reservations | `app/portal/reservations/page.tsx` |
| Loyalty & CRM | `app/portal/loyalty/page.tsx` |

## Auth & Routing — ✅ Done (Frontend)
- Role-gated nav config (`config/nav.ts`)
- Portal layout route guard — redirects by role using nav config
- Login routes by role (super_admin → /portal/tenants, others → /portal/dashboard)
- Already-logged-in redirect on login page
- super_admin blocked from all tenant-scoped pages
- `middleware.ts` — ✅ protects /portal routes, reads role from cookie, forwards as header

## Shared Components — ✅ All Done
- `AppSidebar` (avatar + logout), `DashboardHeader` (branch selector + notification bell)
- `DataTable`, `MetricCard`, `StatusBadge`, `RoleGate`
- `AddOnSelector` — multi-select add-on picker with quantity support
- `DateRangePicker` — calendar date range picker, wired into Analytics
- `hooks/usePusher.ts` — shared Pusher singleton hook
- `config/nav.ts` — role-gated nav config
- `config/business-types.ts` — business type definitions (key, label, icon, status)
- Full `components/ui/` set

## Real-time (Pusher)
- KDS: listens to `kds/ticket.updated` + `kds/order.created`
- Dashboard: listens to `orders/order.created` + `orders/order.updated`
- Env vars needed: `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`

## QR Code
- Menu Builder: "QR Code" button generates QR pointing to `{origin}/menu`, downloadable PNG
- Uses `qrcode` package (installed)

## API Proxy
- `app/api/v1/[...path]/route.ts` — catch-all forwards all `/api/v1/*` to backend at `NEXT_PUBLIC_API_URL`
- `middleware.ts` — protects /portal routes, reads JWT from `access_token` cookie, caches role in `user-info` cookie

## Settings Tabs — ✅ All Done
Profile, Business (address editable by client_admin), Password, Notifications, Branding, Payments, Tax, Devices, Audit Log

## Shared Components — Done
- `AppSidebar`, `DashboardHeader` — layout shell
- `DataTable`, `MetricCard`, `StatusBadge`, `RoleGate` — portal components
- Full `components/ui/` set (sidebar, tooltip, button, card, badge, table, etc.)
- `config/nav.ts` — role-gated nav config

## Backend — ✅ Complete (External)
- User has existing backend with NeonDB
- API proxy configured: `/api/v1/*` forwards to `NEXT_PUBLIC_API_URL`
- Authentication via JWT cookies (`access_token`, `user-info`)
- Real-time ready (Pusher integration points in frontend)

## Tech Stack
- Next.js 16.2.4, React 19, TypeScript 5
- Tailwind CSS v4 (CSS-first, no tailwind.config.js)
- shadcn/ui 4.4.0, radix-ui, lucide-react 1.11.0
- Zustand, @tanstack/react-table, recharts
- pnpm (NOT npm)
- @base-ui/react 1.4.1 (just installed)
