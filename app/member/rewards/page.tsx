"use client"

import { useEffect, useState } from "react"
import { Star, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"

type Badge = {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
}

type Reward = {
  id: string
  name: string
  description: string
  points_cost: number
  available: boolean
}

type RewardsData = {
  points: number
  badges: Badge[]
  rewards: Reward[]
}

export default function MemberRewardsPage() {
  const [data, setData] = useState<RewardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch(`${API}/api/v1/member/rewards`, { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  async function redeem(reward: Reward) {
    if (!data || data.points < reward.points_cost) return
    setRedeeming(reward.id)
    // optimistic deduct
    setData(prev => prev ? { ...prev, points: prev.points - reward.points_cost } : prev)
    try {
      const r = await fetch(`${API}/api/v1/member/rewards/${reward.id}/redeem`, {
        method: "POST",
        credentials: "include",
      })
      if (!r.ok) throw new Error()
      setMsg(`Redeemed "${reward.name}"!`)
    } catch {
      // revert
      setData(prev => prev ? { ...prev, points: prev.points + reward.points_cost } : prev)
      setMsg("Redemption failed.")
    } finally {
      setRedeeming(null)
      setTimeout(() => setMsg(""), 3000)
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}
    </div>
  )
  if (!data) return <p className="text-center text-muted-foreground py-12">Could not load rewards.</p>

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Rewards</h1>

      {/* Points hero */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 p-5 text-white space-y-1">
        <p className="text-sm opacity-80 uppercase tracking-wide">Your Points</p>
        <p className="text-4xl font-bold tabular-nums">{data.points.toLocaleString()}</p>
        <p className="text-sm opacity-75">Use points to redeem rewards below</p>
      </div>

      {msg && (
        <p className="text-center text-sm font-medium text-primary">{msg}</p>
      )}

      {/* Redeemable rewards */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rewards</h2>
        {data.rewards.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">No rewards available.</p>
        )}
        {data.rewards.map(reward => {
          const canAfford = data.points >= reward.points_cost
          return (
            <div key={reward.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{reward.name}</p>
                <p className="text-xs text-muted-foreground">{reward.description}</p>
                <p className="text-xs font-semibold text-amber-600 mt-0.5">{reward.points_cost.toLocaleString()} pts</p>
              </div>
              <button
                disabled={!reward.available || !canAfford || redeeming === reward.id}
                onClick={() => redeem(reward)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  !reward.available || !canAfford
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                )}
              >
                {redeeming === reward.id ? "…" : "Redeem"}
              </button>
            </div>
          )
        })}
      </section>

      {/* Badges */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Badges</h2>
        {data.badges.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">No badges yet.</p>
        )}
        <div className="grid grid-cols-3 gap-3">
          {data.badges.map(badge => (
            <div
              key={badge.id}
              className={cn(
                "rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1.5 text-center",
                !badge.earned && "opacity-40"
              )}
            >
              <div className="relative">
                <span className="text-3xl">{badge.icon}</span>
                {!badge.earned && (
                  <Lock className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs font-medium leading-tight">{badge.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
