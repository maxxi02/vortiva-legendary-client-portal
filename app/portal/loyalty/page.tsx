"use client"

import { useState } from "react"
import { Plus, X, Gift, Star, Search, Send, Trophy, Users, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchLoyaltyCustomers } from "@/lib/api/fnb"
import { API } from "@/lib/api"

function getCookieJson(key: string) {
  if (typeof document === "undefined") return null
  const match = document.cookie.split("; ").find(r => r.startsWith(key + "="))
  if (!match) return null
  try { return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("="))) } catch { return null }
}
const getBusinessType = () => getCookieJson("user-info")?.business_type ?? ""

type Customer = { id: string; name: string; phone?: string; email?: string; birthday?: string; total_visits: number; total_spend: number; loyalty_points: number; segment?: "vip" | "regular" | "churned" | "new"; created_at: string }
type Transaction = { id: string; type: "earn" | "redeem"; points: number; created_at: string; order_id?: string }
type GymSegmentStats = { segment_id: string; count: number }
type GymMemberBadge = { member_id: string; member_name: string; badges: string[] }

const SEGMENTS = ["all", "vip", "regular", "new", "churned"]
const SEGMENT_STYLES: Record<string, string> = {
  vip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  regular: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  new: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  churned: "bg-muted text-muted-foreground",
}
const GYM_POINTS_RULES = [{ label: "Check-in", points: 10 }, { label: "Complete a class", points: 15 }, { label: "Refer a friend", points: 200 }, { label: "Milestone: 50 visits", points: 50 }]
const GYM_REWARDS = [{ id: "free-class", label: "Free Class Pass", cost: 150 }, { id: "free-pt", label: "Free PT Session", cost: 500 }, { id: "merch", label: "Branded Merch", cost: 300 }, { id: "locker", label: "Locker Upgrade (1 month)", cost: 400 }]
const GYM_BADGES = [{ id: "first-visit", label: "First Visit", icon: "🏋️" }, { id: "10-visits", label: "10 Visits", icon: "🔟" }, { id: "50-visits", label: "50 Visits", icon: "🏆" }, { id: "1-year", label: "1 Year Member", icon: "🎖️" }, { id: "class-warrior", label: "Class Warrior", icon: "⚔️" }]
const GYM_CRM_SEGMENTS = [
  { id: "at-risk", label: "At-Risk Members", desc: "Active but no check-in in 14+ days", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  { id: "expiring-soon", label: "Expiring Soon", desc: "Membership expiring within 30 days", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { id: "high-value", label: "High-Value", desc: "Premium plan + add-ons", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
  { id: "new-members", label: "New Members", desc: "Joined within last 30 days", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label}</label>{children}</div>
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40", props.className)} />
}

export default function LoyaltyPage() {
  const qc = useQueryClient()
  const isGym = getBusinessType() === "gym"

  const { data: customers = [], isLoading } = useQuery({ queryKey: ["loyalty", "customers"], queryFn: () => fetchLoyaltyCustomers() as Promise<Customer[]> })
  const { data: gymSegmentStats = [] } = useQuery<GymSegmentStats[]>({
    queryKey: ["loyalty", "gym-segment-stats"],
    queryFn: () => fetch(`${API}/api/v1/gym/loyalty/segment-stats`, { credentials: "include" }).then(r => r.json()),
    enabled: isGym,
  })
  const { data: gymBadges = [] } = useQuery<GymMemberBadge[]>({
    queryKey: ["loyalty", "gym-badges"],
    queryFn: () => fetch(`${API}/api/v1/gym/loyalty/badges`, { credentials: "include" }).then(r => r.json()),
    enabled: isGym,
  })

  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState("all")
  const [selected, setSelected] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [pointsModal, setPointsModal] = useState<"earn" | "redeem" | null>(null)
  const [points, setPoints] = useState("")
  const [pointsError, setPointsError] = useState("")
  const [crmSegment, setCrmSegment] = useState<string | null>(null)
  const [msgChannel, setMsgChannel] = useState<"sms" | "email">("sms")
  const [msgBody, setMsgBody] = useState("")
  const [msgSchedule, setMsgSchedule] = useState("")
  const [msgSent, setMsgSent] = useState(false)
  const [birthdayEnabled, setBirthdayEnabled] = useState(false)
  const [birthdaySaving, setBirthdaySaving] = useState(false)

  const pointsMutation = useMutation({
    mutationFn: ({ customerId, type, pts }: { customerId: string; type: string; pts: number }) =>
      fetch(`${API}/api/v1/loyalty/customers/${customerId}/points`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type, points: pts }),
      }).then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? "Failed"); return r.json() as Promise<Customer> }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["loyalty", "customers"] })
      setSelected(updated); loadTransactions(updated.id); setPointsModal(null); setPoints("")
    },
    onError: (e: Error) => setPointsError(e.message),
  })

  const campaignMutation = useMutation({
    mutationFn: (payload: { segment: string; channel: string; body: string; scheduled_at: string | null }) =>
      fetch(`${API}/api/v1/gym/loyalty/campaigns`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) }),
    onSuccess: () => { setMsgSent(true); setMsgBody(""); setMsgSchedule(""); setTimeout(() => setMsgSent(false), 3000) },
  })

  async function loadTransactions(customerId: string) {
    setTxLoading(true)
    const res = await fetch(`${API}/api/v1/loyalty/customers/${customerId}/transactions`, { credentials: "include" })
    setTransactions(res.ok ? await res.json() : [])
    setTxLoading(false)
  }

  function selectCustomer(c: Customer) { setSelected(c); loadTransactions(c.id) }

  function submitPoints() {
    const n = Number(points)
    if (!n || n <= 0) { setPointsError("Enter a valid points amount."); return }
    if (pointsModal === "redeem" && selected && n > selected.loyalty_points) { setPointsError("Not enough points to redeem."); return }
    setPointsError(""); pointsMutation.mutate({ customerId: selected!.id, type: pointsModal!, pts: n })
  }

  async function toggleBirthdayAutomation(enabled: boolean) {
    setBirthdaySaving(true)
    await fetch(`${API}/api/v1/gym/loyalty/birthday-automation`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ enabled }) })
    setBirthdayEnabled(enabled); setBirthdaySaving(false)
  }

  const filtered = customers.filter(c => {
    const matchSeg = segment === "all" || c.segment === segment
    const matchSearch = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
    return matchSeg && matchSearch
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Loyalty & CRM</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email…"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {SEGMENTS.map(s => (
            <button key={s} onClick={() => setSegment(s)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                segment === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Customer", "Contact", "Visits", "Total Spend", "Points", "Segment"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-20" /></td>)}</tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No customers found.</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} onClick={() => selectCustomer(c)} className="hover:bg-muted/30 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs"><p>{c.phone || "—"}</p><p>{c.email || "—"}</p></td>
                <td className="px-4 py-3">{c.total_visits}</td>
                <td className="px-4 py-3">₱{Number(c.total_spend).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3"><span className="flex items-center gap-1 font-medium"><Star className="size-3.5 text-amber-500" />{c.loyalty_points.toLocaleString()}</span></td>
                <td className="px-4 py-3">
                  {c.segment ? <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", SEGMENT_STYLES[c.segment] ?? "bg-muted text-muted-foreground")}>{c.segment}</span> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div><p className="font-medium">{selected.name}</p><p className="text-xs text-muted-foreground">{selected.phone || selected.email || "No contact"}</p></div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "Visits", value: selected.total_visits }, { label: "Total Spend", value: `₱${Number(selected.total_spend).toLocaleString("en-PH", { minimumFractionDigits: 0 })}` }, { label: "Points", value: selected.loyalty_points.toLocaleString() }].map(s => (
                  <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                    <p className="text-lg font-semibold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="text-sm space-y-1.5">
                {selected.email && <p className="text-muted-foreground">{selected.email}</p>}
                {selected.birthday && <p className="text-muted-foreground">🎂 {new Date(selected.birthday).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}</p>}
                <p className="text-muted-foreground">Member since {new Date(selected.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short" })}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Points History</p>
                {txLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : transactions.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : (
                  <div className="space-y-1">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
                        <span className={cn("font-medium", tx.type === "earn" ? "text-green-600 dark:text-green-400" : "text-destructive")}>{tx.type === "earn" ? "+" : "−"}{tx.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => { setPointsModal("earn"); setPoints(""); setPointsError("") }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                <Plus className="size-3.5" /> Earn Points
              </button>
              <button onClick={() => { setPointsModal("redeem"); setPoints(""); setPointsError("") }} disabled={selected.loyalty_points === 0}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
                <Gift className="size-3.5" /> Redeem
              </button>
            </div>
          </div>
        </div>
      )}

      {pointsModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPointsModal(null)} />
          <div className="relative w-full max-w-sm bg-background rounded-xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold capitalize">{pointsModal} Points</h2>
              <button onClick={() => setPointsModal(null)} className="p-1 rounded hover:bg-accent transition-colors"><X className="size-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground">{selected.name} · Current balance: <strong>{selected.loyalty_points.toLocaleString()} pts</strong></p>
            <Field label="Points"><Input type="number" min={1} value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. 50" autoFocus /></Field>
            {pointsError && <p className="text-sm text-destructive">{pointsError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPointsModal(null)} className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={submitPoints} disabled={pointsMutation.isPending}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity capitalize">
                {pointsMutation.isPending ? "Saving…" : pointsModal}
              </button>
            </div>
          </div>
        </div>
      )}

      {isGym && (
        <div className="space-y-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2"><Trophy className="size-5 text-primary" /><h2 className="text-lg font-semibold">Gym Loyalty & CRM</h2></div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2"><Zap className="size-4 text-amber-500" /><p className="text-sm font-medium">Points Earning Rules</p></div>
              <div className="divide-y divide-border">
                {GYM_POINTS_RULES.map(r => (
                  <div key={r.label} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">+{r.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2"><Gift className="size-4 text-primary" /><p className="text-sm font-medium">Rewards Catalog</p></div>
              <div className="divide-y divide-border">
                {GYM_REWARDS.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium">{r.cost.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-medium">Milestone Badges</p>
            <div className="flex flex-wrap gap-2">
              {GYM_BADGES.map(b => (
                <div key={b.id} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium">
                  <span>{b.icon}</span><span>{b.label}</span>
                </div>
              ))}
            </div>
            {gymBadges.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Recent Earners</p>
                {gymBadges.slice(0, 5).map(m => (
                  <div key={m.member_id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span>{m.member_name}</span>
                    <div className="flex gap-1">{m.badges.map(bid => { const badge = GYM_BADGES.find(b => b.id === bid); return badge ? <span key={bid} title={badge.label}>{badge.icon}</span> : null })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2"><Users className="size-4 text-primary" /><p className="text-sm font-medium">CRM Segments & Bulk Messaging</p></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {GYM_CRM_SEGMENTS.map(seg => {
                const stat = gymSegmentStats.find(s => s.segment_id === seg.id)
                return (
                  <button key={seg.id} onClick={() => setCrmSegment(crmSegment === seg.id ? null : seg.id)}
                    className={cn("rounded-lg border p-4 text-left transition-colors space-y-1", crmSegment === seg.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}>
                    <p className={cn("text-sm font-medium", seg.color)}>{seg.label}</p>
                    <p className="text-xs text-muted-foreground">{seg.desc}</p>
                    {stat && <p className={cn("text-lg font-semibold mt-1", seg.color)}>{stat.count}</p>}
                  </button>
                )
              })}
            </div>
            {crmSegment && (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-sm font-medium">Compose message for: <span className="text-primary">{GYM_CRM_SEGMENTS.find(s => s.id === crmSegment)?.label}</span></p>
                <div className="flex gap-2">
                  {(["sms", "email"] as const).map(ch => (
                    <button key={ch} onClick={() => setMsgChannel(ch)}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium uppercase transition-colors", msgChannel === ch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
                      {ch}
                    </button>
                  ))}
                </div>
                <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={3}
                  placeholder={msgChannel === "sms" ? "Type your SMS message…" : "Type your email body…"}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Schedule (optional)</label>
                    <input type="datetime-local" value={msgSchedule} onChange={e => setMsgSchedule(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  </div>
                  <button onClick={() => campaignMutation.mutate({ segment: crmSegment, channel: msgChannel, body: msgBody, scheduled_at: msgSchedule || null })}
                    disabled={campaignMutation.isPending || !msgBody.trim()}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                    <Send className="size-3.5" />{campaignMutation.isPending ? "Sending…" : msgSchedule ? "Schedule" : "Send Now"}
                  </button>
                  {msgSent && <span className="text-xs text-green-600 dark:text-green-400">✓ Campaign sent!</span>}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">🎂 Birthday Automation</p>
                <p className="text-xs text-muted-foreground">Auto-send a birthday message with a free day pass reward to members on their birthday.</p>
              </div>
              <button onClick={() => toggleBirthdayAutomation(!birthdayEnabled)} disabled={birthdaySaving}
                className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-60", birthdayEnabled ? "bg-primary" : "bg-muted")}>
                <span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", birthdayEnabled ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
            {birthdayEnabled && <p className="mt-3 text-xs text-green-600 dark:text-green-400">✓ Active — members will receive a birthday message + free day pass on their birthday.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
