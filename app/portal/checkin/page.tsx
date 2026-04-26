"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Search, ScanLine, CheckCircle2, XCircle, Snowflake, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { cachedFetch, cacheInvalidate } from "@/lib/cache"
import { API } from "@/lib/api"

type MemberStatus = "active" | "expired" | "frozen"

type MemberResult = {
  id: string
  name: string
  photo_url: string | null
  plan: string
  status: MemberStatus
  expiry_date: string
  membership_id: string
}

type CheckInLog = {
  id: string
  member_id: string
  member_name: string
  plan: string
  checked_in_at: string
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
}

export default function CheckInPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MemberResult[]>([])
  const [searching, setSearching] = useState(false)
  const [checkedIn, setCheckedIn] = useState<string | null>(null)   // member id just checked in
  const [actioning, setActioning] = useState<string | null>(null)
  const [log, setLog] = useState<CheckInLog[]>([])
  const [scanning, setScanning] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus search on mount
  useEffect(() => { searchRef.current?.focus() }, [])

  const loadLog = useCallback(async () => {
    const data = await cachedFetch<CheckInLog[]>(
      `${API}/api/v1/gym/checkins/today`,
      30 * 1000,
      { credentials: "include" }
    )
    setLog(data ?? [])
  }, [])

  useEffect(() => { loadLog() }, [loadLog])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `${API}/api/v1/gym/members/search?q=${encodeURIComponent(query.trim())}`,
          { credentials: "include" }
        )
        if (res.ok) setResults(await res.json())
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function checkIn(member: MemberResult) {
    setActioning(member.id)
    const res = await fetch(`${API}/api/v1/gym/checkins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ member_id: member.id, membership_id: member.membership_id }),
    })
    if (res.ok) {
      setCheckedIn(member.id)
      cacheInvalidate("checkin-log-today")
      await loadLog()
      setTimeout(() => {
        setCheckedIn(null)
        setQuery("")
        setResults([])
        searchRef.current?.focus()
      }, 2000)
    }
    setActioning(null)
  }

  async function renewMembership(memberId: string) {
    window.location.href = `/portal/memberships/renewals?member=${memberId}`
  }

  async function unfreeze(member: MemberResult) {
    setActioning(member.id)
    const res = await fetch(`${API}/api/v1/gym/memberships/${member.membership_id}/unfreeze`, {
      method: "POST",
      credentials: "include",
    })
    if (res.ok) {
      setResults(prev => prev.map(m =>
        m.id === member.id ? { ...m, status: "active" } : m
      ))
    }
    setActioning(null)
  }

  // QR scan
  async function startScan() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      setScanning(true)
      // Give React a tick to mount the video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 50)
    } catch {
      alert("Camera access denied or unavailable.")
    }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  // Poll video frames for QR using BarcodeDetector if available
  useEffect(() => {
    if (!scanning) return
    // @ts-expect-error BarcodeDetector is not in TS lib yet
    if (typeof BarcodeDetector === "undefined") return
    // @ts-expect-error
    const detector = new BarcodeDetector({ formats: ["qr_code"] })
    let active = true
    async function tick() {
      if (!active || !videoRef.current) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const raw = barcodes[0].rawValue as string
          stopScan()
          setQuery(raw)
        }
      } catch { /* ignore */ }
      if (active) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => { active = false }
  }, [scanning])

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Member Check-In</h1>
          <p className="text-sm text-muted-foreground">Search by name, phone, or card number</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-2xl font-bold tabular-nums">{log.length}</p>
          <p className="text-xs text-muted-foreground">check-ins</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, phone, or card number…"
            className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searching && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
        <button
          onClick={scanning ? stopScan : startScan}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
            scanning
              ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "border-border bg-card hover:bg-muted"
          )}
        >
          <ScanLine className="h-5 w-5" />
          {scanning ? "Stop" : "Scan QR"}
        </button>
      </div>

      {/* QR camera */}
      {scanning && (
        <div className="rounded-lg overflow-hidden border border-border aspect-video bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        </div>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(member => (
            <div
              key={member.id}
              className={cn(
                "rounded-lg border-2 bg-card p-4 flex items-center gap-4 transition-all",
                checkedIn === member.id
                  ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                  : member.status === "expired"
                  ? "border-red-200"
                  : member.status === "frozen"
                  ? "border-blue-200"
                  : "border-border"
              )}
            >
              {/* Photo */}
              <div className="shrink-0 h-14 w-14 rounded-full bg-muted overflow-hidden">
                {member.photo_url
                  ? <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-xl font-semibold text-muted-foreground">
                      {member.name[0]}
                    </div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.plan}</p>
                <p className="text-xs text-muted-foreground">Expires {fmtDate(member.expiry_date)}</p>
              </div>

              {/* Action */}
              <div className="shrink-0">
                {checkedIn === member.id ? (
                  <div className="flex items-center gap-1.5 text-green-600 font-semibold text-sm">
                    <CheckCircle2 className="h-5 w-5" /> Checked In!
                  </div>
                ) : member.status === "active" ? (
                  <button
                    onClick={() => checkIn(member)}
                    disabled={actioning === member.id}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    {actioning === member.id ? "…" : "Check In"}
                  </button>
                ) : member.status === "expired" ? (
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1 text-red-600 text-xs font-medium justify-end">
                      <XCircle className="h-4 w-4" /> Expired
                    </div>
                    <button
                      onClick={() => renewMembership(member.id)}
                      className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Renew Now
                    </button>
                  </div>
                ) : (
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1 text-blue-600 text-xs font-medium justify-end">
                      <Snowflake className="h-4 w-4" /> Frozen
                    </div>
                    <button
                      onClick={() => unfreeze(member)}
                      disabled={actioning === member.id}
                      className="rounded-md border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 transition-colors"
                    >
                      {actioning === member.id ? "…" : "Unfreeze"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's check-in log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today's Log</h2>
          <button onClick={loadLog} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Refresh
          </button>
        </div>

        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No check-ins yet today.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Member</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Plan</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Time In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {log.map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{entry.member_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{entry.plan}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmtTime(entry.checked_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
