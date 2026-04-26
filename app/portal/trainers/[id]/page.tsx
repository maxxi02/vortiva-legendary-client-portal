"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Pencil, X, Check } from "lucide-react"
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
  bio?: string
  photo_url?: string
}

type AssignedClass = { id: string; name: string; schedule: string; enrolled: number }

export default function TrainerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [classes, setClasses] = useState<AssignedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Trainer>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    const [t, c] = await Promise.all([
      cachedFetch<Trainer>(`${API}/api/v1/gym/trainers/${id}`, TTL, { credentials: "include" }).catch(() => null),
      cachedFetch<AssignedClass[]>(`${API}/api/v1/gym/trainers/${id}/classes`, TTL, { credentials: "include" }).catch(() => []),
    ])
    setTrainer(t)
    setClasses(Array.isArray(c) ? c : [])
    if (t) setForm({ name: t.name, email: t.email, phone: t.phone ?? "", specialization: t.specialization ?? "", bio: t.bio ?? "" })
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function save() {
    if (!form.name?.trim()) { setError("Name is required."); return }
    setError("")
    setSaving(true)
    const res = await fetch(`${API}/api/v1/gym/trainers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const updated = await res.json()
      setTrainer(updated)
      setEditing(false)
      cacheInvalidate(`gym/trainers/${id}`)
      cacheInvalidate("gym/trainers")
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to save.")
    }
    setSaving(false)
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
      <div className="h-48 rounded-xl bg-muted" />
    </div>
  )
  if (!trainer) return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <p className="text-center text-muted-foreground py-12">Trainer not found.</p>
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Trainers
      </button>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {trainer.photo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={trainer.photo_url} alt={trainer.name} className="h-full w-full object-cover" />
            : <span className="text-2xl font-semibold text-muted-foreground">{trainer.name[0]}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{trainer.name}</h1>
            <span className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              trainer.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}>
              {trainer.status}
            </span>
          </div>
          {trainer.specialization && <p className="text-sm text-muted-foreground mt-0.5">{trainer.specialization}</p>}
          <p className="text-xs text-muted-foreground mt-1">{trainer.email}{trainer.phone ? ` · ${trainer.phone}` : ""}</p>
          {trainer.hire_date && (
            <p className="text-xs text-muted-foreground">
              Hired {new Date(trainer.hire_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
        <button
          onClick={() => setEditing(v => !v)}
          className="p-2 rounded-md hover:bg-accent transition-colors shrink-0"
        >
          {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-medium">Edit Trainer</h2>
          {([
            ["Name *", "name", "text"],
            ["Email *", "email", "email"],
            ["Phone", "phone", "tel"],
            ["Specialization", "specialization", "text"],
          ] as const).map(([label, key, type]) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium">{label}</label>
              <input
                type={type}
                value={(form[key] as string) ?? ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              rows={3}
              value={form.bio ?? ""}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              className={`${inputCls} resize-none`}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setError("") }} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Bio */}
      {!editing && trainer.bio && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium mb-2">Bio</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trainer.bio}</p>
        </div>
      )}

      {/* Assigned classes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium mb-3">Assigned Classes</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes assigned.</p>
        ) : (
          <div className="divide-y divide-border">
            {classes.map(c => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.schedule}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{c.enrolled} enrolled</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
