import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Props {
  label: string
  value: string | number
  trend?: number
  trendLabel?: string
  className?: string
}

export function MetricCard({ label, value, trend, trendLabel, className }: Props) {
  const hasTrend = trend !== undefined && trend !== null
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5 space-y-2", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-card-foreground">{value}</p>
      {hasTrend && (
        <div className="flex items-center gap-1 text-xs">
          {trend! > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : trend! < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={cn(
            trend! > 0 ? "text-green-600 dark:text-green-400" :
            trend! < 0 ? "text-red-600 dark:text-red-400" :
            "text-muted-foreground"
          )}>
            {trendLabel ?? `${Math.abs(trend!)}%`}
          </span>
        </div>
      )}
    </div>
  )
}
