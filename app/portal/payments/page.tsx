"use client"

import { useEffect, useState } from "react"
import { Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const TTL = 2 * 60 * 1000

type Payment = {
  id: string
  member_id: string
  member_name: string
  amount: number
  description: string
  method: "cash" | "card" | "gcash" | "maya" | "other"
  status: "paid" | "pending" | "refunded"
  paid_at: string
}

const METHODS = ["cash", "card", "gcash", "maya", "other"] as const
const STATUS_STYLES: Record<string, string> = {
  paid:     "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  refunded: "bg-muted text-muted-foreground",
}

const EMPTY_FORM = { member_id: "", description: "", amount: "", method: "cash" as typeof METHODS[number] }

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    const data = await cachedFetch<Payment[]>(`${API}/api/v1/gym/payments`, TTL, { credentials: "include" }).catch(() => [])
    setPayments(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    return !q || p.member_name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  })

  const totalToday = payments
    .filter(p => p.status === "paid" && p.paid_at.startsWith(new Date().toISOString().slice(0, 10)))
    .reduce((s, p) => s + p.amount, 0)

  async function addPayment() {
    if (!form.member_id.trim()) { setError("Member ID is required."); return }
    if (!form.description.trim()) { setError("Description is required."); return }
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { setError("Enter a valid amount."); return }
    setError("")
    setSaving(true)
    const res = await fetch(`${API}/api/v1/gym/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ member_id: form.member_id, description: form.description, amount, method: form.method }),
    })
    if (res.ok) {
      const created = await res.json()
      setPayments(prev => [created, ...prev])
      setAdding(false)
      setForm(EMPTY_FORM)
      cacheInvalidate("gym/payments")
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d?.detail ?? "Failed to record payment.")
    }
    setSaving(false)
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {/* Today's total */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Revenue</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">
          ₱{totalToday.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search member or description…"
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Member", "Description", "Amount", "Method", "Status", "Date"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-20" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No payments found.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{p.member_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.description}</td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  ₱{p.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{p.method}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[p.status])}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                  {new Date(p.paid_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
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
              <p className="font-medium">Record Payment</p>
              <button onClick={() => { setAdding(false); setError("") }} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Member ID *</label>
                <input value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))} className={inputCls} placeholder="Paste or scan member ID" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="e.g. Monthly membership" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount (₱) *</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="flex flex-wrap gap-2">
                  {METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, method: m }))}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                        form.method === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => { setAdding(false); setError("") }} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={addPayment} disabled={saving} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saving ? "Saving…" : "Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
