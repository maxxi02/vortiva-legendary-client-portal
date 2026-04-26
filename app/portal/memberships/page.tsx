"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, CreditCard, Users, Pencil, PowerOff, Power } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

const DURATION_OPTIONS = [
  { label: "1 Month",  days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year",   days: 365 },
  { label: "Custom",   days: 0 },
]

const ACCESS_LEVELS = [
  { value: "basic",    label: "Basic",    desc: "Gym floor only" },
  { value: "standard", label: "Standard", desc: "Gym + group classes" },
  { value: "premium",  label: "Premium",  desc: "Gym + all classes + 1 PT session/month" },
]

const ADDONS = [
  { key: "pt_sessions",   label: "Personal Training Sessions", unit: "per session" },
  { key: "locker",        label: "Locker Rental",              unit: "per month" },
  { key: "towel",         label: "Towel Service",              unit: "per month" },
  { key: "parking",       label: "Parking",                    unit: "per month" },
]

type Addon = { enabled: boolean; price: string }
type AddonMap = Record<string, Addon>

type Plan = {
  id: string
  name: string
  duration_days: number
  price: number
  access_level: string
  max_freeze_days: number
  description?: string
  is_active: boolean
  active_members_count?: number
  addons?: AddonMap
}

const BLANK_FORM = {
  name: "",
  duration_preset: "30",
  custom_days: "",
  price: "",
  access_level: "basic",
  max_freeze_days: "14",
  description: "",
  is_active: true,
}

const BLANK_ADDONS: AddonMap = Object.fromEntries(ADDONS.map(a => [a.key, { enabled: false, price: "" }]))

export default function MembershipsPage() {
  const router = useRouter()
  const [plans, setPlans]       = useState<Plan[]>([])
  const [loading, setLoading]   = useState(true)
  const [drawer, setDrawer]     = useState<"add" | "edit" | null>(null)
  const [editing, setEditing]   = useState<Plan | null>(null)
  const [form, setForm]         = useState({ ...BLANK_FORM })
  const [addons, setAddons]     = useState<AddonMap>({ ...BLANK_ADDONS })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")

  async function load() {
    const data = await cachedFetch<Plan[]>(`${API}/api/v1/gym/membership-plans`, TTL, { credentials: "include" }).catch(() => [])
    setPlans(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ ...BLANK_FORM })
    setAddons({ ...BLANK_ADDONS })
    setError("")
    setDrawer("add")
  }

  function openEdit(plan: Plan) {
    setEditing(plan)
    const preset = DURATION_OPTIONS.find(o => o.days === plan.duration_days)
    setForm({
      name: plan.name,
      duration_preset: preset ? String(preset.days) : "0",
      custom_days: preset ? "" : String(plan.duration_days),
      price: String(plan.price),
      access_level: plan.access_level ?? "basic",
      max_freeze_days: String(plan.max_freeze_days ?? 14),
      description: plan.description ?? "",
      is_active: plan.is_active,
    })
    const merged: AddonMap = { ...BLANK_ADDONS }
    if (plan.addons) {
      for (const k of Object.keys(plan.addons)) {
        if (merged[k]) merged[k] = plan.addons[k]
      }
    }
    setAddons(merged)
    setError("")
    setDrawer("edit")
  }

  function closeDrawer() { setDrawer(null); setEditing(null); setError("") }

  function durationDays() {
    if (form.duration_preset === "0") return parseInt(form.custom_days) || 0
    return parseInt(form.duration_preset) || 30
  }

  async function save() {
    if (!form.name.trim() || !form.price) { setError("Name and price are required."); return }
    const days = durationDays()
    if (!days) { setError("Enter a valid duration."); return }
    setError("")
    setSaving(true)
    const body = {
      name: form.name.trim(),
      duration_days: days,
      price: parseFloat(form.price),
      access_level: form.access_level,
      max_freeze_days: parseInt(form.max_freeze_days) || 14,
      description: form.description || null,
      is_active: form.is_active,
      addons: Object.fromEntries(
        Object.entries(addons).filter(([, v]) => v.enabled).map(([k, v]) => [k, { enabled: true, price: parseFloat(v.price) || 0 }])
      ),
    }
    const url    = editing ? `${API}/api/v1/gym/membership-plans/${editing.id}` : `${API}/api/v1/gym/membership-plans`
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) })
    if (res.ok) {
      const result = await res.json()
      setPlans(prev => editing ? prev.map(p => p.id === editing.id ? result : p) : [result, ...prev])
      cacheInvalidate("gym/membership-plans")
      closeDrawer()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to save plan.")
    }
    setSaving(false)
  }

  async function toggleActive(plan: Plan) {
    const res = await fetch(`${API}/api/v1/gym/membership-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !plan.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPlans(prev => prev.map(p => p.id === plan.id ? updated : p))
      cacheInvalidate("gym/membership-plans")
    }
  }

  const f = (k: keyof typeof form, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Membership Plans</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/portal/memberships/renewals")}
            className="rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Renewals
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 rounded-lg border border-border animate-pulse bg-muted/30" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-md border border-border py-16 text-center text-muted-foreground">
          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No membership plans yet.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const accessLabel = ACCESS_LEVELS.find(a => a.value === plan.access_level)
            const addonKeys = plan.addons ? Object.keys(plan.addons).filter(k => plan.addons![k].enabled) : []
            return (
              <div key={plan.id} className={cn("rounded-lg border border-border bg-card p-5 flex flex-col gap-3", !plan.is_active && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    {plan.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>}
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    plan.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight">₱{Number(plan.price).toLocaleString("en-PH")}</p>
                    <p className="text-xs text-muted-foreground">{plan.duration_days} days</p>
                  </div>
                  {typeof plan.active_members_count === "number" && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {plan.active_members_count} members
                    </div>
                  )}
                </div>

                {accessLabel && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{accessLabel.label}</span> — {accessLabel.desc}
                  </p>
                )}

                {addonKeys.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {addonKeys.map(k => {
                      const a = ADDONS.find(x => x.key === k)
                      return a ? (
                        <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-xs">{a.label}</span>
                      ) : null
                    })}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-3 pt-1 border-t border-border">
                  <button onClick={() => openEdit(plan)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleActive(plan)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {plan.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    {plan.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => router.push(`/portal/members?plan=${plan.id}`)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    <Users className="h-3.5 w-3.5" /> View Members
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-medium">{drawer === "edit" ? "Edit Plan" : "Create Plan"}</p>
              <button onClick={closeDrawer} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Plan Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Basic"
                  value={form.name}
                  onChange={e => f("name", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duration</label>
                <select
                  value={form.duration_preset}
                  onChange={e => f("duration_preset", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {DURATION_OPTIONS.map(o => (
                    <option key={o.days} value={String(o.days)}>{o.label}</option>
                  ))}
                </select>
                {form.duration_preset === "0" && (
                  <input
                    type="number"
                    placeholder="Number of days"
                    value={form.custom_days}
                    onChange={e => f("custom_days", e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Price (₱) *</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={form.price}
                  onChange={e => f("price", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Access Level */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Access Level</label>
                <div className="space-y-2">
                  {ACCESS_LEVELS.map(a => (
                    <label key={a.value} className={cn(
                      "flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors",
                      form.access_level === a.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                    )}>
                      <input
                        type="radio"
                        name="access_level"
                        value={a.value}
                        checked={form.access_level === a.value}
                        onChange={() => f("access_level", a.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">{a.label}</p>
                        <p className="text-xs text-muted-foreground">{a.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Max Freeze Days */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Max Freeze Days per Term</label>
                <input
                  type="number"
                  placeholder="14"
                  value={form.max_freeze_days}
                  onChange={e => f("max_freeze_days", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description / Terms</label>
                <textarea
                  value={form.description}
                  onChange={e => f("description", e.target.value)}
                  rows={3}
                  placeholder="Terms and conditions, inclusions…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              {/* Add-ons */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Add-ons</label>
                {ADDONS.map(addon => (
                  <div key={addon.key} className={cn(
                    "rounded-md border px-3 py-2.5 space-y-2 transition-colors",
                    addons[addon.key]?.enabled ? "border-primary bg-primary/5" : "border-border"
                  )}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!addons[addon.key]?.enabled}
                        onChange={e => setAddons(prev => ({ ...prev, [addon.key]: { ...prev[addon.key], enabled: e.target.checked } }))}
                      />
                      <span className="text-sm font-medium">{addon.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{addon.unit}</span>
                    </label>
                    {addons[addon.key]?.enabled && (
                      <input
                        type="number"
                        placeholder="Price (₱)"
                        value={addons[addon.key].price}
                        onChange={e => setAddons(prev => ({ ...prev, [addon.key]: { ...prev[addon.key], price: e.target.value } }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Is Active */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => f("is_active", e.target.checked)}
                />
                <span className="text-sm font-medium">Active (visible to staff)</span>
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={closeDrawer} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? "Saving…" : drawer === "edit" ? "Save Changes" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
