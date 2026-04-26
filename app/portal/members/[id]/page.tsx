"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, User, Pencil, Snowflake, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_number?: string
  membership_plan?: string
  membership_plan_id?: string
  status: "active" | "frozen" | "expired"
  join_date: string
  expiry_date?: string
  photo_url?: string
  notes?: string
}

type Attendance = { id: string; visited_at: string }
type Booking    = { id: string; class_name: string; scheduled_date: string; status: string }
type Payment    = { id: string; amount: number; description: string; paid_at: string; method?: string }

const STATUS_STYLES: Record<string, string> = {
  active:  "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  frozen:  "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
}

function daysUntil(dateStr?: string) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [member, setMember]       = useState<Member | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [payments, setPayments]   = useState<Payment[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [editNote, setEditNote]   = useState(false)
  const [note, setNote]           = useState("")

  async function load() {
    const [m, a, b, p] = await Promise.all([
      cachedFetch<Member>(`${API}/api/v1/gym/members/${id}`, TTL, { credentials: "include" }).catch(() => null),
      cachedFetch<Attendance[]>(`${API}/api/v1/gym/members/${id}/attendance`, TTL, { credentials: "include" }).catch(() => []),
      cachedFetch<Booking[]>(`${API}/api/v1/gym/members/${id}/bookings`, TTL, { credentials: "include" }).catch(() => []),
      cachedFetch<Payment[]>(`${API}/api/v1/gym/members/${id}/payments`, TTL, { credentials: "include" }).catch(() => []),
    ])
    setMember(m)
    setAttendance(Array.isArray(a) ? a : [])
    setBookings(Array.isArray(b) ? b : [])
    setPayments(Array.isArray(p) ? p : [])
    if (m?.notes) setNote(m.notes)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function toggleFreeze() {
    if (!member) return
    const newStatus = member.status === "frozen" ? "active" : "frozen"
    setSaving(true)
    const res = await fetch(`${API}/api/v1/gym/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMember(updated)
      cacheInvalidate("gym/members")
    }
    setSaving(false)
  }

  async function saveNote() {
    const res = await fetch(`${API}/api/v1/gym/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ notes: note }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMember(updated)
      setEditNote(false)
      cacheInvalidate("gym/members")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <p>Member not found.</p>
        <button onClick={() => router.back()} className="text-sm underline">Go back</button>
      </div>
    )
  }

  const daysLeft = daysUntil(member.expiry_date)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Members
      </button>

      {/* Info card */}
      <div className="rounded-lg border border-border bg-card p-5 flex gap-4 items-start">
        <div className="shrink-0 h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {member.photo_url
            ? <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
            : <User className="h-7 w-7 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{member.first_name} {member.last_name}</h1>
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[member.status])}>
              {member.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{member.email}</p>
          {member.phone && <p className="text-sm text-muted-foreground">{member.phone}</p>}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
            {member.date_of_birth && <span>DOB: {new Date(member.date_of_birth).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</span>}
            {member.emergency_contact_name && <span>Emergency: {member.emergency_contact_name} {member.emergency_contact_number && `· ${member.emergency_contact_number}`}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => router.push(`/portal/members/${id}?edit=1`)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={toggleFreeze}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Snowflake className="h-3.5 w-3.5" />
            {member.status === "frozen" ? "Unfreeze" : "Freeze"}
          </button>
          <button
            onClick={() => router.push(`/portal/members/${id}?renew=1`)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Renew
          </button>
        </div>
      </div>

      {/* Membership plan */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-2">
        <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Active Membership</h2>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-lg">{member.membership_plan ?? "No plan assigned"}</p>
          {daysLeft !== null && (
            <span className={cn(
              "text-sm font-medium",
              daysLeft < 0 ? "text-destructive" : daysLeft <= 7 ? "text-amber-600" : "text-muted-foreground"
            )}>
              {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? "Expires today" : `${daysLeft}d remaining`}
            </span>
          )}
        </div>
        {member.expiry_date && (
          <p className="text-xs text-muted-foreground">
            Expires {new Date(member.expiry_date).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </div>

      {/* Attendance history */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Attendance History</h2>
        {attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visits recorded.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {attendance.slice(0, 30).map(a => (
              <span key={a.id} className="rounded-md bg-muted px-2.5 py-1 text-xs">
                {new Date(a.visited_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            ))}
            {attendance.length > 30 && <span className="text-xs text-muted-foreground self-center">+{attendance.length - 30} more</span>}
          </div>
        )}
      </div>

      {/* Class booking history */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Class Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No class bookings.</p>
        ) : (
          <div className="divide-y divide-border">
            {bookings.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{b.class_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.scheduled_date).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className="capitalize text-xs text-muted-foreground">{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment history */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <div className="divide-y divide-border">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{p.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.paid_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    {p.method && ` · ${p.method}`}
                  </p>
                </div>
                <span className="font-semibold">₱{p.amount.toLocaleString("en-PH")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes / flags */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Notes & Flags</h2>
          {!editNote && (
            <button onClick={() => setEditNote(true)} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              {member.notes ? "Edit" : "Add note"}
            </button>
          )}
        </div>
        {editNote ? (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="e.g. Knee injury — avoid high-impact classes"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditNote(false)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors">Cancel</button>
              <button onClick={saveNote} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes || "No notes."}</p>
        )}
      </div>
    </div>
  )
}
