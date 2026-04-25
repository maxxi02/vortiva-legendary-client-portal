import { LockKeyhole } from "lucide-react"

export function TrialExpiredGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <LockKeyhole className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-semibold tracking-tight">Your trial has ended</h2>
        <p className="text-sm text-muted-foreground">
          Upgrade to a paid plan to continue using the portal and keep your data.
        </p>
      </div>
      <a
        href="/portal/settings?tab=billing"
        className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        View plans &amp; upgrade
      </a>
    </div>
  )
}
