"use client"

import { useState } from "react"
import { X, Clock } from "lucide-react"

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const urgent = daysLeft <= 3

  return (
    <div
      className={[
        "flex items-center justify-between gap-4 px-4 py-2.5 text-sm border-b",
        urgent
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-primary/8 text-primary border-primary/15",
      ].join(" ")}
    >
      <span className="flex items-center gap-2">
        <Clock className="size-3.5 shrink-0 opacity-70" />
        {daysLeft === 0
          ? "Your trial expires today."
          : `Your trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`}{" "}
        <a
          href="/portal/settings?tab=billing"
          className="font-semibold underline underline-offset-2 hover:opacity-75 transition-opacity"
        >
          Upgrade now →
        </a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss trial banner"
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
