"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, QrCode } from "lucide-react"
import { API } from "@/lib/api"

type Profile = {
  id: string
  name: string
  email: string
  phone: string
  date_of_birth: string
  emergency_contact: string
  qr_code: string
}

export default function MemberProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  // profile form
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [emergency, setEmergency] = useState("")

  // password form
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [pwMsg, setPwMsg] = useState("")
  const [changingPw, setChangingPw] = useState(false)

  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/v1/member/profile`, { credentials: "include" })
      .then(r => r.json())
      .then((p: Profile) => {
        setProfile(p)
        setName(p.name)
        setPhone(p.phone)
        setDob(p.date_of_birth)
        setEmergency(p.emergency_contact)
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg("")
    try {
      const r = await fetch(`${API}/api/v1/member/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, date_of_birth: dob, emergency_contact: emergency }),
      })
      setSaveMsg(r.ok ? "Saved!" : "Failed to save.")
    } catch {
      setSaveMsg("Failed to save.")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(""), 3000)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwMsg("Passwords don't match."); return }
    setChangingPw(true)
    setPwMsg("")
    try {
      const r = await fetch(`${API}/api/v1/member/profile/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      })
      if (r.ok) {
        setPwMsg("Password changed!")
        setCurrentPw(""); setNewPw(""); setConfirmPw("")
      } else {
        const d = await r.json().catch(() => ({}))
        setPwMsg(d.detail ?? "Failed to change password.")
      }
    } catch {
      setPwMsg("Failed to change password.")
    } finally {
      setChangingPw(false)
      setTimeout(() => setPwMsg(""), 4000)
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted" />)}
    </div>
  )
  if (!profile) return <p className="text-center text-muted-foreground py-12">Could not load profile.</p>

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1"

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {/* QR Code */}
      <div className="rounded-xl border border-border bg-card p-4">
        <button
          onClick={() => setShowQr(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-primary"
        >
          <QrCode className="h-4 w-4" />
          {showQr ? "Hide" : "Show"} Check-In QR Code
        </button>
        {showQr && profile.qr_code && (
          <div className="mt-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.qr_code} alt="Check-in QR code" className="h-48 w-48 rounded-lg" />
          </div>
        )}
      </div>

      {/* Profile form */}
      <form onSubmit={saveProfile} className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-semibold">Personal Info</h2>

        <div>
          <label className={labelCls}>Full Name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={`${inputCls} opacity-60 cursor-not-allowed`} value={profile.email} readOnly />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Date of Birth</label>
          <input type="date" className={inputCls} value={dob} onChange={e => setDob(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Emergency Contact</label>
          <input className={inputCls} value={emergency} onChange={e => setEmergency(e.target.value)} placeholder="Name · Phone" />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saveMsg && <p className="text-sm text-muted-foreground">{saveMsg}</p>}
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={changePassword} className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-semibold">Change Password</h2>

        {(["Current Password", "New Password", "Confirm New Password"] as const).map((label, i) => {
          const vals = [currentPw, newPw, confirmPw]
          const setters = [setCurrentPw, setNewPw, setConfirmPw]
          return (
            <div key={label}>
              <label className={labelCls}>{label}</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className={`${inputCls} pr-10`}
                  value={vals[i]}
                  onChange={e => setters[i](e.target.value)}
                  required
                />
                {i === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={changingPw}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {changingPw ? "Changing…" : "Change Password"}
          </button>
          {pwMsg && <p className="text-sm text-muted-foreground">{pwMsg}</p>}
        </div>
      </form>
    </div>
  )
}
