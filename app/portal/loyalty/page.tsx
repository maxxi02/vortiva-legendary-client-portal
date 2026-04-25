"use client"

import { useEffect, useState } from "react"
import { Plus, X, Gift, Star, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type Customer = {
  id: string
  name: string
  phone?: string
  email?: string
  birthday?: string
  total_visits: number
  total_spend: number
  loyalty_points: number
  segment?: "vip" | "regular" | "churned" | "new"
  created_at: string
}

type Transaction = {
  id: string
  type: "earn" | "redeem"
  points: number
  created_at: string
  order_id?: string
}

const SEGMENTS = ["all", "vip", "regular", "new", "churned"]

const SEGMENT_STYLES: Record<string, string> = {
  vip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  regular: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  new: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  churned: "bg-muted text-muted-foreground",
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

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState("all")
  const [selected, setSelected] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

  // Points modal
  const [pointsModal, setPointsModal] = useState<"earn" | "redeem" | null>(null)
  const [points, setPoints] = useState("")
  const [pointsSaving, setPointsSaving] = useState(false)
  const [pointsError, setPointsError] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/v1/loyalty/customers", { credentials: "include" })
    if (res.ok) setCustomers(await res.json())
    setLoading(false)
  }

  async function loadTransactions(customerId: string) {
    setTxLoading(true)
    const res = await fetch(`/api/v1/loyalty/customers/${customerId}/transactions`, { credentials: "include" })
    if (res.ok) setTransactions(await res.json())
    else setTransactions([])
    setTxLoading(false)
  }

  useEffect(() => { load() }, [])

  function selectCustomer(c: Customer) {
    setSelected(c)
    loadTransactions(c.id)
  }

  const filtered = customers.filter(c => {
    const matchSeg = segment === "all" || c.segment === segment
    const matchSearch = !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    return matchSeg && matchSearch
  })

  async function submitPoints() {
    const n = Number(points)
    if (!n || n <= 0) { setPointsError("Enter a valid points amount."); return }
    if (pointsModal === "redeem" && selected && n > selected.loyalty_points) {
      setPointsError("Not enough points to redeem.")
      return
    }
    setPointsSaving(true)
    setPointsError("")
    const res = await fetch(`/api/v1/loyalty/customers/${selected!.id}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: pointsModal, points: n }),
    })
    if (res.ok) {
      const updated: Customer = await res.json()
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c))
      setSelected(updated)
      loadTransactions(updated.id)
      setPointsModal(null)
      setPoints("")
    } else {
      const d = await res.json().catch(() => ({}))
      setPointsError(d?.detail ?? "Failed to update points.")
    }
    setPointsSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Loyalty & CRM</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {SEGMENTS.map(s => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                segment === s
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
              {["Customer", "Contact", "Visits", "Total Spend", "Points", "Segment"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No customers found.
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <p>{c.phone || "—"}</p>
                    <p>{c.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3">{c.total_visits}</td>
                  <td className="px-4 py-3">
                    ₱{Number(c.total_spend).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Star className="size-3.5 text-amber-500" />
                      {c.loyalty_points.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.segment ? (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        SEGMENT_STYLES[c.segment] ?? "bg-muted text-muted-foreground"
                      )}>
                        {c.segment}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-medium">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.phone || selected.email || "No contact"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Visits", value: selected.total_visits },
                  { label: "Total Spend", value: `₱${Number(selected.total_spend).toLocaleString("en-PH", { minimumFractionDigits: 0 })}` },
                  { label: "Points", value: selected.loyalty_points.toLocaleString() },
                ].map(s => (
                  <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                    <p className="text-lg font-semibold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="text-sm space-y-1.5">
                {selected.email && <p className="text-muted-foreground">{selected.email}</p>}
                {selected.birthday && (
                  <p className="text-muted-foreground">
                    🎂 {new Date(selected.birthday).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}
                  </p>
                )}
                <p className="text-muted-foreground">
                  Member since {new Date(selected.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short" })}
                </p>
              </div>

              {/* Transaction history */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Points History</p>
                {txLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="space-y-1">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground text-xs">
                          {new Date(tx.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                        </span>
                        <span className={cn(
                          "font-medium",
                          tx.type === "earn" ? "text-green-600 dark:text-green-400" : "text-destructive"
                        )}>
                          {tx.type === "earn" ? "+" : "−"}{tx.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button
                onClick={() => { setPointsModal("earn"); setPoints(""); setPointsError("") }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Plus className="size-3.5" /> Earn Points
              </button>
              <button
                onClick={() => { setPointsModal("redeem"); setPoints(""); setPointsError("") }}
                disabled={selected.loyalty_points === 0}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Gift className="size-3.5" /> Redeem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points modal */}
      {pointsModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPointsModal(null)} />
          <div className="relative w-full max-w-sm bg-background rounded-xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold capitalize">{pointsModal} Points</h2>
              <button onClick={() => setPointsModal(null)} className="p-1 rounded hover:bg-accent transition-colors">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {selected.name} · Current balance: <strong>{selected.loyalty_points.toLocaleString()} pts</strong>
            </p>
            <Field label="Points">
              <Input
                type="number"
                min={1}
                value={points}
                onChange={e => setPoints(e.target.value)}
                placeholder="e.g. 50"
                autoFocus
              />
            </Field>
            {pointsError && <p className="text-sm text-destructive">{pointsError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setPointsModal(null)}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitPoints}
                disabled={pointsSaving}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity capitalize"
              >
                {pointsSaving ? "Saving…" : pointsModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
