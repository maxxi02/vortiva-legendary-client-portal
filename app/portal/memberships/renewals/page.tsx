"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, Bell, BellRing } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

type ExpiringMember = {
  id: string
  member_id: string
  full_name: string
  email: string
  phone?: string
  membership_plan: string
  expiry_date: string
  days_until_expiry: number
}

const FILTERS = [
  { label: "7 days",  days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
]

export default function RenewalsPage() {
  const router = useRouter()
  const [members, setMembers]     = useState<ExpiringMember[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState(30)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [sending, setSending]     = useState(false)
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [sentIds, setSentIds]     = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    const data = await cachedFetch<ExpiringMember[]>(
      `${API}/api/v1/gym/memberships/expiring?days=${filter}`,
      TTL,
      { credentials: "include" }
    ).catch(() => [])
    setMembers(Array.isArray(data) ? data : [])
    setSelected(new Set())
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const filtered = members.filter(m => m.days_until_expiry <= filter)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(m => m.id)))
  }

  async function sendReminders() {
    if (selected.size === 0) return
    setSending(true)
    const res = await fetch(`${API}/api/v1/gym/memberships/send-reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ membership_ids: Array.from(selected) }),
    })
    if (res.ok) {
      setSentIds(prev => new Set([...prev, ...selected]))
      setSelected(new Set())
    }
    setSending(false)
  }

  async function quickRenew(m: ExpiringMember) {
    setRenewingId(m.id)
    const res = await fetch(`${API}/api/v1/gym/memberships/${m.id}/renew`, {
      method: "POST",
      credentials: "include",
    })
    if (res.ok) {
      setMembers(prev => prev.filter(x => x.id !== m.id))
      cacheInvalidate("gym/memberships")
    }
    setRenewingId(null)
  }

  function urgencyClass(days: number) {
    if (days <= 3)  return "text-destructive font-semibold"
    if (days <= 7)  return "text-amber-600 font-medium"
    return "text-muted-foreground"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming Renewals</h1>
      </div>

      {/* Filters + bulk action */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg border border-border p-1 bg-muted/30">
          {FILTERS.map(f => (
            <button
              key={f.days}
              onClick={() => setFilter(f.days)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.days ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expiring in {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={sendReminders}
          disabled={selected.size === 0 || sending}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <BellRing className="h-4 w-4" />
          {sending ? "Sending…" : `Send Reminder${selected.size > 1 ? `s (${selected.size})` : selected.size === 1 ? " (1)" : ""}`}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Days Left</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No memberships expiring in the next {filter} days.
                </td>
              </tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id} className={cn("hover:bg-muted/30 transition-colors", selected.has(m.id) && "bg-primary/5")}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/portal/members/${m.member_id}`)}
                      className="font-medium hover:underline text-left"
                    >
                      {m.full_name}
                    </button>
                    <p className="text-xs text-muted-foreground">{m.email}{m.phone && ` · ${m.phone}`}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.membership_plan}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(m.expiry_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className={cn("px-4 py-3", urgencyClass(m.days_until_expiry))}>
                    {m.days_until_expiry === 0 ? "Today" : `${m.days_until_expiry}d`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {sentIds.has(m.id) ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Bell className="h-3.5 w-3.5" /> Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => { setSelected(new Set([m.id])); sendReminders() }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Remind
                        </button>
                      )}
                      <button
                        onClick={() => quickRenew(m)}
                        disabled={renewingId === m.id}
                        className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        <RefreshCw className={cn("h-3 w-3", renewingId === m.id && "animate-spin")} />
                        Renew
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">{filtered.length} membership{filtered.length !== 1 ? "s" : ""} expiring within {filter} days</p>
      )}
    </div>
  )
}
