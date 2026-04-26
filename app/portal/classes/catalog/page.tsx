"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

const FITNESS_LEVELS = ["All Levels", "Beginner", "Intermediate", "Advanced"]
const COLOR_OPTIONS = [
  { label: "Purple", value: "purple", cls: "bg-purple-500" },
  { label: "Red",    value: "red",    cls: "bg-red-500" },
  { label: "Orange", value: "orange", cls: "bg-orange-500" },
  { label: "Pink",   value: "pink",   cls: "bg-pink-500" },
  { label: "Blue",   value: "blue",   cls: "bg-blue-500" },
  { label: "Yellow", value: "yellow", cls: "bg-yellow-400" },
  { label: "Green",  value: "green",  cls: "bg-green-500" },
  { label: "Gray",   value: "gray",   cls: "bg-gray-400" },
]

type ClassType = {
  id: string
  name: string
  description?: string
  icon?: string
  color: string
  required_fitness_level: string
}

const BLANK: Omit<ClassType, "id"> = {
  name: "",
  description: "",
  icon: "",
  color: "purple",
  required_fitness_level: "All Levels",
}

export default function ClassCatalogPage() {
  const router = useRouter()
  const [types, setTypes]       = useState<ClassType[]>([])
  const [loading, setLoading]   = useState(true)
  const [drawer, setDrawer]     = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]   = useState<ClassType | null>(null)
  const [form, setForm]         = useState({ ...BLANK })
  const [saving, setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]       = useState("")

  async function load() {
    const data = await cachedFetch<ClassType[]>(`${API}/api/v1/gym/class-types`, TTL, { credentials: "include" }).catch(() => [])
    setTypes(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ ...BLANK })
    setError("")
    setDrawer("add")
  }

  function openEdit(t: ClassType) {
    setEditing(t)
    setForm({ name: t.name, description: t.description ?? "", icon: t.icon ?? "", color: t.color, required_fitness_level: t.required_fitness_level })
    setError("")
    setDrawer("edit")
  }

  function close() { setDrawer(null); setEditing(null); setError("") }

  async function save() {
    if (!form.name.trim()) { setError("Name is required."); return }
    setError("")
    setSaving(true)
    const url    = editing ? `${API}/api/v1/gym/class-types/${editing.id}` : `${API}/api/v1/gym/class-types`
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const result = await res.json()
      setTypes(prev => editing ? prev.map(t => t.id === editing.id ? result : t) : [result, ...prev])
      cacheInvalidate("gym/class-types")
      close()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to save.")
    }
    setSaving(false)
  }

  async function deleteType(t: ClassType) {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return
    setDeletingId(t.id)
    const res = await fetch(`${API}/api/v1/gym/class-types/${t.id}`, { method: "DELETE", credentials: "include" })
    if (res.ok) {
      setTypes(prev => prev.filter(x => x.id !== t.id))
      cacheInvalidate("gym/class-types")
    }
    setDeletingId(null)
  }

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  function colorDot(color: string) {
    return COLOR_OPTIONS.find(c => c.value === color)?.cls ?? "bg-gray-400"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">Class Catalog</h1>
        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Class Type
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fitness Level</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : types.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No class types yet.</td>
              </tr>
            ) : (
              types.map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-3 w-3 rounded-full shrink-0", colorDot(t.color))} />
                      <span className="font-medium">{t.name}</span>
                      {t.icon && <span className="text-base">{t.icon}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.description || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.required_fitness_level}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteType(t)}
                        disabled={deletingId === t.id}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-medium">{drawer === "edit" ? "Edit Class Type" : "Add Class Type"}</p>
              <button onClick={close} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name *</label>
                <input type="text" placeholder="e.g. Yoga" value={form.name} onChange={e => f("name", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              {/* Icon */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Icon (emoji)</label>
                <input type="text" placeholder="e.g. 🧘" value={form.icon} onChange={e => f("icon", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Color Tag</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => f("color", c.value)}
                      title={c.label}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-all",
                        c.cls,
                        form.color === c.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Fitness Level */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Required Fitness Level</label>
                <select value={form.required_fitness_level} onChange={e => f("required_fitness_level", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {FITNESS_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea value={form.description} onChange={e => f("description", e.target.value)}
                  rows={3} placeholder="What this class involves…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={close} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saving ? "Saving…" : drawer === "edit" ? "Save Changes" : "Add Type"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
