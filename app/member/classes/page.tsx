"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"

type GymClass = {
  id: string
  name: string
  category: string
  trainer: string
  start_time: string
  duration_minutes: number
  capacity: number
  enrolled: number
  room: string
  status: "available" | "full" | "booked"
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) +
    " · " + new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function MemberClassesPage() {
  const [classes, setClasses] = useState<GymClass[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState("All")
  const [booking, setBooking] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/v1/member/classes`, { credentials: "include" })
      .then(r => r.json())
      .then(setClasses)
      .finally(() => setLoading(false))
  }, [])

  const categories = ["All", ...Array.from(new Set(classes.map(c => c.category)))]
  const filtered = category === "All" ? classes : classes.filter(c => c.category === category)

  async function book(cls: GymClass) {
    setBooking(cls.id)
    // optimistic
    setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: "booked", enrolled: c.enrolled + 1 } : c))
    try {
      const r = await fetch(`${API}/api/v1/member/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: cls.id }),
      })
      if (!r.ok) throw new Error()
    } catch {
      // revert
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: "available", enrolled: c.enrolled - 1 } : c))
    } finally {
      setBooking(null)
    }
  }

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Classes</h1>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No classes available.</p>
      )}

      <div className="space-y-3">
        {filtered.map(cls => (
          <div key={cls.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{cls.name}</p>
                <p className="text-xs text-muted-foreground">{cls.trainer} · {cls.room}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
                {cls.category}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDateTime(cls.start_time)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{cls.duration_minutes}m</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{cls.enrolled}/{cls.capacity}</span>
            </div>

            <button
              disabled={cls.status !== "available" || booking === cls.id}
              onClick={() => book(cls)}
              className={cn(
                "w-full rounded-lg py-2 text-sm font-medium transition-colors",
                cls.status === "booked"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default"
                  : cls.status === "full"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              )}
            >
              {cls.status === "booked" ? "Booked ✓" : cls.status === "full" ? "Full" : booking === cls.id ? "Booking…" : "Book"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
