"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"

type Booking = {
  id: string
  class_name: string
  trainer: string
  start_time: string
  duration_minutes: number
  room: string
  status: "upcoming" | "completed" | "cancelled"
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) +
    " · " + new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function MemberBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/v1/member/bookings`, { credentials: "include" })
      .then(r => r.json())
      .then(setBookings)
      .finally(() => setLoading(false))
  }, [])

  async function cancel(id: string) {
    setCancelling(id)
    // optimistic
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b))
    try {
      const r = await fetch(`${API}/api/v1/member/bookings/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      })
      if (!r.ok) throw new Error()
    } catch {
      // revert
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "upcoming" } : b))
    } finally {
      setCancelling(null)
    }
  }

  const upcoming = bookings.filter(b => b.status === "upcoming")
  const past = bookings.filter(b => b.status !== "upcoming")
  const list = tab === "upcoming" ? upcoming : past

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bookings</h1>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1 gap-1">
        {(["upcoming", "past"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t} {t === "upcoming" ? `(${upcoming.length})` : `(${past.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No {tab} bookings.
        </p>
      )}

      <div className="space-y-3">
        {list.map(b => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{b.class_name}</p>
                <p className="text-xs text-muted-foreground">{b.trainer} · {b.room}</p>
              </div>
              {b.status === "cancelled" && (
                <span className="shrink-0 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs px-2 py-0.5">
                  Cancelled
                </span>
              )}
              {b.status === "completed" && (
                <span className="shrink-0 rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">
                  Done
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDateTime(b.start_time)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{b.duration_minutes}m</span>
            </div>

            {b.status === "upcoming" && (
              <button
                disabled={cancelling === b.id}
                onClick={() => cancel(b.id)}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                <X className="h-4 w-4" />
                {cancelling === b.id ? "Cancelling…" : "Cancel booking"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
