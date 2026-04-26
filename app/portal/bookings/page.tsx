"use client"

import { useEffect, useState } from "react"
import { Plus, X, Search, ChevronDown, CheckCircle2, XCircle, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

const CLASS_BOOKING_STATUSES = ["All", "Confirmed", "Waitlisted", "Cancelled", "Attended"]
const PT_STATUSES             = ["All", "Confirmed", "Completed", "Cancelled"]
const SESSION_DURATIONS       = ["30 min", "45 min", "60 min"]
const SESSION_TYPES           = ["Initial Assessment", "Regular Session", "Recovery"]

type ClassBooking = {
  id: string
  member_id: string
  member_name: string
  class_id: string
  class_name: string
  class_type: string
  trainer_name?: string
  date_time: string        // ISO
  status: string
}

type PTBooking = {
  id: string
  member_id: string
  member_name: string
  trainer_id: string
  trainer_name: string
  date_time: string
  duration: string
  session_type: string
  status: string
  notes?: string
}

type Trainer = { id: string; name: string }
type Member  = { id: string; name: string }
type GymClass = { id: string; name: string; class_type: string; next_date?: string }

const BLANK_WALKIN = { member_id: "", class_id: "" }
const BLANK_PT = {
  member_id: "", trainer_id: "", date_time: "",
  duration: "60 min", session_type: "Regular Session", notes: "",
}

function fmtDT(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function today() { return new Date().toISOString().slice(0, 10) }

export default function BookingsPage() {
  const [tab, setTab]                   = useState<"class" | "pt">("class")

  // Class bookings
  const [classBookings, setClassBookings] = useState<ClassBooking[]>([])
  const [cbLoading, setCbLoading]         = useState(true)
  const [cbStatus, setCbStatus]           = useState("All")
  const [cbSearch, setCbSearch]           = useState("")
  const [cbDateFrom, setCbDateFrom]       = useState("")
  const [cbDateTo, setCbDateTo]           = useState("")

  // PT bookings
  const [ptBookings, setPtBookings]       = useState<PTBooking[]>([])
  const [ptLoading, setPtLoading]         = useState(true)
  const [ptStatus, setPtStatus]           = useState("All")
  const [ptSearch, setPtSearch]           = useState("")

  // Shared lookup data
  const [trainers, setTrainers]           = useState<Trainer[]>([])
  const [members, setMembers]             = useState<Member[]>([])
  const [classes, setClasses]             = useState<GymClass[]>([])

  // Walk-in modal
  const [walkin, setWalkin]               = useState(false)
  const [wForm, setWForm]                 = useState({ ...BLANK_WALKIN })
  const [wSaving, setWSaving]             = useState(false)
  const [wError, setWError]               = useState("")

  // PT drawer
  const [ptDrawer, setPtDrawer]           = useState<"add" | "edit" | null>(null)
  const [ptEditing, setPtEditing]         = useState<PTBooking | null>(null)
  const [ptForm, setPtForm]               = useState({ ...BLANK_PT })
  const [ptSaving, setPtSaving]           = useState(false)
  const [ptError, setPtError]             = useState("")

  // Row actions in-flight
  const [acting, setActing]               = useState<string | null>(null)

  async function loadAll() {
    const [cb, pt, tr, mb, cl] = await Promise.all([
      cachedFetch<ClassBooking[]>(`${API}/api/v1/gym/bookings/class`, TTL, { credentials: "include" }).catch(() => []),
      cachedFetch<PTBooking[]>(`${API}/api/v1/gym/bookings/pt`, TTL, { credentials: "include" }).catch(() => []),
      cachedFetch<Trainer[]>(`${API}/api/v1/gym/staff?role=trainer`, TTL, { credentials: "include" }).catch(() => []),
      cachedFetch<Member[]>(`${API}/api/v1/gym/members?minimal=true`, TTL, { credentials: "include" }).catch(() => []),
      cachedFetch<GymClass[]>(`${API}/api/v1/gym/classes`, TTL, { credentials: "include" }).catch(() => []),
    ])
    setClassBookings(Array.isArray(cb) ? cb : [])
    setPtBookings(Array.isArray(pt) ? pt : [])
    setTrainers(Array.isArray(tr) ? tr : [])
    setMembers(Array.isArray(mb) ? mb : [])
    setClasses(Array.isArray(cl) ? cl : [])
    setCbLoading(false)
    setPtLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // ── Summary stats (today) ──
  function summaryStats(bookings: (ClassBooking | PTBooking)[]) {
    const todayStr = today()
    const todayItems = bookings.filter(b => b.date_time.startsWith(todayStr))
    return {
      total:     todayItems.length,
      attended:  todayItems.filter(b => b.status === "Attended" || b.status === "Completed").length,
      cancelled: todayItems.filter(b => b.status === "Cancelled").length,
      waitlisted: "waitlisted" in (todayItems[0] ?? {}) ? todayItems.filter(b => (b as ClassBooking).status === "Waitlisted").length : 0,
    }
  }

  // ── Filtered class bookings ──
  const filteredCB = classBookings.filter(b => {
    if (cbStatus !== "All" && b.status !== cbStatus) return false
    if (cbDateFrom && b.date_time < cbDateFrom) return false
    if (cbDateTo   && b.date_time > cbDateTo + "T23:59") return false
    if (cbSearch) {
      const q = cbSearch.toLowerCase()
      if (!b.member_name.toLowerCase().includes(q) && !b.class_name.toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── Filtered PT bookings ──
  const filteredPT = ptBookings.filter(b => {
    if (ptStatus !== "All" && b.status !== ptStatus) return false
    if (ptSearch) {
      const q = ptSearch.toLowerCase()
      if (!b.member_name.toLowerCase().includes(q) && !b.trainer_name.toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── Row actions ──
  async function classAction(id: string, action: "attend" | "cancel") {
    setActing(id)
    const res = await fetch(`${API}/api/v1/gym/bookings/class/${id}/${action}`, { method: "POST", credentials: "include" })
    if (res.ok) {
      const statusMap = { attend: "Attended", cancel: "Cancelled" }
      setClassBookings(prev => prev.map(b => b.id === id ? { ...b, status: statusMap[action] } : b))
      cacheInvalidate("gym/bookings/class")
    }
    setActing(null)
  }

  async function ptAction(id: string, action: "complete" | "cancel") {
    setActing(id)
    const res = await fetch(`${API}/api/v1/gym/bookings/pt/${id}/${action}`, { method: "POST", credentials: "include" })
    if (res.ok) {
      const statusMap = { complete: "Completed", cancel: "Cancelled" }
      setPtBookings(prev => prev.map(b => b.id === id ? { ...b, status: statusMap[action] } : b))
      cacheInvalidate("gym/bookings/pt")
    }
    setActing(null)
  }

  // ── Walk-in save ──
  async function saveWalkin() {
    if (!wForm.member_id || !wForm.class_id) { setWError("Select a member and a class."); return }
    setWError(""); setWSaving(true)
    const res = await fetch(`${API}/api/v1/gym/bookings/class`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wForm),
    })
    if (res.ok) {
      const result = await res.json()
      setClassBookings(prev => [result, ...prev])
      cacheInvalidate("gym/bookings/class")
      setWalkin(false); setWForm({ ...BLANK_WALKIN })
    } else {
      const d = await res.json().catch(() => ({}))
      setWError(d?.detail ?? "Failed to book.")
    }
    setWSaving(false)
  }

  // ── PT save ──
  async function savePT() {
    if (!ptForm.member_id || !ptForm.trainer_id || !ptForm.date_time) { setPtError("Member, trainer and date/time are required."); return }
    setPtError(""); setPtSaving(true)
    const url    = ptEditing ? `${API}/api/v1/gym/bookings/pt/${ptEditing.id}` : `${API}/api/v1/gym/bookings/pt`
    const method = ptEditing ? "PUT" : "POST"
    const res = await fetch(url, {
      method, credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ptForm),
    })
    if (res.ok) {
      const result = await res.json()
      setPtBookings(prev => ptEditing ? prev.map(b => b.id === ptEditing.id ? result : b) : [result, ...prev])
      cacheInvalidate("gym/bookings/pt")
      setPtDrawer(null); setPtEditing(null); setPtForm({ ...BLANK_PT })
    } else {
      const d = await res.json().catch(() => ({}))
      setPtError(d?.detail ?? "Failed to save.")
    }
    setPtSaving(false)
  }

  function openEditPT(b: PTBooking) {
    setPtEditing(b)
    setPtForm({ member_id: b.member_id, trainer_id: b.trainer_id, date_time: b.date_time.slice(0, 16), duration: b.duration, session_type: b.session_type, notes: b.notes ?? "" })
    setPtError("")
    setPtDrawer("edit")
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      Confirmed:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      Waitlisted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      Cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      Attended:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      Completed:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    }
    return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[status] ?? "bg-muted text-muted-foreground")}>{status}</span>
  }


  const cbStats = summaryStats(classBookings)
  const ptStats = summaryStats(ptBookings)
  const stats   = tab === "class" ? cbStats : ptStats

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        {tab === "class" ? (
          <button onClick={() => { setWalkin(true); setWError("") }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Walk-in Book
          </button>
        ) : (
          <button onClick={() => { setPtDrawer("add"); setPtEditing(null); setPtForm({ ...BLANK_PT }); setPtError("") }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> New PT Booking
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Bookings", value: stats.total,     icon: <Users className="h-4 w-4 text-muted-foreground" /> },
          { label: "Attended",         value: stats.attended,  icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
          { label: "Cancelled",        value: stats.cancelled, icon: <XCircle className="h-4 w-4 text-red-500" /> },
          { label: "Waitlisted",       value: stats.waitlisted,icon: <Clock className="h-4 w-4 text-yellow-500" /> },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["class", "pt"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t === "class" ? "Class Bookings" : "Personal Training"}
          </button>
        ))}
      </div>

      {/* ── CLASS BOOKINGS TAB ── */}
      {tab === "class" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search member or class…" value={cbSearch} onChange={e => setCbSearch(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-52" />
            </div>
            <input type="date" value={cbDateFrom} onChange={e => setCbDateFrom(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <input type="date" value={cbDateTo} onChange={e => setCbDateTo(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <div className="flex rounded-md border border-border overflow-hidden">
              {CLASS_BOOKING_STATUSES.map(s => (
                <button key={s} onClick={() => setCbStatus(s)}
                  className={cn("px-3 py-2 text-xs font-medium transition-colors",
                    cbStatus === s ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trainer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date & Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cbLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : filteredCB.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No bookings found.</td></tr>
                ) : (
                  filteredCB.map(b => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{b.member_name}</td>
                      <td className="px-4 py-3">
                        <p>{b.class_name}</p>
                        <p className="text-xs text-muted-foreground">{b.class_type}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.trainer_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDT(b.date_time)}</td>
                      <td className="px-4 py-3">{statusBadge(b.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status !== "Attended" && b.status !== "Cancelled" && (
                            <button onClick={() => classAction(b.id, "attend")} disabled={acting === b.id}
                              className="rounded-md px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 disabled:opacity-50 transition-colors">
                              Attended
                            </button>
                          )}
                          {b.status !== "Cancelled" && b.status !== "Attended" && (
                            <button onClick={() => classAction(b.id, "cancel")} disabled={acting === b.id}
                              className="rounded-md px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 disabled:opacity-50 transition-colors">
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ── PT BOOKINGS TAB ── */}
      {tab === "pt" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search member or trainer…" value={ptSearch} onChange={e => setPtSearch(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-56" />
            </div>
            <div className="flex rounded-md border border-border overflow-hidden">
              {PT_STATUSES.map(s => (
                <button key={s} onClick={() => setPtStatus(s)}
                  className={cn("px-3 py-2 text-xs font-medium transition-colors",
                    ptStatus === s ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trainer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date & Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Session</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ptLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : filteredPT.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No PT bookings found.</td></tr>
                ) : (
                  filteredPT.map(b => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{b.member_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.trainer_name}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDT(b.date_time)}</td>
                      <td className="px-4 py-3">
                        <p>{b.session_type}</p>
                        <p className="text-xs text-muted-foreground">{b.duration}</p>
                      </td>
                      <td className="px-4 py-3">{statusBadge(b.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status === "Confirmed" && (
                            <>
                              <button onClick={() => openEditPT(b)}
                                className="rounded-md px-2.5 py-1 text-xs font-medium border border-border hover:bg-accent transition-colors">
                                Edit
                              </button>
                              <button onClick={() => ptAction(b.id, "complete")} disabled={acting === b.id}
                                className="rounded-md px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 disabled:opacity-50 transition-colors">
                                Complete
                              </button>
                              <button onClick={() => ptAction(b.id, "cancel")} disabled={acting === b.id}
                                className="rounded-md px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 disabled:opacity-50 transition-colors">
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── WALK-IN MODAL ── */}
      {walkin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setWalkin(false)} />
          <div className="relative z-10 w-full max-w-sm bg-background rounded-xl border border-border shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-medium">Walk-in Book</p>
              <button onClick={() => setWalkin(false)} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Member *</label>
                <select value={wForm.member_id} onChange={e => setWForm(p => ({ ...p, member_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">— Select member —</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Class *</label>
                <select value={wForm.class_id} onChange={e => setWForm(p => ({ ...p, class_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">— Select class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.next_date ? ` · ${c.next_date}` : ""}</option>)}
                </select>
              </div>
              {wError && <p className="text-sm text-destructive">{wError}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setWalkin(false)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={saveWalkin} disabled={wSaving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {wSaving ? "Booking…" : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PT BOOKING DRAWER ── */}
      {ptDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPtDrawer(null); setPtEditing(null) }} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-medium">{ptDrawer === "edit" ? "Edit PT Booking" : "New PT Booking"}</p>
              <button onClick={() => { setPtDrawer(null); setPtEditing(null) }} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Member */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Member *</label>
                <select value={ptForm.member_id} onChange={e => setPtForm(p => ({ ...p, member_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">— Select member —</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              {/* Trainer */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Trainer *</label>
                <select value={ptForm.trainer_id} onChange={e => setPtForm(p => ({ ...p, trainer_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">— Select trainer —</option>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {/* Date & Time */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date & Time *</label>
                <input type="datetime-local" value={ptForm.date_time} onChange={e => setPtForm(p => ({ ...p, date_time: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              {/* Duration + Session Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration</label>
                  <select value={ptForm.duration} onChange={e => setPtForm(p => ({ ...p, duration: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {SESSION_DURATIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Session Type</label>
                  <select value={ptForm.session_type} onChange={e => setPtForm(p => ({ ...p, session_type: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {SESSION_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <textarea value={ptForm.notes} onChange={e => setPtForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} placeholder="Any notes for this session…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              {ptError && <p className="text-sm text-destructive">{ptError}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => { setPtDrawer(null); setPtEditing(null) }}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={savePT} disabled={ptSaving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {ptSaving ? "Saving…" : ptDrawer === "edit" ? "Save Changes" : "Book Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
