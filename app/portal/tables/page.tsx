"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"

type Table = {
  id: string
  name: string
  capacity: number
  status: "available" | "occupied" | "reserved" | "dirty"
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400",
  occupied:  "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400",
  reserved:  "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400",
  dirty:     "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400",
}

const STATUSES = ["available", "occupied", "reserved", "dirty"] as const

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Table | null>(null)
  const [updating, setUpdating] = useState(false)

  async function load() {
    const res = await fetch(`${API}/api/v1/restaurant/tables`, { credentials: "include" })
    if (res.ok) setTables(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function updateStatus(tableId: string, status: string) {
    setUpdating(true)
    const res = await fetch(`${API}/api/v1/restaurant/tables/${tableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: Table = await res.json()
      setTables(prev => prev.map(t => t.id === tableId ? updated : t))
      setSelected(updated)
    }
    setUpdating(false)
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = tables.filter(t => t.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tables</h1>
        <button
          onClick={load}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Legend / counts */}
      <div className="flex gap-3 flex-wrap">
        {STATUSES.map(s => (
          <div key={s} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize", STATUS_COLORS[s])}>
            <span>{counts[s] ?? 0}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* Floor plan grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-border animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tables configured yet.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {tables.map(table => (
            <button
              key={table.id}
              onClick={() => setSelected(table)}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                STATUS_COLORS[table.status]
              )}
            >
              <p className="font-semibold text-sm">{table.name}</p>
              <p className="text-xs opacity-70 mt-0.5">Cap. {table.capacity}</p>
              <p className="text-xs font-medium capitalize mt-2">{table.status}</p>
            </button>
          ))}
        </div>
      )}

      {/* Status update modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-background rounded-lg border border-border shadow-xl w-full max-w-xs p-5 space-y-4">
            <div>
              <p className="font-semibold">{selected.name}</p>
              <p className="text-sm text-muted-foreground">Capacity: {selected.capacity} · Currently: <span className="capitalize">{selected.status}</span></p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Change status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.filter(s => s !== selected.status).map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    disabled={updating}
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs font-medium capitalize transition-colors",
                      "hover:opacity-80 disabled:opacity-50",
                      STATUS_COLORS[s]
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
