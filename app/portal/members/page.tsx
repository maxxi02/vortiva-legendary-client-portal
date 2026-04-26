"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, X, MoreHorizontal } from "lucide-react"
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
  membership_plan?: string
  membership_plan_id?: string
  status: "active" | "frozen" | "expired"
  join_date: string
  expiry_date?: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_number?: string
  photo_url?: string
}

type Plan = { id: string; name: string }

const STATUS_STYLES: Record<string, string> = {
  active:  "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  frozen:  "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
}

const STATUSES = ["all", "active", "frozen", "expired"]

const EMPTY_FORM = {
  first_name: "", last_name: "", email: "", phone: "",
  date_of_birth: "", emergency_contact_name: "", emergency_contact_number: "",
  membership_plan_id: "", start_date: "",
}

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [menuId, setMenuId] = useState<string | null>(null)

  async function load() {
    const [mData, pData] = await Promise.all([
      cachedFetch<Member[]>(`${API}/api/v1/gym/members`, TTL, { credentials: "include" }).catch(() => []),
      cachedFetch<Plan[]>(`${API}/api/v1/gym/membership-plans`, TTL, { credentials: "include" }).catch(() => []),
    ])
    setMembers(Array.isArray(mData) ? mData : [])
    setPlans(Array.isArray(pData) ? pData : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Close action menu on outside click
  useEffect(() => {
    if (!menuId) return
    const handler = () => setMenuId(null)
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [menuId])

  const filtered = members.filter(m => {
    const matchStatus = statusFilter === "all" || m.status === statusFilter
    const q = search.toLowerCase()
    const full = `${m.first_name} ${m.last_name}`.toLowerCase()
    const matchSearch = !q || full.includes(q) || (m.membership_plan ?? "").toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  async function addMember() {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError("First and last name are required."); return }
    if (!form.email.trim()) { setError("Email is required."); return }
    setError("")
    setSaving(true)
    const res = await fetch(`${API}/api/v1/gym/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        membership_plan_id: form.membership_plan_id || null,
        date_of_birth: form.date_of_birth || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_number: form.emergency_contact_number || null,
        start_date: form.start_date || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setMembers(prev => [created, ...prev])
      setAdding(false)
      setForm(EMPTY_FORM)
      cacheInvalidate("gym/members")
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to add member.")
    }
    setSaving(false)
  }

  async function toggleFreeze(m: Member) {
    const newStatus = m.status === "frozen" ? "active" : "frozen"
    const res = await fetch(`${API}/api/v1/gym/members/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMembers(prev => prev.map(x => x.id === m.id ? updated : x))
      cacheInvalidate("gym/members")
    }
  }

  async function deleteMember(id: string) {
    if (!confirm("Delete this member? This cannot be undone.")) return
    const res = await fetch(`${API}/api/v1/gym/members/${id}`, { method: "DELETE", credentials: "include" })
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== id))
      cacheInvalidate("gym/members")
    }
  }

  const field = (label: string, key: keyof typeof EMPTY_FORM, type = "text", placeholder = "") => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or plan…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Full Name", "Membership Plan", "Status", "Join Date", "Expiry Date", "Contact", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-20" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No members found.</td>
              </tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/portal/members/${m.id}`)}
                      className="font-medium hover:underline text-left"
                    >
                      {m.first_name} {m.last_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.membership_plan ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[m.status])}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(m.join_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.phone ?? "—"}</td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuId(menuId === m.id ? null : m.id) }}
                      className="p-1.5 rounded-md hover:bg-accent transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuId === m.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute right-4 top-10 z-20 w-44 rounded-md border border-border bg-background shadow-lg py-1 text-sm"
                      >
                        <button onClick={() => { router.push(`/portal/members/${m.id}`); setMenuId(null) }} className="w-full px-3 py-2 text-left hover:bg-accent transition-colors">View Profile</button>
                        <button onClick={() => { router.push(`/portal/members/${m.id}?edit=1`); setMenuId(null) }} className="w-full px-3 py-2 text-left hover:bg-accent transition-colors">Edit</button>
                        <button onClick={() => { toggleFreeze(m); setMenuId(null) }} className="w-full px-3 py-2 text-left hover:bg-accent transition-colors">
                          {m.status === "frozen" ? "Unfreeze" : "Freeze"}
                        </button>
                        <button onClick={() => { router.push(`/portal/members/${m.id}?renew=1`); setMenuId(null) }} className="w-full px-3 py-2 text-left hover:bg-accent transition-colors">Renew</button>
                        <button onClick={() => { deleteMember(m.id); setMenuId(null) }} className="w-full px-3 py-2 text-left text-destructive hover:bg-accent transition-colors">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add member drawer */}
      {adding && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setAdding(false); setError("") }} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-medium">Add Member</p>
              <button onClick={() => { setAdding(false); setError("") }} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">First Name *</label>
                  <input type="text" placeholder="Juan" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Last Name *</label>
                  <input type="text" placeholder="dela Cruz" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              {field("Email *", "email", "email", "member@email.com")}
              {field("Phone Number", "phone", "tel", "+63 9XX XXX XXXX")}
              {field("Date of Birth", "date_of_birth", "date")}
              {field("Emergency Contact Name", "emergency_contact_name", "text", "Full name")}
              {field("Emergency Contact Number", "emergency_contact_number", "tel", "+63 9XX XXX XXXX")}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Membership Plan</label>
                <select
                  value={form.membership_plan_id}
                  onChange={e => setForm(f => ({ ...f, membership_plan_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">— Select plan —</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {field("Start Date", "start_date", "date")}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Photo</label>
                <input type="file" accept="image/*" className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent" />
                <p className="text-xs text-muted-foreground">Optional. Max 5MB.</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => { setAdding(false); setError("") }} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={addMember}
                disabled={saving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? "Saving…" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
