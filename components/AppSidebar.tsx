"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, ShoppingCart, Monitor, LayoutGrid,
  CalendarCheck, UtensilsCrossed, Package, Users,
  BarChart2, Settings, LogOut, Store, Building2, Gift,
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar"
import { navConfig, type UserRole } from "@/config/nav"

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Monitor, LayoutGrid,
  CalendarCheck, UtensilsCrossed, Package, Users,
  BarChart2, Settings, Building2, Gift,
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  client_admin: "Admin",
  staff: "Staff",
}

interface Props {
  role: string
}

export function AppSidebar({ role, ...props }: Props & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const [logoutOpen, setLogoutOpen] = React.useState(false)
  const [user, setUser] = React.useState<{ full_name: string; email: string; avatar_url?: string } | null>(null)

  React.useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser({ full_name: d.full_name, email: d.email, avatar_url: d.avatar_url }))
      .catch(() => {})
  }, [])

  const navItems = navConfig.filter(item => item.roles.includes(role as UserRole))

  async function handleLogout() {
    await fetch("/api/v1/auth/logout/cookie", { method: "POST", credentials: "include" }).catch(() => {})
    router.push("/")
  }

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<div className="cursor-default" />}>
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Store className="size-4" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-sm">Vortiva</span>
                  <span className="text-xs text-muted-foreground">{ROLE_LABELS[role] ?? role}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(item => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard
                  const active = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<a href={item.href} />}
                        isActive={active}
                        tooltip={item.label}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {/* User avatar card */}
            {user && (
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" render={<div className="cursor-default" />}>
                  <div className="size-8 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt={user.full_name} className="size-full object-cover" />
                      : <span className="text-sm font-semibold text-muted-foreground">{user.full_name?.[0]?.toUpperCase() ?? "?"}</span>
                    }
                  </div>
                  <div className="flex flex-col leading-none min-w-0">
                    <span className="text-sm font-medium truncate">{user.full_name}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setLogoutOpen(true)}
                tooltip="Log out"
              >
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Logout confirmation dialog */}
      {logoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogoutOpen(false)} />
          <div className="relative bg-background rounded-lg border border-border shadow-xl w-full max-w-xs p-5 space-y-4">
            <p className="font-semibold">Log out?</p>
            <p className="text-sm text-muted-foreground">Are you sure you want to log out of your session?</p>
            <div className="flex gap-2">
              <button onClick={() => setLogoutOpen(false)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleLogout} className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-opacity">Log out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
