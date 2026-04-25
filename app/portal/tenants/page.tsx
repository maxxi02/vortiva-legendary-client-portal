"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Building2, X } from "lucide-react"
import { BUSINESS_TYPE_MAP, STATUS_STYLES } from "@/config/business-types"

function BizTypeBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const bt = BUSINESS_TYPE_MAP[value]
  if (!bt) return <span className="text-sm">{value}</span>
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      STATUS_STYLES[bt.status]
    )}>
      {bt.label}
    </span>
  )
}

type Tenant = {
  id: string
  name: string
  slug: string
  business_type?: string
  status: string
  phone?: string
  email?: string
  address?: string
  created_at: string
  owner: {
    id: string
    full_name: string
    email: string
    phone?: string
    is_active: boolean
    created_at: string
  }
  subscription?: {
    status: string
    plan_name?: string
    interval?: string
    current_period_end?: string
    cancel_at_period_end?: boolean
    canceled_at?: string
    amount?: number
    currency?: string
  }
}

type DetailTab = "info" | "billing"

function Badge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      active
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : "bg-muted text-muted-foreground"
    )}>
      {active ? "Active" : "Inactive"}
    </span>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-2 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right ml-4 truncate max-w-[60%]">{value || "—"}</span>
    </div>
  )
}

function fmt(date?: string) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Tenant | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>("info")

  useEffect(() => {
    fetch("/api/v1/tenants", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
      .then((data: Tenant[]) => { setTenants(data); setLoading(false) })
  }, [])

  function select(t: Tenant) {
    setSelected(t)
    setDetailTab("info")
  }

  const sub = selected?.subscription

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* ── List ── */}
      <div className="flex flex-col w-80 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Tenants</h1>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenants found.</p>
        ) : (
          <div className="flex-1 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {tenants.map(t => (
              <button
                key={t.id}
                onClick={() => select(t)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors",
                  selected?.id === t.id && "bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{t.name}</span>
                  <Badge active={t.status === "active"} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.owner.email}</p>
                {t.business_type && (
                  <div className="mt-0.5"><BizTypeBadge value={t.business_type} /></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail panel ── */}
      {selected ? (
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="size-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">{selected.name}</h2>
                <p className="text-xs text-muted-foreground">{selected.slug}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 border-b border-border">
            {(["info", "billing"] as DetailTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
                  detailTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* ── INFO TAB ── */}
            {detailTab === "info" && (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Business</p>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <Row label="Name" value={selected.name} />
                    <div className="flex justify-between py-2 text-sm border-b border-border/50">
                      <span className="text-muted-foreground shrink-0">Type</span>
                      <BizTypeBadge value={selected.business_type} />
                    </div>
                    <Row label="Status" value={selected.status} />
                    <Row label="Phone" value={selected.phone} />
                    <Row label="Email" value={selected.email} />
                    <Row label="Address" value={selected.address} />
                    <Row label="Registered" value={fmt(selected.created_at)} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admin Contact</p>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <Row label="Name" value={selected.owner.full_name} />
                    <Row label="Email" value={selected.owner.email} />
                    <Row label="Phone" value={selected.owner.phone} />
                    <Row label="Account" value={selected.owner.is_active ? "Active" : "Inactive"} />
                    <Row label="Joined" value={fmt(selected.owner.created_at)} />
                  </div>
                </div>
              </>
            )}

            {/* ── BILLING TAB ── */}
            {detailTab === "billing" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Subscription</p>
                {sub ? (
                  <div className="rounded-lg border border-border bg-background p-3">
                    <Row label="Plan" value={sub.plan_name} />
                    <Row
                      label="Billing cycle"
                      value={sub.interval ? sub.interval.charAt(0).toUpperCase() + sub.interval.slice(1) + "ly" : undefined}
                    />
                    <Row
                      label="Status"
                      value={
                        sub.status === "active" ? "Active"
                        : sub.status === "trialing" ? "Trial"
                        : sub.status === "canceled" ? "Canceled"
                        : sub.status
                      }
                    />
                    {sub.amount != null && (
                      <Row
                        label="Amount"
                        value={`${(sub.amount / 100).toLocaleString("en-PH", { style: "currency", currency: sub.currency?.toUpperCase() ?? "PHP" })}`}
                      />
                    )}
                    {sub.current_period_end && (
                      <Row
                        label={sub.cancel_at_period_end ? "Expires on" : "Renews on"}
                        value={fmt(sub.current_period_end)}
                      />
                    )}
                    {sub.canceled_at && (
                      <Row label="Canceled on" value={fmt(sub.canceled_at)} />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subscription data available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Select a tenant to view details</p>
        </div>
      )}
    </div>
  )
}
