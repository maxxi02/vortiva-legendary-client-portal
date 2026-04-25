"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Users, Package, Table2, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePusherChannel } from "@/hooks/usePusher"

type TenantStats = {
  today_sales: number
  low_stock_items: number
  staff_on_shift: number
  active_tables: number
  total_tables: number
}

type Order = {
  id: string
  table_id: string | null
  status: string
  total: number
  created_at: string
  items: { name: string }[]
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending:   "secondary",
  preparing: "outline",
  ready:     "default",
  served:    "default",
  paid:      "default",
  cancelled: "destructive",
}

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
          <div className={`size-7 rounded flex items-center justify-center ${accent ? "bg-accent" : "bg-muted"}`}>
            <Icon className={`size-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
          </div>
        </div>
        <p className={`text-3xl font-semibold tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
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
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [today, setToday] = useState("")

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }))
  }, [])

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/tenant/dashboard/stats", { credentials: "include" })
        .then(r => r.ok ? r.json() : null),
      fetch("/api/v1/restaurant/orders", { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
    ])
      .then(([s, o]) => { setStats(s); setOrders(o ?? []) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const recentOrders = orders.slice(0, 8)

  // Real-time: refresh orders and stats when a new order event fires
  usePusherChannel("orders", "order.created", () => {
    fetch("/api/v1/restaurant/orders", { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then(setOrders).catch(() => {})
  })
  usePusherChannel("orders", "order.updated", () => {
    fetch("/api/v1/restaurant/orders", { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then(setOrders).catch(() => {})
  })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {today}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load dashboard data. Make sure the backend is running.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stats && <>
              <StatCard
                label="Today's Sales"
                value={`₱${(stats.today_sales ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 0 })}`}
                sub="revenue today"
                icon={TrendingUp}
                accent
              />
              <StatCard
                label="Low Stock Items"
                value={stats.low_stock_items ?? 0}
                sub="items below threshold"
                icon={Package}
              />
              <StatCard
                label="Staff on Shift"
                value={stats.staff_on_shift ?? 0}
                sub="active staff members"
                icon={Users}
              />
              <StatCard
                label="Tables"
                value={`${stats.active_tables ?? 0} / ${stats.total_tables ?? 0}`}
                sub="occupied / total"
                icon={Table2}
              />
            </>
        }
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
          <a href="/portal/orders" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </a>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 pb-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : !recentOrders.length ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">No orders yet.</p>
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
                {recentOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.table_id ? "Dine-in" : "Takeaway"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status] ?? "outline"} className="capitalize">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      ₱{Number(order.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "New Order", href: "/portal/orders/new", icon: ShoppingCart, desc: "Create a new dine-in or takeaway order" },
            { label: "View Tables", href: "/portal/tables", icon: Table2, desc: "Check live table status on the floor" },
            { label: "Kitchen Display", href: "/portal/kds", icon: Package, desc: "Monitor active kitchen tickets" },
          ].map(({ label, href, icon: Icon, desc }) => (
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
  )
}
