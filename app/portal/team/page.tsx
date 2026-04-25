"use client"

import { useEffect, useState } from "react"
import { Plus, UserCheck, UserX } from "lucide-react"
import { cn } from "@/lib/utils"

type Staff = {
  id: string
  user_id: string
  staff_role: string
  is_active: boolean
  created_at: string
}

type Shift = {
  id: string
  staff_id: string
  clock_in: string
  clock_out?: string
  notes?: string
}

const ROLES = ["manager", "cashier", "barista", "inventory_clerk"]

const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  cashier: "Cashier",
  barista: "Barista",
  inventory_clerk: "Inventory Clerk",
}

export default function TeamPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"roster" | "shifts">("roster")

  // Add staff drawer
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ user_id: "", staff_role: "cashier" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Updating
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function load() {
    const safe = (p: Promise<Response>) => p.then(r => r.ok ? r.json() : []).catch(() => [])
    const [s, sh] = await Promise.all([
      safe(fetch("/api/v1/staff", { credentials: "include" })),
      safe(fetch("/api/v1/restaurant/shifts", { credentials: "include" })),
    ])
    setStaff(s)
    setShifts(sh)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(s: Staff) {
    setUpdatingId(s.id)
    const res = await fetch(`/api/v1/staff/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !s.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setStaff(prev => prev.map(x => x.id === s.id ? updated : x))
    }
    setUpdatingId(null)
  }

  async function changeRole(s: Staff, role: string) {
    setUpdatingId(s.id)
    const res = await fetch(`/api/v1/staff/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ staff_role: role }),
    })
    if (res.ok) {
      const updated = await res.json()
      setStaff(prev => prev.map(x => x.id === s.id ? updated : x))
    }
    setUpdatingId(null)
  }

  async function addStaff() {
    if (!form.user_id.trim()) { setError("User ID is required."); return }
    setError("")
    setSaving(true)
    const res = await fetch("/api/v1/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: form.user_id.trim(), staff_role: form.staff_role }),
    })
    if (res.ok) {
      const newMember = await res.json()
      setStaff(prev => [...prev, newMember])
      setAdding(false)
      setForm({ user_id: "", staff_role: "cashier" })
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to add staff.")
    }
    setSaving(false)
  }

  function duration(clockIn: string, clockOut?: string): string {
    const end = clockOut ? new Date(clockOut) : new Date()
    const mins = Math.floor((end.getTime() - new Date(clockIn).getTime()) / 60000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your Team</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["roster", "shifts"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Roster tab */}
      {tab === "roster" && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No staff members yet.</td>
                </tr>
              ) : (
                staff.map(s => (
                  <tr key={s.id} className={cn("transition-colors", !s.is_active && "opacity-50")}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.user_id.slice(0, 12)}…</td>
                    <td className="px-4 py-3">
                      <select
                        value={s.staff_role}
                        onChange={e => changeRole(s, e.target.value)}
                        disabled={updatingId === s.id}
                        className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        s.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {s.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={updatingId === s.id}
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        {s.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Shifts tab */}
      {tab === "shifts" && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clock In</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clock Out</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No shifts recorded.</td>
                </tr>
              ) : (
                shifts.slice(0, 50).map(sh => (
                  <tr key={sh.id}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{sh.staff_id.slice(0, 12)}…</td>
                    <td className="px-4 py-3 text-xs">{new Date(sh.clock_in).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">
                      {sh.clock_out
                        ? new Date(sh.clock_out).toLocaleString()
                        : <span className="text-green-600 dark:text-green-400 font-medium">On shift</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{duration(sh.clock_in, sh.clock_out)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{sh.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add staff drawer */}
      {adding && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdding(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-border font-medium">Add Staff Member</div>
            <div className="flex-1 px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">User ID *</label>
                <input
                  type="text"
                  placeholder="UUID of the user account"
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
                <p className="text-xs text-muted-foreground">The user must already have an account in the system.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={form.staff_role}
                  onChange={e => setForm(f => ({ ...f, staff_role: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={addStaff}
                disabled={saving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
