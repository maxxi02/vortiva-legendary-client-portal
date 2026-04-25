"use client"

import { useEffect, useState, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts"
import { cn } from "@/lib/utils"
import { DateRangePicker, type DateRange } from "@/components/portal/DateRangePicker"
import { API } from "@/lib/api"

type Order = {
  id: string
  status: string
  total: number
  created_at: string
  items: { name: string; quantity: number; subtotal: number }[]
}

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const today = startOfDay(new Date())
  const defaultFrom = new Date(today); defaultFrom.setDate(today.getDate() - 29)
  const [range, setRange] = useState<DateRange>({ from: defaultFrom, to: today })

  useEffect(() => {
    fetch(`${API}/api/v1/restaurant/orders`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setOrders(data); setLoading(false) })
  }, [])

  const filtered = useMemo(
    () => orders.filter(o => {
      const d = startOfDay(new Date(o.created_at))
      return d >= range.from && d <= range.to && o.status !== "cancelled"
    }),
    [orders, range]
  )

  // Daily sales chart
  const dailySales = useMemo(() => {
    const map: Record<string, number> = {}
    const from = range.from
    const to = range.to
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      map[d.toLocaleDateString("en-CA")] = 0
    }
    filtered.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString("en-CA")
      if (key in map) map[key] = (map[key] ?? 0) + Number(o.total)
    })
    return Object.entries(map).map(([date, total]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: Math.round(total),
    }))
  }, [filtered, range])

  // Top items
  const topItems = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {}
    filtered.forEach(o =>
      o.items?.forEach(item => {
        if (!map[item.name]) map[item.name] = { qty: 0, revenue: 0 }
        map[item.name].qty += item.quantity
        map[item.name].revenue += Number(item.subtotal)
      })
    )
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [filtered])

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(o => { map[o.status] = (map[o.status] ?? 0) + 1 })
    return Object.entries(map).map(([status, count]) => ({ status, count }))
  }, [filtered])

  // Summary metrics
  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total), 0)
  const avgTicket = filtered.length ? totalRevenue / filtered.length : 0
  const totalOrders = filtered.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-border animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Revenue", value: fmt(totalRevenue) },
              { label: "Total Orders", value: totalOrders.toString() },
              { label: "Avg Ticket", value: fmt(avgTicket) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Daily sales line chart */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-medium">Daily Revenue</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailySales} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000) <= 7 ? 0 : Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000) <= 30 ? 4 : 13}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => [fmt(Number(v ?? 0)), "Revenue"]}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top items bar chart */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-medium">Top Items by Revenue</p>
              {topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v ?? 0)), "Revenue"]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Order status breakdown */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-medium">Orders by Status</p>
              {statusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusBreakdown} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
