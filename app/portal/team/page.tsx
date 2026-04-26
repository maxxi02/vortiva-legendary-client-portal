"use client"

import { useState } from "react"
import { Plus, UserCheck, UserX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchStaff } from "@/lib/api/fnb"
import { API } from "@/lib/api"

type Staff = {
  id: string
  full_name: string
  email: string
  staff_role: string
  is_active: boolean
}

const ROLES = ["manager", "cashier", "barista", "inventory_clerk"]
const ROLE_LABELS: Record<string, string> = {
  manager: "Manager", cashier: "Cashier", barista: "Barista", inventory_clerk: "Inventory Clerk",
}

const patch = (url: string, body: unknown) =>
  fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json())

export default function TeamPage() {
  const qc = useQueryClient()
  const { data: staff = [], isLoading } = useQuery({ queryKey: ["staff"], queryFn: () => fetchStaff() as Promise<Staff[]> })
  const invalidate = () => qc.invalidateQueries({ queryKey: ["staff"] })

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ full_name: "", email: "", password: "", staff_role: "cashier" })
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const inviteMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch(`${API}/api/v1/staff/invite`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data),
      }).then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? "Failed"); return r.json() }),
    onSuccess: () => { invalidate(); setAdding(false); setForm({ full_name: "", email: "", password: "", staff_role: "cashier" }) },
    onError: (e: Error) => setError(e.message),
  })

  async function toggleActive(s: Staff) {
    setUpdatingId(s.id)
    await patch(`${API}/api/v1/staff/${s.id}`, { is_active: !s.is_active })
    invalidate(); setUpdatingId(null)
  }

  async function changeRole(s: Staff, role: string) {
    setUpdatingId(s.id)
    await patch(`${API}/api/v1/staff/${s.id}`, { staff_role: role })
    invalidate(); setUpdatingId(null)
  }

  function inviteStaff() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) { setError("All fields are required."); return }
    setError(""); inviteMutation.mutate(form)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your Team</h1>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Name", "Email", "Role", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-24" /></td>)}</tr>
              ))
            ) : staff.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No staff members yet.</td></tr>
            ) : staff.map(s => (
              <tr key={s.id} className={cn("transition-colors", !s.is_active && "opacity-50")}>
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{s.email}</td>
                <td className="px-4 py-3">
                  <select value={s.staff_role} onChange={e => changeRole(s, e.target.value)} disabled={updatingId === s.id}
                    className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50">
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    s.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                    {s.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(s)} disabled={updatingId === s.id} className="text-xs text-primary hover:underline disabled:opacity-50">
                    {s.is_active ? "Deactivate" : "Activate"}
                  </button>
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
            <div className="px-5 py-4 border-b border-border font-medium">Add Staff Member</div>
            <div className="flex-1 px-5 py-4 space-y-4">
              {[
                { label: "Full Name *", key: "full_name", type: "text", placeholder: "e.g. Juan dela Cruz" },
                { label: "Email *", key: "email", type: "email", placeholder: "staff@yourbusiness.com" },
                { label: "Password *", key: "password", type: "password", placeholder: "Temporary password" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select value={form.staff_role} onChange={e => setForm(f => ({ ...f, staff_role: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => { setAdding(false); setError("") }} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={inviteStaff} disabled={inviteMutation.isPending}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {inviteMutation.isPending ? "Adding…" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
