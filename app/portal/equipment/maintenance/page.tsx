"use client"

import { useEffect, useState } from "react"
import { Download, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch } from "@/lib/cache"

const TTL = 2 * 60 * 1000

type MaintLog = {
  id: string
  equipment_id: string
  equipment_name: string
  date: string
  performed_by: string
  work_done: string
  cost: number
  next_due_date: string
}

type Equipment = { id: string; name: string }

function fmt(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

function isOverdue(d: string) {
  return d && new Date(d) < new Date()
}

export default function MaintenanceLogPage() {
  const [logs, setLogs]           = useState<MaintLog[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading]     = useState(true)

  const [eqFilter, setEqFilter]       = useState("")
  const [dateFrom, setDateFrom]       = useState("")
  const [dateTo, setDateTo]           = useState("")
  const [perfBy, setPerfBy]           = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [l, e] = await Promise.all([
          cachedFetch<MaintLog[]>(`${API}/api/v1/gym/equipment/maintenance`, TTL, { credentials: "include" }),
          cachedFetch<Equipment[]>(`${API}/api/v1/gym/equipment`, TTL, { credentials: "include" }),
        ])
        setLogs(l ?? [])
        setEquipment(e ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = logs.filter(l => {
    if (eqFilter && l.equipment_id !== eqFilter) return false
    if (dateFrom && l.date < dateFrom) return false
    if (dateTo && l.date > dateTo) return false
    if (perfBy && !l.performed_by.toLowerCase().includes(perfBy.toLowerCase())) return false
    return true
  })

  function exportCSV() {
    const header = ["Equipment", "Date", "Performed By", "Work Done", "Cost (₱)", "Next Due Date"]
    const rows = filtered.map(l => [
      l.equipment_name,
      l.date,
      l.performed_by,
      `"${l.work_done.replace(/"/g, '""')}"`,
      l.cost,
      l.next_due_date,
    ])
    const csv = [header, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = `maintenance-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance Log</h1>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-accent transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={eqFilter} onChange={e => setEqFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
          <option value="">All Equipment</option>
          {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Performed by…" value={perfBy} onChange={e => setPerfBy(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-48" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Equipment</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Performed By</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Work Done</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cost</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Next Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No maintenance records found.</td></tr>
            ) : (
              filtered.map(l => (
                <tr key={l.id} className={cn("hover:bg-muted/30 transition-colors", isOverdue(l.next_due_date) && "bg-red-50/50 dark:bg-red-950/20")}>
                  <td className="px-4 py-3 font-medium">{l.equipment_name}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(l.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.performed_by}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-muted-foreground" title={l.work_done}>{l.work_done}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {l.cost ? `₱${l.cost.toLocaleString("en-PH")}` : "—"}
                  </td>
                  <td className={cn("px-4 py-3 whitespace-nowrap font-medium", isOverdue(l.next_due_date) ? "text-red-600" : "text-muted-foreground")}>
                    {fmt(l.next_due_date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
