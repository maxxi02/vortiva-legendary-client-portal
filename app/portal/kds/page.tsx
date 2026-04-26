"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { usePusherChannel } from "@/hooks/usePusher"
import { API } from "@/lib/api"

// ── helpers ──────────────────────────────────────────────────────────────────
function getCookieJson(key: string) {
  if (typeof document === "undefined") return null
  const match = document.cookie.split("; ").find(r => r.startsWith(key + "="))
  if (!match) return null
  try { return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("="))) } catch { return null }
}
function getBusinessType(): string { return getCookieJson("user-info")?.business_type ?? "" }

// ── F&B KDS types ─────────────────────────────────────────────────────────────
type OrderItem = { id: string; name: string; quantity: number; notes?: string }
type Order = { id: string; table_id: string | null; notes?: string; items: OrderItem[] }
type Ticket = {
  id: string
  order_id: string
  status: "pending" | "preparing" | "ready" | "served"
  created_at: string
  order: Order | null
}

// ── Gym Class Board types ─────────────────────────────────────────────────────
type ClassStatus = "upcoming" | "in_progress" | "completed" | "cancelled"
type GymClass = {
  id: string
  name: string
  trainer: string
  room: string
  start_time: string   // ISO
  end_time: string     // ISO
  enrolled: number
  capacity: number
  status: ClassStatus
  walk_ins: number
}

// ── F&B constants ─────────────────────────────────────────────────────────────
const STATUS_COLS = ["pending", "preparing", "ready"] as const
const COL_STYLES: Record<string, string> = {
  pending:   "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10",
  preparing: "border-blue-300 bg-blue-50 dark:bg-blue-900/10",
  ready:     "border-green-300 bg-green-50 dark:bg-green-900/10",
}
const NEXT: Record<string, string> = { pending: "preparing", preparing: "ready", ready: "served" }
const NEXT_LABEL: Record<string, string> = { pending: "Start", preparing: "Ready", ready: "Served ✓" }

function elapsed(createdAt: string): string {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
function ticketAge(createdAt: string): "normal" | "warning" | "urgent" {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000
  if (mins > 20) return "urgent"
  if (mins > 10) return "warning"
  return "normal"
}
const AGE_STYLES = {
  normal:  "text-muted-foreground",
  warning: "text-yellow-600 dark:text-yellow-400 font-medium",
  urgent:  "text-red-600 dark:text-red-400 font-bold",
}

// ── Gym class status styles ───────────────────────────────────────────────────
const CLASS_STATUS_STYLES: Record<ClassStatus, string> = {
  upcoming:    "border-blue-300 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300",
  in_progress: "border-green-300 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300",
  completed:   "border-border bg-muted/30 text-muted-foreground",
  cancelled:   "border-red-300 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300",
}
const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  upcoming:    "Upcoming",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function KDSPage() {
  const [isGym, setIsGym] = useState(false)

  // F&B state
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [bumping, setBumping] = useState<string | null>(null)
  const [, setTick] = useState(0)

  // Gym state
  const [classes, setClasses] = useState<GymClass[]>([])
  const [walkIns, setWalkIns] = useState(0)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => { setIsGym(getBusinessType() === "gym") }, [])

  // ── F&B load ────────────────────────────────────────────────────────────────
  const loadKds = useCallback(async () => {
    const res = await fetch(`${API}/api/v1/restaurant/kds`, { credentials: "include" })
    if (res.ok) setTickets(await res.json())
  }, [])

  // ── Gym load ────────────────────────────────────────────────────────────────
  const loadClasses = useCallback(async () => {
    const res = await fetch(`${API}/api/v1/gym/classes/today`, { credentials: "include" })
    if (res.ok) {
      const data: GymClass[] = await res.json()
      setClasses(data.sort((a, b) => a.start_time.localeCompare(b.start_time)))
      setWalkIns(data.reduce((s, c) => s + (c.walk_ins ?? 0), 0))
    }
  }, [])

  useEffect(() => {
    if (isGym) {
      loadClasses()
      const interval = setInterval(loadClasses, 60_000)
      return () => clearInterval(interval)
    } else {
      loadKds()
      const dataInterval = setInterval(loadKds, 15_000)
      const timerInterval = setInterval(() => setTick(t => t + 1), 1000)
      return () => { clearInterval(dataInterval); clearInterval(timerInterval) }
    }
  }, [isGym, loadKds, loadClasses])

  usePusherChannel("kds", "ticket.updated", isGym ? () => {} : loadKds)
  usePusherChannel("kds", "order.created",  isGym ? () => {} : loadKds)
  usePusherChannel("gym", "class.updated",  isGym ? loadClasses : () => {})

  // ── F&B bump ────────────────────────────────────────────────────────────────
  async function bump(ticket: Ticket) {
    setBumping(ticket.id)
    const res = await fetch(`${API}/api/v1/restaurant/kds/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: NEXT[ticket.status] }),
    })
    if (res.ok) {
      const updated: Ticket = await res.json()
      if (updated.status === "served") {
        setTickets(prev => prev.filter(t => t.id !== ticket.id))
      } else {
        setTickets(prev => prev.map(t => t.id === ticket.id ? updated : t))
      }
    }
    setBumping(null)
  }

  // ── Gym status update ───────────────────────────────────────────────────────
  async function updateClassStatus(id: string, status: ClassStatus) {
    setUpdating(id)
    const res = await fetch(`${API}/api/v1/gym/classes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: GymClass = await res.json()
      setClasses(prev => prev.map(c => c.id === id ? updated : c))
    }
    setUpdating(null)
  }

  const byStatus = (status: string) => tickets.filter(t => t.status === status)

  // ── GYM CLASS BOARD ─────────────────────────────────────────────────────────
  if (isGym) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Class Board</h1>
            <p className="text-sm text-muted-foreground">Today's schedule · auto-refreshes every 60s</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-border bg-card px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Walk-ins today</p>
              <p className="text-2xl font-bold tabular-nums">{walkIns}</p>
            </div>
            <button onClick={loadClasses} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Refresh
            </button>
          </div>
        </div>

        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No classes scheduled for today.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {classes.map(cls => (
              <div
                key={cls.id}
                className={cn(
                  "rounded-lg border-2 p-4 space-y-3 transition-all",
                  CLASS_STATUS_STYLES[cls.status]
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-tight">{cls.name}</p>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    cls.status === "in_progress" && "animate-pulse",
                    CLASS_STATUS_STYLES[cls.status]
                  )}>
                    {CLASS_STATUS_LABELS[cls.status]}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs">
                  <p><span className="text-muted-foreground">Trainer:</span> <span className="font-medium">{cls.trainer}</span></p>
                  <p><span className="text-muted-foreground">Room:</span> <span className="font-medium">{cls.room}</span></p>
                  <p><span className="text-muted-foreground">Time:</span> <span className="font-medium tabular-nums">{fmtTime(cls.start_time)} – {fmtTime(cls.end_time)}</span></p>
                </div>

                {/* Capacity bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Enrolled</span>
                    <span className="font-medium tabular-nums">{cls.enrolled} / {cls.capacity}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        cls.enrolled / cls.capacity >= 1 ? "bg-red-500" :
                        cls.enrolled / cls.capacity >= 0.8 ? "bg-amber-500" : "bg-green-500"
                      )}
                      style={{ width: `${Math.min(100, (cls.enrolled / cls.capacity) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                {cls.status === "upcoming" && (
                  <button
                    onClick={() => updateClassStatus(cls.id, "in_progress")}
                    disabled={updating === cls.id}
                    className="w-full rounded-md bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    {updating === cls.id ? "…" : "Mark In Progress"}
                  </button>
                )}
                {cls.status === "in_progress" && (
                  <button
                    onClick={() => updateClassStatus(cls.id, "completed")}
                    disabled={updating === cls.id}
                    className="w-full rounded-md bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {updating === cls.id ? "…" : "Mark Completed"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── F&B KDS (unchanged) ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen Display</h1>
        <button onClick={loadKds} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_COLS.map(status => (
          <div key={status} className="space-y-3">
            <div className={cn("rounded-md border px-3 py-2 text-sm font-medium capitalize flex items-center justify-between", COL_STYLES[status])}>
              <span>{status}</span>
              <span className="text-xs opacity-70">{byStatus(status).length}</span>
            </div>

            {byStatus(status).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No tickets</p>
            ) : (
              byStatus(status).map(ticket => {
                const age = ticketAge(ticket.created_at)
                return (
                  <div key={ticket.id} className={cn("rounded-lg border-2 bg-card p-4 space-y-3 transition-all", COL_STYLES[status])}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{ticket.order?.table_id ? "Table" : "Takeaway"}</p>
                        <p className="text-xs font-mono text-muted-foreground">#{ticket.order_id.slice(0, 8)}</p>
                      </div>
                      <span className={cn("text-xs tabular-nums", AGE_STYLES[age])}>{elapsed(ticket.created_at)}</span>
                    </div>
                    {ticket.order?.notes && (
                      <p className="text-xs italic text-muted-foreground border-l-2 border-yellow-400 pl-2">{ticket.order.notes}</p>
                    )}
                    <ul className="space-y-1">
                      {ticket.order?.items.map(item => (
                        <li key={item.id} className="text-sm">
                          <span className="font-medium">{item.quantity}×</span> {item.name}
                          {item.notes && <span className="text-xs text-muted-foreground ml-1">— {item.notes}</span>}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => bump(ticket)}
                      disabled={bumping === ticket.id}
                      className={cn(
                        "w-full rounded-md py-2 text-xs font-semibold transition-all disabled:opacity-60",
                        status === "ready" ? "bg-green-600 text-white hover:bg-green-700" :
                        status === "preparing" ? "bg-blue-600 text-white hover:bg-blue-700" :
                        "bg-yellow-500 text-white hover:bg-yellow-600"
                      )}
                    >
                      {bumping === ticket.id ? "…" : NEXT_LABEL[status]}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
