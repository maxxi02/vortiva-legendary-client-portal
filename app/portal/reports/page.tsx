"use client"

import { useEffect, useState } from "react"
import { Users, TrendingUp, UserCheck, CreditCard } from "lucide-react"
import { API } from "@/lib/api"
import { cachedFetch } from "@/lib/cache"

const TTL = 5 * 60 * 1000

type ReportData = {
  period: string
  total_members: number
  new_members: number
  active_members: number
  expired_members: number
  total_revenue: number
  total_checkins: number
  top_classes: { name: string; bookings: number }[]
  revenue_by_method: { method: string; amount: number }[]
  daily_checkins: { date: string; count: number }[]
}

const PERIODS = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
]

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("30d")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    cachedFetch<ReportData>(`${API}/api/v1/gym/reports?period=${period}`, TTL, { credentials: "include" })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  const maxCheckins = data ? Math.max(...data.daily_checkins.map(d => d.count), 1) : 1

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
        </div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-12">Could not load report data.</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="Total Members" value={data.total_members} sub={`+${data.new_members} new`} />
            <StatCard icon={<UserCheck className="h-4 w-4" />} label="Check-Ins" value={data.total_checkins} sub={`${period} period`} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Active" value={data.active_members} sub={`${data.expired_members} expired`} />
            <StatCard
              icon={<CreditCard className="h-4 w-4" />}
              label="Revenue"
              value={`₱${data.total_revenue.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`}
              sub={period}
            />
          </div>

          {/* Daily check-ins bar chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium mb-4">Daily Check-Ins</h2>
            {data.daily_checkins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <div className="flex items-end gap-1 h-32 overflow-x-auto">
                {data.daily_checkins.map(d => (
                  <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[20px]">
                    <div
                      className="w-full rounded-t bg-primary/70 transition-all"
                      style={{ height: `${Math.round((d.count / maxCheckins) * 100)}%`, minHeight: d.count > 0 ? "4px" : "0" }}
                      title={`${d.date}: ${d.count}`}
                    />
                    <span className="text-[9px] text-muted-foreground rotate-45 origin-left hidden sm:block">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top classes */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-medium mb-3">Top Classes</h2>
              {data.top_classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div className="space-y-2">
                  {data.top_classes.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm truncate">{c.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">{c.bookings}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${Math.round((c.bookings / (data.top_classes[0]?.bookings || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue by method */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-medium mb-3">Revenue by Method</h2>
              {data.revenue_by_method.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div className="space-y-2">
                  {data.revenue_by_method.map(r => (
                    <div key={r.method} className="flex items-center justify-between gap-3">
                      <span className="text-sm capitalize">{r.method}</span>
                      <span className="text-sm font-medium tabular-nums">
                        ₱{r.amount.toLocaleString("en-PH", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
