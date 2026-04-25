"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const urgent = daysLeft <= 3

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${
        urgent
          ? "bg-destructive/10 text-destructive border-b border-destructive/20"
          : "bg-amber-50 text-amber-800 border-b border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
      }`}
    >
      <span>
        {daysLeft === 0
          ? "Your trial expires today."
          : `Your trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`}{" "}
        <a
          href="/portal/settings?tab=billing"
          className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Upgrade now →
        </a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss trial banner"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
