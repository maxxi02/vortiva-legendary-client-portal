"use client"

import { useEffect, useState } from "react"
import { CalendarDays, CheckCircle2, CreditCard, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { cachedFetch } from "@/lib/cache"
import { API } from "@/lib/api"

type MembershipStatus = "active" | "expired" | "frozen"

type DashboardData = {
  member_name: string
  plan: string
  status: MembershipStatus
  expiry_date: string
  points_balance: number
  upcoming_classes: { id: string; name: string; trainer: string; start_time: string; room: string }[]
  recent_checkins: { id: string; checked_in_at: string }[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) +
    " · " + new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const STATUS_STYLES: Record<MembershipStatus, string> = {
  active:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  frozen:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export default function MemberDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cachedFetch<DashboardData>(`${API}/api/v1/member/dashboard`, 60_000, { credentials: "include" })
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}
    </div>
  )
  if (!data) return <p className="text-center text-muted-foreground py-12">Could not load dashboard.</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Hi, {data.member_name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Welcome back to your gym portal</p>
      </div>

      {/* Membership card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wide">Membership</p>
            <p className="text-lg font-semibold">{data.plan}</p>
          </div>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_STYLES[data.status])}>
            {data.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm opacity-80">
          <CreditCard className="h-4 w-4" />
          Expires {fmtDate(data.expiry_date)}
        </div>
      </div>

      {/* Points */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
        <div className="h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Star className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Points Balance</p>
          <p className="text-2xl font-bold tabular-nums">{data.points_balance.toLocaleString()}</p>
        </div>
      </div>

      {/* Upcoming classes */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming Classes</h2>
        {data.upcoming_classes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No upcoming classes booked.</p>
        ) : data.upcoming_classes.map(cls => (
          <div key={cls.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{cls.name}</p>
              <p className="text-xs text-muted-foreground">{fmtDateTime(cls.start_time)} · {cls.room}</p>
              <p className="text-xs text-muted-foreground">{cls.trainer}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Recent check-ins */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Check-Ins</h2>
        {data.recent_checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent check-ins.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {data.recent_checkins.map(ci => (
              <div key={ci.id} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <p className="text-sm">{fmtDateTime(ci.checked_in_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
