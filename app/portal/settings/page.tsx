"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Camera, Building2, User, Lock, Bell, Palette, CreditCard, Receipt, Monitor, ScrollText } from "lucide-react"
import { API } from "@/lib/api"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"

const ME_TTL = 5 * 60 * 1000

type Me = {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: string
  is_active: boolean
  tenant?: {
    name: string
    slug: string
    status: string
    business_type?: string
    phone?: string
    address?: string
    email?: string
  }
}

type Tab = "profile" | "business" | "password" | "notifications" | "branding" | "payments" | "tax" | "devices" | "audit"

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  client_admin: "Admin",
  manager: "Manager",
  staff: "Staff",
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
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed",
        props.className
      )}
    />
  )
}

function ReadRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value || "—"}</span>
    </div>
  )
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [tab, setTab] = useState<Tab>("profile")
  const fileRef = useRef<HTMLInputElement>(null)

  // Profile form
  const [profile, setProfile] = useState({ full_name: "", phone: "", avatar_url: "" })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Business info
  const [biz, setBiz] = useState({ name: "", business_type: "", phone: "", address: "", email: "" })
  const [bizSaving, setBizSaving] = useState(false)
  const [bizMsg, setBizMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Subscription info (client_admin only)
  type SubInfo = { status: string; plan_name?: string; interval?: string; current_period_end?: string; cancel_at_period_end?: boolean; canceled_at?: string }
  const [sub, setSub] = useState<SubInfo | null>(null)

  // Password form
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Notifications
  const [notif, setNotif] = useState({ new_order: true, low_stock: true, reservation: true, staff_clock: false })
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Branding (client_admin only)
  const [brand, setBrand] = useState({ logo_url: "", primary_color: "#f97316", receipt_footer: "" })
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandMsg, setBrandMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Payments
  const [payments, setPayments] = useState({ cash: true, card: false, ewallet: false, qr: false })
  const [paymentsSaving, setPaymentsSaving] = useState(false)
  const [paymentsMsg, setPaymentsMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Tax
  const [tax, setTax] = useState({ vat_enabled: false, vat_rate: "12", service_charge_enabled: false, service_charge_rate: "10" })
  const [taxSaving, setTaxSaving] = useState(false)
  const [taxMsg, setTaxMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Devices
  type Device = { id: string; name: string; type: string; last_seen: string; is_active: boolean }
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)

  // Audit log
  type AuditEntry = { id: string; user_name: string; action: string; entity_type: string; created_at: string }
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    cachedFetch<Me>(`${API}/api/v1/auth/me`, ME_TTL, { credentials: "include" })
      .then((data: Me) => {
        if (!data) return
        setMe(data)
        setProfile({ full_name: data.full_name, phone: data.phone ?? "", avatar_url: data.avatar_url ?? "" })
        if (data.tenant) {
          setBiz({
            name: data.tenant.name ?? "",
            business_type: data.tenant.business_type ?? "",
            phone: data.tenant.phone ?? "",
            address: data.tenant.address ?? "",
            email: data.tenant.email ?? "",
          })
        }
        if (data.role === "client_admin") {
          fetch(`${API}/api/v1/billing/subscription`, { credentials: "include" })
            .then(r => r.ok ? r.json() : null)
            .then(s => s && setSub(s))
            .catch(() => {})
        }
      })
  }, [])


  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setProfile(p => ({ ...p, avatar_url: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    setProfileSaving(true)
    setProfileMsg(null)
    const res = await fetch(`${API}/api/v1/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ full_name: profile.full_name, phone: profile.phone }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMe(updated)
      setProfileMsg({ ok: true, text: "Profile updated." })
      cacheInvalidate("auth/me")
    } else {
      setProfileMsg({ ok: false, text: "Failed to update profile." })
    }
    setProfileSaving(false)
  }



  async function saveBiz() {
    setBizSaving(true)
    setBizMsg(null)
    const res = await fetch(`${API}/api/v1/tenant`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ address: biz.address }),
    })
    if (res.ok) {
      setBizMsg({ ok: true, text: "Address updated." })
    } else {
      setBizMsg({ ok: false, text: "Failed to update address." })
    }
    setBizSaving(false)
  }

  async function saveNotif() {
    setNotifSaving(true); setNotifMsg(null)
    const res = await fetch(`${API}/api/v1/settings/notifications`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(notif) })
    setNotifMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: "Failed to save." })
    setNotifSaving(false)
  }

  async function saveBrand() {
    setBrandSaving(true); setBrandMsg(null)
    const res = await fetch(`${API}/api/v1/settings/branding`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(brand) })
    setBrandMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: "Failed to save." })
    setBrandSaving(false)
  }

  async function savePayments() {
    setPaymentsSaving(true); setPaymentsMsg(null)
    const res = await fetch(`${API}/api/v1/settings/payments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payments) })
    setPaymentsMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: "Failed to save." })
    setPaymentsSaving(false)
  }

  async function saveTax() {
    setTaxSaving(true); setTaxMsg(null)
    const res = await fetch(`${API}/api/v1/settings/tax`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ vat_enabled: tax.vat_enabled, vat_rate: Number(tax.vat_rate), service_charge_enabled: tax.service_charge_enabled, service_charge_rate: Number(tax.service_charge_rate) }) })
    setTaxMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: "Failed to save." })
    setTaxSaving(false)
  }

  function loadDevices() {
    setDevicesLoading(true)
    fetch(`${API}/api/v1/settings/devices`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then(d => { setDevices(d); setDevicesLoading(false) }).catch(() => setDevicesLoading(false))
  }

  function loadAudit() {
    setAuditLoading(true)
    fetch(`${API}/api/v1/settings/audit`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then(d => { setAudit(d); setAuditLoading(false) }).catch(() => setAuditLoading(false))
  }

  // Load lazy tabs on first visit
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())
  function switchTab(t: Tab) {
    setTab(t)
    if (!loadedTabs.has(t)) {
      setLoadedTabs(prev => new Set(prev).add(t))
      if (t === "devices") loadDevices()
      if (t === "audit") loadAudit()
    }
  }

  async function changePassword() {
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: "Passwords do not match." }); return }
    if (pw.next.length < 8) { setPwMsg({ ok: false, text: "Password must be at least 8 characters." }); return }
    setPwSaving(true)
    setPwMsg(null)
    const res = await fetch(`${API}/api/v1/auth/me/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ current_password: pw.current, new_password: pw.next }),
    })
    if (res.ok || res.status === 204) {
      setPwMsg({ ok: true, text: "Password changed successfully." })
      setPw({ current: "", next: "", confirm: "" })
    } else {
      const d = await res.json().catch(() => ({}))
      setPwMsg({ ok: false, text: d?.detail ?? "Failed to change password." })
    }
    setPwSaving(false)
  }

  const isAdmin = me?.role === "client_admin"

  const tabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "profile",       label: "Profile",       icon: <User className="size-3.5" /> },
    { id: "business",      label: "Business",      icon: <Building2 className="size-3.5" /> },
    { id: "password",      label: "Password",      icon: <Lock className="size-3.5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="size-3.5" /> },
    { id: "branding",      label: "Branding",      icon: <Palette className="size-3.5" />, adminOnly: true },
    { id: "payments",      label: "Payments",      icon: <CreditCard className="size-3.5" />, adminOnly: true },
    { id: "tax",           label: "Tax",           icon: <Receipt className="size-3.5" />, adminOnly: true },
    { id: "devices",       label: "Devices",       icon: <Monitor className="size-3.5" />, adminOnly: true },
    { id: "audit",         label: "Audit Log",     icon: <ScrollText className="size-3.5" />, adminOnly: true },
  ].filter(t => !t.adminOnly || isAdmin) as { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] as { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[]

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === "profile" && (
        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="size-16 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="size-full object-cover" />
                  : <span className="text-2xl font-semibold text-muted-foreground">
                      {profile.full_name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:opacity-90 transition-opacity"
              >
                <Camera className="size-3" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-medium text-sm">{me?.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[me?.role ?? ""] ?? me?.role}</p>
            </div>
          </div>

          {/* Read-only */}
          <div className="rounded-lg border border-border bg-card p-4">
            <ReadRow label="Email" value={me?.email} />
            <ReadRow label="Role" value={ROLE_LABELS[me?.role ?? ""] ?? me?.role} />
            <ReadRow label="Account status" value={me?.is_active ? "Active" : "Inactive"} />
          </div>

          {/* Editable fields */}
          <Field label="Full name">
            <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
          </Field>
          <Field label="Phone number">
            <Input type="tel" placeholder="+63 9XX XXX XXXX" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </Field>

          {profileMsg && (
            <p className={cn("text-sm", profileMsg.ok ? "text-green-600 dark:text-green-400" : "text-destructive")}>
              {profileMsg.text}
            </p>
          )}
          <button
            onClick={saveProfile}
            disabled={profileSaving || !profile.full_name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {profileSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {/* ── BUSINESS TAB ── */}
      {tab === "business" && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Business Info</p>
            <ReadRow label="Business name" value={biz.name} />
            <ReadRow label="Business type" value={biz.business_type} />
            <ReadRow label="Phone" value={biz.phone} />
            <ReadRow label="Email" value={biz.email} />
            {me?.role === "client_admin" ? null : <ReadRow label="Address" value={biz.address} />}
          </div>

          {me?.role === "client_admin" && (
            <>
              <Field label="Address">
                <Input
                  value={biz.address}
                  onChange={e => setBiz(b => ({ ...b, address: e.target.value }))}
                  placeholder="Enter business address"
                />
              </Field>
              {bizMsg && (
                <p className={cn("text-sm", bizMsg.ok ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                  {bizMsg.text}
                </p>
              )}
              <button
                onClick={saveBiz}
                disabled={bizSaving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {bizSaving ? "Saving…" : "Save address"}
              </button>
            </>
          )}

          {me?.role !== "client_admin" && (
            <p className="text-xs text-muted-foreground">
              To update business information, please contact your administrator.
            </p>
          )}

          {/* Plan info — client_admin only */}
          {sub && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Plan</p>
              <ReadRow label="Plan" value={sub.plan_name ?? "—"} />
              <ReadRow label="Billing cycle" value={sub.interval ? sub.interval.charAt(0).toUpperCase() + sub.interval.slice(1) + "ly" : "—"} />
              <ReadRow
                label="Status"
                value={sub.status === "active" ? "Active" : sub.status === "trialing" ? "Trial" : sub.status === "canceled" ? "Canceled" : sub.status}
              />
              {sub.current_period_end && (
                <ReadRow
                  label={sub.cancel_at_period_end ? "Expires on" : "Renews on"}
                  value={new Date(sub.current_period_end).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                />
              )}
              {sub.canceled_at && (
                <ReadRow
                  label="Canceled on"
                  value={new Date(sub.canceled_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PASSWORD TAB ── */}
      {tab === "password" && (
        <div className="space-y-4">
          {[
            { label: "Current password", key: "current" },
            { label: "New password", key: "next" },
            { label: "Confirm new password", key: "confirm" },
          ].map(({ label, key }) => (
            <Field key={key} label={label}>
              <Input
                type="password"
                value={pw[key as keyof typeof pw]}
                onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
              />
            </Field>
          ))}

          {pwMsg && (
            <p className={cn("text-sm", pwMsg.ok ? "text-green-600 dark:text-green-400" : "text-destructive")}>
              {pwMsg.text}
            </p>
          )}
          <button
            onClick={changePassword}
            disabled={pwSaving || !pw.current || !pw.next || !pw.confirm}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {pwSaving ? "Changing…" : "Change password"}
          </button>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === "notifications" && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            {([
              { key: "new_order",   label: "New order received" },
              { key: "low_stock",   label: "Low stock alert" },
              { key: "reservation", label: "New reservation" },
              { key: "staff_clock", label: "Staff clock-in / clock-out" },
            ] as { key: keyof typeof notif; label: string }[]).map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">{label}</span>
                <button role="switch" aria-checked={notif[key]} onClick={() => setNotif(n => ({ ...n, [key]: !n[key] }))}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors", notif[key] ? "bg-primary" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform", notif[key] ? "translate-x-4" : "translate-x-0")} />
                </button>
              </label>
            ))}
          </div>
          {notifMsg && <p className={cn("text-sm", notifMsg.ok ? "text-green-600 dark:text-green-400" : "text-destructive")}>{notifMsg.text}</p>}
          <button onClick={saveNotif} disabled={notifSaving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
            {notifSaving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      )}

      {/* ── BRANDING TAB ── */}
      {tab === "branding" && (
        <div className="space-y-5">
          <Field label="Logo URL">
            <Input value={brand.logo_url} onChange={e => setBrand(b => ({ ...b, logo_url: e.target.value }))} placeholder="https://…" />
          </Field>
          <Field label="Primary color">
            <div className="flex items-center gap-3">
              <input type="color" value={brand.primary_color} onChange={e => setBrand(b => ({ ...b, primary_color: e.target.value }))} className="h-9 w-14 rounded border border-border cursor-pointer bg-background" />
              <Input value={brand.primary_color} onChange={e => setBrand(b => ({ ...b, primary_color: e.target.value }))} className="font-mono" />
            </div>
          </Field>
          <Field label="Receipt footer text">
            <textarea value={brand.receipt_footer} onChange={e => setBrand(b => ({ ...b, receipt_footer: e.target.value }))} rows={3}
              placeholder="Thank you for dining with us!"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
          </Field>
          {brandMsg && <p className={cn("text-sm", brandMsg.ok ? "text-green-600 dark:text-green-400" : "text-destructive")}>{brandMsg.text}</p>}
          <button onClick={saveBrand} disabled={brandSaving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
            {brandSaving ? "Saving…" : "Save branding"}
          </button>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === "payments" && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            {([
              { key: "cash",    label: "Cash" },
              { key: "card",    label: "Credit / Debit Card" },
              { key: "ewallet", label: "E-Wallet (GCash, Maya)" },
              { key: "qr",      label: "QR Code Payment" },
            ] as { key: keyof typeof payments; label: string }[]).map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">{label}</span>
                <button role="switch" aria-checked={payments[key]} onClick={() => setPayments(p => ({ ...p, [key]: !p[key] }))}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors", payments[key] ? "bg-primary" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform", payments[key] ? "translate-x-4" : "translate-x-0")} />
                </button>
              </label>
            ))}
          </div>
          {paymentsMsg && <p className={cn("text-sm", paymentsMsg.ok ? "text-green-600 dark:text-green-400" : "text-destructive")}>{paymentsMsg.text}</p>}
          <button onClick={savePayments} disabled={paymentsSaving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
            {paymentsSaving ? "Saving…" : "Save payment methods"}
          </button>
        </div>
      )}

      {/* ── TAX TAB ── */}
      {tab === "tax" && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Enable VAT</span>
              <button role="switch" aria-checked={tax.vat_enabled} onClick={() => setTax(t => ({ ...t, vat_enabled: !t.vat_enabled }))}
                className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors", tax.vat_enabled ? "bg-primary" : "bg-muted")}>
                <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform", tax.vat_enabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </label>
            {tax.vat_enabled && (
              <Field label="VAT rate (%)">
                <Input type="number" min="0" max="100" value={tax.vat_rate} onChange={e => setTax(t => ({ ...t, vat_rate: e.target.value }))} />
              </Field>
            )}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Enable service charge</span>
              <button role="switch" aria-checked={tax.service_charge_enabled} onClick={() => setTax(t => ({ ...t, service_charge_enabled: !t.service_charge_enabled }))}
                className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors", tax.service_charge_enabled ? "bg-primary" : "bg-muted")}>
                <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform", tax.service_charge_enabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </label>
            {tax.service_charge_enabled && (
              <Field label="Service charge rate (%)">
                <Input type="number" min="0" max="100" value={tax.service_charge_rate} onChange={e => setTax(t => ({ ...t, service_charge_rate: e.target.value }))} />
              </Field>
            )}
          </div>
          {taxMsg && <p className={cn("text-sm", taxMsg.ok ? "text-green-600 dark:text-green-400" : "text-destructive")}>{taxMsg.text}</p>}
          <button onClick={saveTax} disabled={taxSaving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
            {taxSaving ? "Saving…" : "Save tax settings"}
          </button>
        </div>
      )}

      {/* ── DEVICES TAB ── */}
      {tab === "devices" && (
        <div className="space-y-4">
          {devicesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No devices registered.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["Name","Type","Last seen","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {devices.map(d => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{d.type}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(d.last_seen).toLocaleString("en-PH")}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", d.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                          {d.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {tab === "audit" && (
        <div className="space-y-4">
          {auditLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries found.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["User","Action","Entity","Time"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {audit.map(e => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 font-medium">{e.user_name}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{e.action.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{e.entity_type.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.created_at).toLocaleString("en-PH")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
