"use client"

import { useEffect, useState } from "react"
import { Plus, X, CalendarDays, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/portal/StatusBadge"
import { API } from "@/lib/api"

type Reservation = {
  id: string
  guest_name: string
  guest_phone?: string
  party_size: number
  scheduled_at: string
  status: "pending" | "confirmed" | "seated" | "completed" | "no_show"
  notes?: string
  table_id?: string
}

const STATUSES = ["all", "pending", "confirmed", "seated", "completed", "no_show"]

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "seated",
  seated: "completed",
}

const EMPTY: Omit<Reservation, "id" | "status"> = {
  guest_name: "",
  guest_phone: "",
  party_size: 2,
  scheduled_at: "",
  notes: "",
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-PH", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
        props.className
      )}
    />
  )
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [updating, setUpdating] = useState(false)

  // Create/edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch(`${API}/api/v1/restaurant/reservations`, { credentials: "include" })
    if (res.ok) setReservations(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === "all"
    ? reservations
    : reservations.filter(r => r.status === filter)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setError("")
    setModalOpen(true)
  }

  function openEdit(r: Reservation) {
    setEditing(r)
    setForm({
      guest_name: r.guest_name,
      guest_phone: r.guest_phone ?? "",
      party_size: r.party_size,
      scheduled_at: r.scheduled_at.slice(0, 16), // datetime-local format
      notes: r.notes ?? "",
    })
    setError("")
    setModalOpen(true)
  }

  async function save() {
    if (!form.guest_name.trim() || !form.scheduled_at) {
      setError("Guest name and date/time are required.")
      return
    }
    setSaving(true)
    setError("")
    const url = editing
      ? `/api/v1/restaurant/reservations/${editing.id}`
      : "/api/v1/restaurant/reservations"
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, party_size: Number(form.party_size) }),
    })
    if (res.ok) {
      await load()
      setModalOpen(false)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to save reservation.")
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(true)
    const res = await fetch(`${API}/api/v1/restaurant/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: Reservation = await res.json()
      setReservations(prev => prev.map(r => r.id === id ? updated : r))
      setSelected(updated)
    }
    setUpdating(false)
  }

  async function markNoShow(id: string) {
    await updateStatus(id, "no_show")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Reservation
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Guest", "Party", "Date & Time", "Status", "Notes"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No reservations found.
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.guest_name}</p>
                    {r.guest_phone && <p className="text-xs text-muted-foreground">{r.guest_phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="size-3.5" />{r.party_size}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" />{fmt(r.scheduled_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[160px]">
                    {r.notes || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-medium">{selected.guest_name}</p>
                <p className="text-xs text-muted-foreground">{selected.guest_phone || "No phone"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <StatusBadge status={selected.status} />

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  <span>Party of {selected.party_size}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  <span>{fmt(selected.scheduled_at)}</span>
                </div>
                {selected.notes && (
                  <p className="text-muted-foreground italic">{selected.notes}</p>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border space-y-2">
              {NEXT_STATUS[selected.status] && (
                <button
                  onClick={() => updateStatus(selected.id, NEXT_STATUS[selected.status])}
                  disabled={updating}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity capitalize"
                >
                  {updating ? "Updating…" : `Mark as ${NEXT_STATUS[selected.status]}`}
                </button>
              )}
              {(selected.status === "pending" || selected.status === "confirmed") && (
                <button
                  onClick={() => markNoShow(selected.id)}
                  disabled={updating}
                  className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
                >
                  Mark as No-show
                </button>
              )}
              <button
                onClick={() => { setSelected(null); openEdit(selected) }}
                className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-background rounded-xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editing ? "Edit Reservation" : "New Reservation"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-accent transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <Field label="Guest name">
              <Input
                value={form.guest_name}
                onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                placeholder="Juan dela Cruz"
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={form.guest_phone}
                onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))}
                placeholder="+63 9XX XXX XXXX"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Party size">
                <Input
                  type="number"
                  min={1}
                  value={form.party_size}
                  onChange={e => setForm(f => ({ ...f, party_size: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Date & time">
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Notes">
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Allergies, special requests…"
              />
            </Field>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
