"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { usePusherChannel } from "@/hooks/usePusher"

type OrderItem = { id: string; name: string; quantity: number; notes?: string }
type Order = { id: string; table_id: string | null; notes?: string; items: OrderItem[] }
type Ticket = {
  id: string
  order_id: string
  status: "pending" | "preparing" | "ready" | "served"
  created_at: string
  order: Order | null
}

const STATUS_COLS = ["pending", "preparing", "ready"] as const

const COL_STYLES: Record<string, string> = {
  pending:   "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10",
  preparing: "border-blue-300 bg-blue-50 dark:bg-blue-900/10",
  ready:     "border-green-300 bg-green-50 dark:bg-green-900/10",
}

const NEXT: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
}

const NEXT_LABEL: Record<string, string> = {
  pending: "Start",
  preparing: "Ready",
  ready: "Served ✓",
}

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

export default function KDSPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [bumping, setBumping] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/restaurant/kds", { credentials: "include" })
    if (res.ok) setTickets(await res.json())
  }, [])

  useEffect(() => {
    load()
    const dataInterval = setInterval(load, 15_000)
    // Re-render every second to update elapsed timers
    const timerInterval = setInterval(() => setTick(t => t + 1), 1000)
    return () => { clearInterval(dataInterval); clearInterval(timerInterval) }
  }, [load])

  // Real-time: reload KDS when a new order/ticket event fires
  usePusherChannel("kds", "ticket.updated", load)
  usePusherChannel("kds", "order.created", load)

  async function bump(ticket: Ticket) {
    setBumping(ticket.id)
    const res = await fetch(`/api/v1/restaurant/kds/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: NEXT[ticket.status] }),
    })
    if (res.ok) {
      const updated: Ticket = await res.json()
      // Remove from board if served
      if (updated.status === "served") {
        setTickets(prev => prev.filter(t => t.id !== ticket.id))
      } else {
        setTickets(prev => prev.map(t => t.id === ticket.id ? updated : t))
      }
    }
    setBumping(null)
  }

  const byStatus = (status: string) => tickets.filter(t => t.status === status)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen Display</h1>
        <button onClick={load} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_COLS.map(status => (
          <div key={status} className="space-y-3">
            {/* Column header */}
            <div className={cn("rounded-md border px-3 py-2 text-sm font-medium capitalize flex items-center justify-between", COL_STYLES[status])}>
              <span>{status}</span>
              <span className="text-xs opacity-70">{byStatus(status).length}</span>
            </div>

            {/* Tickets */}
            {byStatus(status).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No tickets</p>
            ) : (
              byStatus(status).map(ticket => {
                const age = ticketAge(ticket.created_at)
                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "rounded-lg border-2 bg-card p-4 space-y-3 transition-all",
                      COL_STYLES[status]
                    )}
                  >
                    {/* Ticket header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">
                          {ticket.order?.table_id ? "Table" : "Takeaway"}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          #{ticket.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <span className={cn("text-xs tabular-nums", AGE_STYLES[age])}>
                        {elapsed(ticket.created_at)}
                      </span>
                    </div>

                    {/* Order notes */}
                    {ticket.order?.notes && (
                      <p className="text-xs italic text-muted-foreground border-l-2 border-yellow-400 pl-2">
                        {ticket.order.notes}
                      </p>
                    )}

                    {/* Items */}
                    <ul className="space-y-1">
                      {ticket.order?.items.map(item => (
                        <li key={item.id} className="text-sm">
                          <span className="font-medium">{item.quantity}×</span> {item.name}
                          {item.notes && (
                            <span className="text-xs text-muted-foreground ml-1">— {item.notes}</span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Bump button */}
                    <button
                      onClick={() => bump(ticket)}
                      disabled={bumping === ticket.id}
                      className={cn(
                        "w-full rounded-md py-2 text-xs font-semibold transition-all",
                        status === "ready"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : status === "preparing"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-yellow-500 text-white hover:bg-yellow-600",
                        "disabled:opacity-60"
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
