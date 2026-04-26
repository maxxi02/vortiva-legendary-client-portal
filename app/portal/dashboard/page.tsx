"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  Package,
  Table2,
  ShoppingCart,
  Dumbbell,
  CalendarCheck,
  UserCheck,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePusherChannel } from "@/hooks/usePusher";
import { API } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
type FnbStats = {
  today_sales: number;
  low_stock_items: number;
  staff_on_shift: number;
  active_tables: number;
  total_tables: number;
};

type GymStats = {
  today_checkins: number;
  active_members: number;
  classes_today: number;
  expiring_soon: number;
};

type Order = {
  id: string;
  table_id: string | null;
  status: string;
  total: number;
  created_at: string;
  items: { name: string }[];
};

type CheckIn = {
  id: string;
  member_name: string;
  checked_in_at: string;
  membership_plan?: string;
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  preparing: "outline",
  ready: "default",
  served: "default",
  paid: "default",
  cancelled: "destructive",
};

// ── businessType resolver ──────────────────────────────────────────────────────
// Tries multiple sources in priority order so we never miss the gym type.
function resolveBusinessType(): string {
  if (typeof document === "undefined") return "";

  const cookies = Object.fromEntries(
    document.cookie.split("; ").map((c) => {
      const [k, ...v] = c.split("=");
      return [k.trim(), v.join("=")];
    }),
  );

  // 1. Try user-info cookie (JSON blob)
  try {
    const info = JSON.parse(decodeURIComponent(cookies["user-info"] ?? "{}"));
    const bt =
      info?.business_type ??
      info?.businessType ??
      info?.tenant?.business_type ??
      info?.tenant?.businessType ??
      "";
    if (bt) return bt.toLowerCase().trim();
  } catch {
    /* ignore */
  }

  // 2. Try decoding the access_token JWT payload
  try {
    const token = cookies["access_token"] ?? "";
    if (token) {
      const [, b64] = token.split(".");
      const payload = JSON.parse(
        atob(b64.replace(/-/g, "+").replace(/_/g, "/")),
      );
      const bt =
        payload?.business_type ??
        payload?.businessType ??
        payload?.tenant?.business_type ??
        payload?.tenant?.businessType ??
        "";
      if (bt) return bt.toLowerCase().trim();
    }
  } catch {
    /* ignore */
  }

  // 3. Fallback: read x-business-type from a meta tag if SSR injected it
  try {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="x-business-type"]',
    );
    if (meta?.content) return meta.content.toLowerCase().trim();
  } catch {
    /* ignore */
  }

  return "";
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {label}
          </p>
          <div
            className={`size-7 rounded flex items-center justify-center ${accent ? "bg-accent" : "bg-muted"}`}
          >
            <Icon
              className={`size-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>
        </div>
        <p
          className={`text-3xl font-semibold tracking-tight ${accent ? "text-primary" : ""}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
          <div className="size-7 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-16 rounded bg-muted animate-pulse" />
        <div className="h-2.5 w-28 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="px-4 pb-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const today = useMemo(() => new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }), []);
  const businessType = useMemo(() => resolveBusinessType(), []);
  const [fnbStats, setFnbStats] = useState<FnbStats | null>(null);
  const [gymStats, setGymStats] = useState<GymStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (businessType === "gym") {
      Promise.all([
        fetch(`${API}/api/v1/gym/dashboard/stats`, {
          credentials: "include",
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/api/v1/gym/checkins/today`, {
          credentials: "include",
        }).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([s, c]) => {
          setGymStats(s);
          setCheckins(Array.isArray(c) ? c : []);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        fetch(`${API}/api/v1/tenant/dashboard/stats`, {
          credentials: "include",
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/api/v1/restaurant/orders`, {
          credentials: "include",
        }).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([s, o]) => {
          setFnbStats(s);
          setOrders(Array.isArray(o) ? o : []);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, []);

  // ── F&B real-time updates ────────────────────────────────────────────────────
  const refreshOrders = () => {
    if (businessType === "gym") return;
    fetch(`${API}/api/v1/restaurant/orders`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((o) => setOrders(Array.isArray(o) ? o : []))
      .catch(() => {});
  };
  usePusherChannel("orders", "order.created", refreshOrders);
  usePusherChannel("orders", "order.updated", refreshOrders);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isGym = businessType === "gym";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{today}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          Failed to load dashboard data. Make sure the backend is running.
        </div>
      )}

      {/* ── Metric cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : isGym ? (
          <>
            <StatCard
              label="Today's Check-ins"
              value={gymStats?.today_checkins ?? 0}
              sub="members checked in today"
              icon={UserCheck}
              accent
            />
            <StatCard
              label="Active Members"
              value={gymStats?.active_members ?? 0}
              sub="current active memberships"
              icon={Users}
            />
            <StatCard
              label="Classes Today"
              value={gymStats?.classes_today ?? 0}
              sub="scheduled for today"
              icon={CalendarCheck}
            />
            <StatCard
              label="Expiring Soon"
              value={gymStats?.expiring_soon ?? 0}
              sub="memberships within 30 days"
              icon={Activity}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Today's Sales"
              value={`₱${(fnbStats?.today_sales ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 0 })}`}
              sub="revenue today"
              icon={TrendingUp}
              accent
            />
            <StatCard
              label="Low Stock Items"
              value={fnbStats?.low_stock_items ?? 0}
              sub="items below threshold"
              icon={Package}
            />
            <StatCard
              label="Staff on Shift"
              value={fnbStats?.staff_on_shift ?? 0}
              sub="active staff members"
              icon={Users}
            />
            <StatCard
              label="Tables"
              value={`${fnbStats?.active_tables ?? 0} / ${fnbStats?.total_tables ?? 0}`}
              sub="occupied / total"
              icon={Table2}
            />
          </>
        )}
      </div>

      {/* ── Recent activity ── */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">
            {isGym ? "Today's Check-ins" : "Recent Orders"}
          </CardTitle>
          <a
            href={isGym ? "/portal/checkin" : "/portal/orders"}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </a>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <SkeletonRows />
          ) : isGym ? (
            checkins.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                No check-ins yet today.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkins.slice(0, 8).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">
                        {c.member_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.membership_plan ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.checked_in_at).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : orders.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 8).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.table_id ? "Dine-in" : "Takeaway"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.items?.length ?? 0} item
                      {order.items?.length !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[order.status] ?? "outline"}
                        className="capitalize"
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString("en-PH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      ₱
                      {Number(order.total).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(isGym
            ? [
                {
                  label: "Check-In Member",
                  href: "/portal/checkin",
                  icon: UserCheck,
                  desc: "Scan or search to check in a member",
                },
                {
                  label: "View Members",
                  href: "/portal/members",
                  icon: Users,
                  desc: "Browse and manage gym members",
                },
                {
                  label: "Classes Today",
                  href: "/portal/classes",
                  icon: Dumbbell,
                  desc: "See today's class schedule",
                },
              ]
            : [
                {
                  label: "New Order",
                  href: "/portal/orders/new",
                  icon: ShoppingCart,
                  desc: "Create a new dine-in or takeaway order",
                },
                {
                  label: "View Tables",
                  href: "/portal/tables",
                  icon: Table2,
                  desc: "Check live table status on the floor",
                },
                {
                  label: "Kitchen Display",
                  href: "/portal/kds",
                  icon: Package,
                  desc: "Monitor active kitchen tickets",
                },
              ]
          ).map(({ label, href, icon: Icon, desc }) => (
            <a key={href} href={href}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="size-7 rounded bg-muted flex items-center justify-center">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
