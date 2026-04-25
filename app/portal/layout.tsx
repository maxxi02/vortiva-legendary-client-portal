import { redirect } from "next/navigation"
import { headers, cookies } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { DashboardHeader } from "@/components/DashboardHeader"
import { TrialBanner } from "@/components/portal/TrialBanner"
import { TrialExpiredGate } from "@/components/portal/TrialExpiredGate"
import { navConfig, type UserRole } from "@/config/nav"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const role = headersList.get("x-user-role") ?? ""
  const pathname = headersList.get("x-pathname") ?? ""

  // If no role and no token, proxy would have already blocked this request.
  // Don't redirect here — it causes loops when backend is slow.

  // Find the nav item matching the current path and check role access
  const matchedItem = navConfig.find(item => pathname.startsWith(item.href))
  if (matchedItem && !matchedItem.roles.includes(role as UserRole)) {
    const fallback = navConfig.find(item => item.roles.includes(role as UserRole))
    redirect(fallback?.href ?? "/")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  // Fetch trial status from /me
  let trialStatus: string | null = null
  let trialDaysLeft: number | null = null
  let trialExpired = false

  const accessToken = cookieStore.get("access_token")?.value
  if (accessToken) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const me = await fetch(`${backendUrl}/api/v1/auth/me`, {
        headers: { Cookie: `access_token=${accessToken}` },
        cache: "no-store",
      }).then(r => r.ok ? r.json() : null)

      if (me?.status) {
        trialStatus = me.status
        if (me.status === "TRIAL" && me.trial_expires_at) {
          const msLeft = new Date(me.trial_expires_at).getTime() - Date.now()
          trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000))
          trialExpired = msLeft <= 0
        }
      }
    } catch { /* backend unreachable — degrade gracefully */ }
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar role={role} />
      <SidebarInset>
        <DashboardHeader />
        {trialStatus === "TRIAL" && !trialExpired && trialDaysLeft !== null && (
          <TrialBanner daysLeft={trialDaysLeft} />
        )}
        <div className="flex flex-1 flex-col gap-6 p-6">
          {trialExpired ? <TrialExpiredGate /> : children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
