"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { navConfig, type UserRole } from "@/config/nav";
import { API } from "@/lib/api"

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
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  client_admin: "Admin",
  staff: "Staff",
};


interface Props {
  role: string;
}

export function AppSidebar({
  role,
  ...props
}: Props & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [user, setUser] = React.useState<{
    full_name: string;
    email: string;
    avatar_url?: string;
  } | null>(null);
  const [tenantName, setTenantName] = React.useState("Vortiva");

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
      })
      .catch(() => {});
  }, []);

  const navItems = navConfig.filter((item) =>
    item.roles.includes(role as UserRole),
  );

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
    router.push("/");
  }

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<div className="cursor-default" />}
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Store className="size-4" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-sm">{tenantName}</span>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[role] ?? role}
                  </span>
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
                {navItems.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
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
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

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
                        {user.full_name?.[0]?.toUpperCase() ?? "?"}
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

      {logoutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in-fade"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loggingOut && setLogoutOpen(false)}
          />
          <div className="relative bg-background rounded-xl border border-border shadow-2xl w-full max-w-xs p-6 space-y-4 animate-dialog-in">
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
                {loggingOut && (
                  <span className="size-3.5 rounded-full border-2 border-destructive-foreground/40 border-t-destructive-foreground animate-spin" />
                )}
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
