"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CalendarDays, BookOpen, User, Gift } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/member/dashboard", label: "Home",     icon: LayoutDashboard },
  { href: "/member/classes",   label: "Classes",  icon: CalendarDays },
  { href: "/member/bookings",  label: "Bookings", icon: BookOpen },
  { href: "/member/rewards",   label: "Rewards",  icon: Gift },
  { href: "/member/profile",   label: "Profile",  icon: User },
]

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Page content — padded above bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-lg mx-auto flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
