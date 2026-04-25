# vortiva-legendary-client-portal

## Purpose
Restaurant Management Portal (F&B ERP) — unified, role-gated web app for three roles: Admin, Manager, Staff. Single codebase, dynamic sidebar per role.

## Tech Stack
- Next.js 16.2.4 (App Router, TypeScript)
- React 19.2.4
- Tailwind CSS v4 (CSS-first, no tailwind.config.js — config in globals.css via @theme)
- shadcn/ui 4.4.0 (components in components/ui/, CLI: `pnpm dlx shadcn@latest add <component>`)
- radix-ui (unified package, not @radix-ui/react-*)
- lucide-react 1.11.0
- clsx + tailwind-merge (cn() in lib/utils.ts)
- tw-animate-css
- Package manager: pnpm

## External Backend Integration
- Backend: NeonDB (user-managed, separate system)
- Frontend connects via API proxy at `/api/v1/*`
- No additional backend dependencies needed

## Next.js 16 Notes
- Middleware file is `proxy.ts` (NOT `middleware.ts` — that convention is deprecated in Next.js 16)
- Export function must be named `proxy`, config export is `config`

## Path alias
@/* maps to ./* (project root)

## Tailwind v4 notes
- Config is CSS-only in app/globals.css using @theme { } block
- Custom tokens already defined (colors, radius, sidebar, chart vars)
- Uses oklch color space
- @import "tailwindcss", @import "tw-animate-css", @import "shadcn/tailwind.css"
