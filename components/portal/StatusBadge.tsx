import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  // Order statuses
  pending:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  preparing:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ready:      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  served:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  paid:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  // Table statuses
  available:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  occupied:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  reserved:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  dirty:      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  // KDS
  done:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

interface Props {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const key = status.toLowerCase()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[key] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}
