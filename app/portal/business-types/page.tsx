"use client"

import {
  UtensilsCrossed, ShoppingBag, Sparkles, Cake, Dumbbell, Stethoscope,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BUSINESS_TYPES, STATUS_LABELS, STATUS_STYLES } from "@/config/business-types"

const ICON_MAP: Record<string, React.ElementType> = {
  UtensilsCrossed, ShoppingBag, Sparkles, Cake, Dumbbell, Stethoscope,
}

export default function BusinessTypesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business Types</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide availability of supported business verticals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUSINESS_TYPES.map(bt => {
          const Icon = ICON_MAP[bt.icon] ?? UtensilsCrossed
          const isLive = bt.status === "live"
          return (
            <div
              key={bt.key}
              className={cn(
                "rounded-xl border border-border bg-card p-5 space-y-3 transition-colors",
                !isLive && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn(
                  "size-10 rounded-lg flex items-center justify-center",
                  isLive ? "bg-primary/10" : "bg-muted"
                )}>
                  <Icon className={cn("size-5", isLive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_STYLES[bt.status]
                )}>
                  {STATUS_LABELS[bt.status]}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm">{bt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bt.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
