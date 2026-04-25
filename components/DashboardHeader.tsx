"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Bell, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Branch = { id: string; name: string }
type Notification = { id: string; message: string; read: boolean; created_at: string }

export function DashboardHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const crumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }))

  const [role, setRole] = useState("")
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null)
  const [branchOpen, setBranchOpen] = useState(false)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setRole(data.role)
        if (data.role === "client_admin") {
          fetch("/api/v1/branches", { credentials: "include" })
            .then(r => r.ok ? r.json() : [])
            .then((bs: Branch[]) => {
              setBranches(bs)
              if (bs.length > 0) setActiveBranch(bs[0])
            })
            .catch(() => {})
        }
        fetch("/api/v1/notifications", { credentials: "include" })
          .then(r => r.ok ? r.json() : [])
          .then(setNotifications)
          .catch(() => {})
      })
  }, [])

  const unread = notifications.filter(n => !n.read).length

  function markAllRead() {
    fetch("/api/v1/notifications/read-all", { method: "POST", credentials: "include" }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-2">
        {/* Branch selector — client_admin only, 2+ branches */}
        {role === "client_admin" && branches.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setBranchOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              {activeBranch?.name ?? "Select branch"}
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
            {branchOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBranchOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-background shadow-lg py-1">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setActiveBranch(b); setBranchOpen(false) }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                        activeBranch?.id === b.id && "font-medium text-primary"
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o) }}
            className="relative flex items-center justify-center size-8 rounded-md hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-background shadow-lg">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <span className="text-sm font-medium">Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-center text-muted-foreground">No notifications</p>
                  ) : (
                    notifications.slice(0, 20).map(n => (
                      <div key={n.id} className={cn("px-4 py-3 border-b border-border/50 last:border-0 text-sm", !n.read && "bg-muted/40")}>
                        <p className={cn(!n.read && "font-medium")}>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(n.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
