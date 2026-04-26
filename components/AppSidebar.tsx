"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchMembers, fetchClasses, fetchBookings, fetchEquipment,
  fetchAnalytics, fetchInventory, fetchTeam,
} from "@/lib/api/gym";
import {
  fetchOrders, fetchMenuItems, fetchTables, fetchReservations,
  fetchStaff as fetchFnbStaff, fetchAnalytics as fetchFnbAnalytics,
} from "@/lib/api/fnb";
import {
  LayoutDashboard,
  ShoppingCart,
  Monitor,
  LayoutGrid,
  CalendarCheck,
  UtensilsCrossed,
  Package,
  Users,
  BarChart2,
  Settings,
  LogOut,
  Store,
  Building2,
  Gift,
  ScanLine,
  CreditCard,
  CalendarDays,
  BookOpen,
  Dumbbell,
  UserCheck,
  Heart,
  Banknote,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navConfig, gymNavConfig, GYM_NAV_GROUPS, type UserRole } from "@/config/nav";
import type { GymRole } from "@/config/business-types";
import { API } from "@/lib/api";

// ─── Icon Registry ────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  ShoppingCart,
  Monitor,
  LayoutGrid,
  CalendarCheck,
  UtensilsCrossed,
  Package,
  Users,
  BarChart2,
  Settings,
  Building2,
  Gift,
  ScanLine,
  CreditCard,
  CalendarDays,
  BookOpen,
  Dumbbell,
  UserCheck,
  Heart,
  Banknote,
};

// ─── Role Labels ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  client_admin: "Admin",
  staff: "Staff",
  gym_owner: "Gym Owner",
  gym_manager: "Gym Manager",
  trainer: "Trainer",
  front_desk: "Front Desk",
  member: "Member",
};

// ─── Roles that should get full gym nav access ────────────────────────────────
// client_admin / admin are generic roles assigned before a business type is
// configured. Treat them the same as gym_owner so the full sidebar is visible.
const GYM_FULL_ACCESS_ROLES = [
  "client_admin",
  "admin",
  "gym_owner",
  "super_admin",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserInfo {
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface Props {
  role: string;
  businessType?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AppSidebar({
  role,
  businessType = "",
  ...props
}: Props & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const PREFETCH_MAP: Record<
    string,
    { queryKey: unknown[]; queryFn: () => Promise<unknown>; staleTime?: number }
  > = React.useMemo(
    () => ({
      "/portal/members":   { queryKey: ["members"],        queryFn: () => fetchMembers(),          staleTime: 5 * 60 * 1000 },
      "/portal/classes":   { queryKey: ["classes", today], queryFn: () => fetchClasses(today) },
      "/portal/bookings":  { queryKey: ["bookings"],       queryFn: () => fetchBookings() },
      "/portal/equipment": { queryKey: ["equipment"],      queryFn: () => fetchEquipment(),        staleTime: 10 * 60 * 1000 },
      "/portal/analytics": { queryKey: ["analytics"],      queryFn: () => fetchAnalytics() },
      "/portal/inventory": { queryKey: ["inventory"],      queryFn: () => fetchInventory() },
      "/portal/team":      { queryKey: ["team"],           queryFn: () => fetchTeam(),             staleTime: 10 * 60 * 1000 },
      // F&B routes
      "/portal/orders":       { queryKey: ["orders"],              queryFn: () => fetchOrders(),           staleTime: 30 * 1000 },
      "/portal/menu":         { queryKey: ["menu", "items"],       queryFn: () => fetchMenuItems(),        staleTime: 10 * 60 * 1000 },
      "/portal/tables":       { queryKey: ["tables"],              queryFn: () => fetchTables(),           staleTime: 60 * 1000 },
      "/portal/reservations": { queryKey: ["reservations"],        queryFn: () => fetchReservations(),     staleTime: 2 * 60 * 1000 },
    }),
    [today],
  );

  function handleNavHover(href: string) {
    const config = PREFETCH_MAP[href];
    if (!config) return;
    queryClient.prefetchQuery(config);
  }

  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [tenantName, setTenantName] = React.useState("Vortiva");

  // ── Fetch current user info ────────────────────────────────────────────────
  React.useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setUser({
          full_name: d.full_name,
          email: d.email,
          avatar_url: d.avatar_url,
        });
        if (d.tenant?.name) setTenantName(d.tenant.name);

        // ── Fallback: derive businessType from JWT if prop is empty ──────────
        // This handles cases where the middleware header wasn't forwarded.
        if (!businessType && d.tenant?.business_type) {
          // We can't mutate the prop, but we can store it for nav resolution.
          // The parent layout should fix the header — this is a safety net only.
          console.warn(
            "[AppSidebar] businessType prop is empty. " +
              "Expected x-business-type header from middleware. " +
              "Falling back to tenant.business_type from /me response:",
            d.tenant.business_type,
          );
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resolve effective businessType ─────────────────────────────────────────
  // Normalise to lowercase and trim so "Gym", "GYM", " gym " all match.
  const effectiveBusinessType = (businessType ?? "").toLowerCase().trim();

  // ── Build nav items ────────────────────────────────────────────────────────
  const navItems = React.useMemo(() => {
    if (effectiveBusinessType === "gym") {
      return gymNavConfig.filter((item) => {
        // roles: [] on an item means "visible to everyone"
        if (item.roles.length === 0) return true;
        // Generic admin roles get full access
        if (GYM_FULL_ACCESS_ROLES.includes(role)) return true;
        // Otherwise check the specific gym role
        return item.roles.includes(role as GymRole);
      });
    }

    // Default: F&B / generic nav
    return navConfig.filter((item) => item.roles.includes(role as UserRole));
  }, [effectiveBusinessType, role]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    await fetch(`${API}/api/v1/auth/logout/cookie`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    })
      .catch(() => {})
      .finally(() => clearTimeout(t));

    // Clear all auth cookies client-side as a fallback
    ["access_token", "refresh_token", "user-info"].forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    });

    router.push("/");
  }

  // ── User avatar initials ───────────────────────────────────────────────────
  const initials =
    user?.full_name
      ?.split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") ?? "?";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        {/* ── Header: Tenant + Role ── */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<div className="cursor-default" />}
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                  <Store className="size-4" />
                </div>
                <div className="flex flex-col leading-none min-w-0">
                  <span className="font-semibold text-sm truncate">
                    {tenantName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* ── Navigation ── */}
        <SidebarContent className="overflow-y-auto">
          {effectiveBusinessType === "gym" ? (
            GYM_NAV_GROUPS.map((group) => {
              const items = navItems.filter((item) => (item as { group?: string }).group === group);
              if (items.length === 0) return null;
              return (
                <SidebarGroup key={group}>
                  <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{group}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((item) => {
                        const Icon = ICONS[item.icon] ?? LayoutDashboard;
                        const active = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                              render={<a href={item.href} onMouseEnter={() => handleNavHover(item.href)} />}
                              isActive={active}
                              tooltip={item.label}
                            >
                              <Icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })
          ) : (
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No navigation items found.{" "}
                      <span className="opacity-50">(role: {role}, type: {effectiveBusinessType || "none"})</span>
                    </p>
                  ) : (
                    navItems.map((item) => {
                      const Icon = ICONS[item.icon] ?? LayoutDashboard;
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            render={<a href={item.href} onMouseEnter={() => handleNavHover(item.href)} />}
                            isActive={active}
                            tooltip={item.label}
                          >
                            <Icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* ── Footer: User Info + Logout ── */}
        <SidebarFooter>
          <SidebarMenu>
            {user && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  render={<div className="cursor-default" />}
                >
                  <div className="size-8 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col leading-none min-w-0">
                    <span className="text-sm font-medium truncate">
                      {user.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
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

      {/* ── Logout Confirmation Dialog ── */}
      {logoutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loggingOut && setLogoutOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-background rounded-xl border border-border shadow-2xl w-full max-w-xs p-6 space-y-4">
            <div className="space-y-1">
              <p id="logout-title" className="font-semibold text-base">
                Log out?
              </p>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out of your session?
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setLogoutOpen(false)}
                disabled={loggingOut}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loggingOut ? (
                  <>
                    <span className="size-3.5 rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground animate-spin" />
                    Logging out…
                  </>
                ) : (
                  "Log out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
