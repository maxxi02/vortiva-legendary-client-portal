"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Pencil, Wrench, PowerOff, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

const CATEGORIES   = ["Cardio", "Free Weights", "Machines", "Accessories", "Furniture", "Electronics"]
const CONDITIONS   = ["Excellent", "Good", "Needs Repair", "Out of Service"]
const COND_FILTER  = ["All", ...CONDITIONS]

type Equipment = {
  id: string
  name: string
  category: string
  brand_model: string
  serial_number: string
  purchase_date: string
  purchase_price: number
  condition: string
  location: string
  warranty_expiry: string
  maintenance_interval: number
  last_maintenance_date: string
  next_maintenance_due: string
  notes: string
}

type MaintForm = {
  date: string
  performed_by: string
  work_done: string
  cost: string
  next_due_date: string
}

const BLANK_EQ: Omit<Equipment, "id" | "last_maintenance_date" | "next_maintenance_due"> = {
  name: "", category: "Cardio", brand_model: "", serial_number: "",
  purchase_date: "", purchase_price: 0, condition: "Good", location: "",
  warranty_expiry: "", maintenance_interval: 90, notes: "",
}

const BLANK_MAINT: MaintForm = {
  date: new Date().toISOString().slice(0, 10),
  performed_by: "", work_done: "", cost: "", next_due_date: "",
}

function condBadge(c: string) {
  const map: Record<string, string> = {
    "Excellent":     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "Good":          "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    "Needs Repair":  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    "Out of Service":"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", map[c] ?? "bg-muted text-muted-foreground")}>
      {c}
    </span>
  )
}

function fmt(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

function isOverdue(d: string) {
  return d && new Date(d) < new Date()
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [condFilter, setCondFilter] = useState("All")
  const [catFilter, setCatFilter]   = useState("All")

  // Add/Edit drawer
  const [drawer, setDrawer]       = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]     = useState<Equipment | null>(null)
  const [form, setForm]           = useState<typeof BLANK_EQ>({ ...BLANK_EQ })
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState("")

  // Log Maintenance modal
  const [maintTarget, setMaintTarget] = useState<Equipment | null>(null)
  const [maintForm, setMaintForm]     = useState<MaintForm>({ ...BLANK_MAINT })
  const [maintSaving, setMaintSaving] = useState(false)
  const [maintErr, setMaintErr]       = useState("")

  // Row actions
  const [acting, setActing] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await cachedFetch<Equipment[]>(`${API}/api/v1/gym/equipment`, TTL, { credentials: "include" })
      setEquipment(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase()
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.serial_number.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)
    const matchC = condFilter === "All" || e.condition === condFilter
    const matchCat = catFilter === "All" || e.category === catFilter
    return matchQ && matchC && matchCat
  })

  function openAdd() {
    setEditing(null)
    setForm({ ...BLANK_EQ })
    setFormErr("")
    setDrawer("add")
  }

  function openEdit(e: Equipment) {
    setEditing(e)
    setForm({
      name: e.name, category: e.category, brand_model: e.brand_model,
      serial_number: e.serial_number, purchase_date: e.purchase_date,
      purchase_price: e.purchase_price, condition: e.condition,
      location: e.location, warranty_expiry: e.warranty_expiry,
      maintenance_interval: e.maintenance_interval, notes: e.notes,
    })
    setFormErr("")
    setDrawer("edit")
  }

  async function saveEquipment() {
    if (!form.name.trim()) { setFormErr("Equipment name is required."); return }
    setSaving(true); setFormErr("")
    try {
      const url    = editing ? `${API}/api/v1/gym/equipment/${editing.id}` : `${API}/api/v1/gym/equipment`
      const method = editing ? "PUT" : "POST"
      const res    = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error(await res.text())
      cacheInvalidate("gym/equipment")
      await load()
      setDrawer(null)
    } catch (e: any) {
      setFormErr(e.message ?? "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  async function markOutOfService(id: string) {
    setActing(id)
    try {
      await fetch(`${API}/api/v1/gym/equipment/${id}/out-of-service`, { method: "POST", credentials: "include" })
      cacheInvalidate("gym/equipment")
      setEquipment(prev => prev.map(e => e.id === id ? { ...e, condition: "Out of Service" } : e))
    } finally {
      setActing(null)
    }
  }

  async function deleteEquipment(id: string) {
    if (!confirm("Delete this equipment record? This cannot be undone.")) return
    setActing(id)
    try {
      await fetch(`${API}/api/v1/gym/equipment/${id}`, { method: "DELETE", credentials: "include" })
      cacheInvalidate("gym/equipment")
      setEquipment(prev => prev.filter(e => e.id !== id))
    } finally {
      setActing(null)
    }
  }

  function openMaint(e: Equipment) {
    setMaintTarget(e)
    setMaintForm({ ...BLANK_MAINT })
    setMaintErr("")
  }

  async function saveMaint() {
    if (!maintForm.work_done.trim() || !maintForm.performed_by.trim()) {
      setMaintErr("Performed By and Work Done are required."); return
    }
    setMaintSaving(true); setMaintErr("")
    try {
      const res = await fetch(`${API}/api/v1/gym/equipment/${maintTarget!.id}/maintenance`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintForm),
      })
      if (!res.ok) throw new Error(await res.text())
      cacheInvalidate("gym/equipment")
      cacheInvalidate("gym/equipment/maintenance")
      await load()
      setMaintTarget(null)
    } catch (e: any) {
      setMaintErr(e.message ?? "Failed to save.")
    } finally {
      setMaintSaving(false)
    }
  }


  const f = (field: keyof typeof BLANK_EQ, val: any) => setForm(p => ({ ...p, [field]: val }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Equipment</h1>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search name, serial, location…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-60" />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          {COND_FILTER.map(c => (
            <button key={c} onClick={() => setCondFilter(c)}
              className={cn("px-3 py-2 text-xs font-medium transition-colors",
                condFilter === c ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {c}
            </button>
          ))}
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Equipment</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Serial No.</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Purchase Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Condition</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Maintenance</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Next Due</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No equipment found.</td></tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.brand_model || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.serial_number || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(e.purchase_date)}</td>
                  <td className="px-4 py-3">{condBadge(e.condition)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(e.last_maintenance_date)}</td>
                  <td className={cn("px-4 py-3 whitespace-nowrap", isOverdue(e.next_maintenance_due) ? "text-red-600 font-medium" : "text-muted-foreground")}>
                    {fmt(e.next_maintenance_due)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(e)} title="Edit"
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openMaint(e)} title="Log Maintenance"
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <Wrench className="h-3.5 w-3.5" />
                      </button>
                      {e.condition !== "Out of Service" && (
                        <button onClick={() => markOutOfService(e.id)} disabled={acting === e.id} title="Mark Out of Service"
                          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-red-600 disabled:opacity-50">
                          <PowerOff className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteEquipment(e.id)} disabled={acting === e.id} title="Delete"
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-red-600 disabled:opacity-50">
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

      {/* ── ADD / EDIT DRAWER ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-medium">{drawer === "edit" ? "Edit Equipment" : "Add Equipment"}</p>
              <button onClick={() => setDrawer(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[
                { label: "Equipment Name *", field: "name" as const, type: "text" },
                { label: "Brand / Model",    field: "brand_model" as const, type: "text" },
                { label: "Serial Number",    field: "serial_number" as const, type: "text" },
                { label: "Location / Area",  field: "location" as const, type: "text" },
              ].map(({ label, field, type }) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={form[field] as string} onChange={e => f(field, e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select value={form.category} onChange={e => f("category", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Condition</label>
                  <select value={form.condition} onChange={e => f("condition", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Purchase Date</label>
                  <input type="date" value={form.purchase_date} onChange={e => f("purchase_date", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Purchase Price (₱)</label>
                  <input type="number" min={0} value={form.purchase_price} onChange={e => f("purchase_price", Number(e.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Warranty Expiry</label>
                  <input type="date" value={form.warranty_expiry} onChange={e => f("warranty_expiry", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Maintenance Interval (days)</label>
                  <input type="number" min={1} value={form.maintenance_interval} onChange={e => f("maintenance_interval", Number(e.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              {formErr && <p className="text-sm text-destructive">{formErr}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setDrawer(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={saveEquipment} disabled={saving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saving ? "Saving…" : drawer === "edit" ? "Save Changes" : "Add Equipment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOG MAINTENANCE MODAL ── */}
      {maintTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMaintTarget(null)} />
          <div className="relative z-10 w-full max-w-md bg-background rounded-xl border border-border shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-medium">Log Maintenance</p>
                <p className="text-xs text-muted-foreground">{maintTarget.name}</p>
              </div>
              <button onClick={() => setMaintTarget(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date *</label>
                  <input type="date" value={maintForm.date} onChange={e => setMaintForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cost (₱)</label>
                  <input type="number" min={0} value={maintForm.cost} onChange={e => setMaintForm(p => ({ ...p, cost: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Performed By *</label>
                <input type="text" placeholder="Staff name or vendor" value={maintForm.performed_by}
                  onChange={e => setMaintForm(p => ({ ...p, performed_by: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Work Done *</label>
                <textarea value={maintForm.work_done} onChange={e => setMaintForm(p => ({ ...p, work_done: e.target.value }))}
                  rows={3} placeholder="Describe the maintenance performed…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Next Due Date</label>
                <input type="date" value={maintForm.next_due_date} onChange={e => setMaintForm(p => ({ ...p, next_due_date: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              {maintErr && <p className="text-sm text-destructive">{maintErr}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setMaintTarget(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={saveMaint} disabled={maintSaving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {maintSaving ? "Saving…" : "Log Maintenance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
