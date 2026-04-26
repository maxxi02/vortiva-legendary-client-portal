"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, X, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

type Trainer = {
  id: string
  name: string
  email: string
  phone?: string
  specialization?: string
  status: "active" | "inactive"
  hire_date: string
  photo_url?: string
}

const EMPTY_FORM = { name: "", email: "", phone: "", specialization: "", hire_date: "" }

export default function TrainersPage() {
  const router = useRouter()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [menuId, setMenuId] = useState<string | null>(null)

  async function load() {
    const data = await cachedFetch<Trainer[]>(`${API}/api/v1/gym/trainers`, TTL, { credentials: "include" }).catch(() => [])
    setTrainers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!menuId) return
    const h = () => setMenuId(null)
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [menuId])

  const filtered = trainers.filter(t => {
    const q = search.toLowerCase()
    return !q || t.name.toLowerCase().includes(q) || (t.specialization ?? "").toLowerCase().includes(q)
  })

  async function addTrainer() {
    if (!form.name.trim()) { setError("Name is required."); return }
    if (!form.email.trim()) { setError("Email is required."); return }
    setError("")
    setSaving(true)
    const res = await fetch(`${API}/api/v1/gym/trainers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, phone: form.phone || null, specialization: form.specialization || null, hire_date: form.hire_date || null }),
    })
    if (res.ok) {
      const created = await res.json()
      setTrainers(prev => [created, ...prev])
      setAdding(false)
      setForm(EMPTY_FORM)
      cacheInvalidate("gym/trainers")
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to add trainer.")
    }
    setSaving(false)
  }

  async function toggleStatus(t: Trainer) {
    const res = await fetch(`${API}/api/v1/gym/trainers/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: t.status === "active" ? "inactive" : "active" }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTrainers(prev => prev.map(x => x.id === t.id ? updated : x))
      cacheInvalidate("gym/trainers")
    }
  }

  async function deleteTrainer(id: string) {
    if (!confirm("Delete this trainer?")) return
    const res = await fetch(`${API}/api/v1/gym/trainers/${id}`, { method: "DELETE", credentials: "include" })
    if (res.ok) {
      setTrainers(prev => prev.filter(t => t.id !== id))
      cacheInvalidate("gym/trainers")
    }
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Trainers</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Trainer
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or specialization…"
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Name", "Specialization", "Status", "Hire Date", "Contact", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-20" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No trainers found.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <button onClick={() => router.push(`/portal/trainers/${t.id}`)} className="font-medium hover:underline text-left">
                    {t.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.specialization ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    t.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {t.hire_date ? new Date(t.hire_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{t.phone ?? t.email}</td>
                <td className="px-4 py-3 relative">
                  <button
                    onClick={e => { e.stopPropagation(); setMenuId(menuId === t.id ? null : t.id) }}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuId === t.id && (
                    <div onClick={e => e.stopPropagation()} className="absolute right-4 top-10 z-20 w-40 rounded-md border border-border bg-background shadow-lg py-1 text-sm">
                      <button onClick={() => { router.push(`/portal/trainers/${t.id}`); setMenuId(null) }} className="w-full px-3 py-2 text-left hover:bg-accent transition-colors">View Profile</button>
                      <button onClick={() => { toggleStatus(t); setMenuId(null) }} className="w-full px-3 py-2 text-left hover:bg-accent transition-colors">
                        {t.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => { deleteTrainer(t.id); setMenuId(null) }} className="w-full px-3 py-2 text-left text-destructive hover:bg-accent transition-colors">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setAdding(false); setError("") }} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-medium">Add Trainer</p>
              <button onClick={() => { setAdding(false); setError("") }} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[
                ["Name *", "name", "text"],
                ["Email *", "email", "email"],
                ["Phone", "phone", "tel"],
                ["Specialization", "specialization", "text"],
                ["Hire Date", "hire_date", "date"],
              ].map(([label, key, type]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof EMPTY_FORM]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => { setAdding(false); setError("") }} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={addTrainer} disabled={saving} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saving ? "Saving…" : "Add Trainer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
