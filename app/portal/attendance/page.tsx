"use client"

import { useEffect, useState } from "react"
import { Search, QrCode, UserCheck } from "lucide-react"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 60 * 1000

type CheckIn = {
  id: string
  member_id: string
  member_name: string
  visited_at: string
  method: "qr" | "manual" | "rfid"
}

export default function AttendancePage() {
  const [records, setRecords] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [manualId, setManualId] = useState("")
  const [checking, setChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState("")

  async function load(d: string) {
    setLoading(true)
    const data = await cachedFetch<CheckIn[]>(
      `${API}/api/v1/gym/attendance?date=${d}`, TTL, { credentials: "include" }
    ).catch(() => [])
    setRecords(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load(date) }, [date])

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    return !q || r.member_name.toLowerCase().includes(q)
  })

  async function manualCheckIn(e: React.FormEvent) {
    e.preventDefault()
    if (!manualId.trim()) return
    setChecking(true)
    setCheckMsg("")
    const res = await fetch(`${API}/api/v1/gym/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ member_id: manualId.trim(), method: "manual" }),
    })
    if (res.ok) {
      const created = await res.json()
      setRecords(prev => [created, ...prev])
      setManualId("")
      setCheckMsg("Checked in!")
      cacheInvalidate(`gym/attendance?date=${date}`)
    } else {
      const d = await res.json().catch(() => ({}))
      setCheckMsg(d?.detail ?? "Check-in failed.")
    }
    setChecking(false)
    setTimeout(() => setCheckMsg(""), 3000)
  }

  const METHOD_ICON: Record<string, React.ReactNode> = {
    qr: <QrCode className="h-3.5 w-3.5" />,
    manual: <UserCheck className="h-3.5 w-3.5" />,
    rfid: <span className="text-xs font-mono">RF</span>,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Manual check-in */}
      <form onSubmit={manualCheckIn} className="rounded-xl border border-border bg-card p-4 flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium">Manual Check-In</label>
          <input
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            placeholder="Member ID or QR code…"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="submit"
          disabled={checking || !manualId.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {checking ? "…" : "Check In"}
        </button>
        {checkMsg && <p className="text-sm text-muted-foreground self-center">{checkMsg}</p>}
      </form>

      {/* Stats */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">{records.length} check-in{records.length !== 1 ? "s" : ""} today</span>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search member…"
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Member", "Time", "Method"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(3)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-24" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No check-ins found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{r.member_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                  {new Date(r.visited_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                    {METHOD_ICON[r.method] ?? null}
                    {r.method}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
