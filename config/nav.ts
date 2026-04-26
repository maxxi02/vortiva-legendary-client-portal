// Backend roles: super_admin | client_admin | staff
export type UserRole = "super_admin" | "client_admin" | "staff"

export interface NavItem {
  label: string
  href: string
  icon: string
  roles: UserRole[]
}

export const navConfig: NavItem[] = [
  {
    label: "Dashboard",
    href: "/portal/dashboard",
    icon: "LayoutDashboard",
    roles: ["client_admin", "staff"],
  },
  {
    label: "Tenants",
    href: "/portal/tenants",
    icon: "Building2",
    roles: ["super_admin"],
  },
  {
    label: "Business Types",
    href: "/portal/business-types",
    icon: "LayoutGrid",
    roles: ["super_admin"],
  },
  {
    label: "Orders",
    href: "/portal/orders",
    icon: "ShoppingCart",
    roles: ["client_admin", "staff"],
  },
  {
    label: "KDS",
    href: "/portal/kds",
    icon: "Monitor",
    roles: ["client_admin", "staff"],
  },
  {
    label: "Tables",
    href: "/portal/tables",
    icon: "LayoutGrid",
    roles: ["client_admin", "staff"],
  },
  {
    label: "Reservations",
    href: "/portal/reservations",
    icon: "CalendarCheck",
    roles: ["client_admin"],
  },
  {
    label: "Menu",
    href: "/portal/menu",
    icon: "UtensilsCrossed",
    roles: ["client_admin"],
  },
  {
    label: "Inventory",
    href: "/portal/inventory",
    icon: "Package",
    roles: ["client_admin", "staff"],
  },
  {
    label: "Your Team",
    href: "/portal/team",
    icon: "Users",
    roles: ["client_admin"],
  },
  {
    label: "Analytics",
    href: "/portal/analytics",
    icon: "BarChart2",
    roles: ["client_admin"],
  },
  {
    label: "Loyalty",
    href: "/portal/loyalty",
    icon: "Gift",
    roles: ["client_admin"],
  },
  {
    label: "Settings",
    href: "/portal/settings",
    icon: "Settings",
    roles: ["super_admin", "client_admin", "staff"],
  },
]

// ─── Gym nav ──────────────────────────────────────────────────────────────────

import type { GymRole } from "./business-types"

export const GYM_NAV_GROUPS = ["Overview", "Members", "Schedule", "Operations", "Insights", "System"] as const
export type GymNavGroup = typeof GYM_NAV_GROUPS[number]

export interface GymNavItem {
  label: string
  href: string
  icon: string
  /** Roles that can see this nav item. Empty array = all gym roles. */
  roles: GymRole[]
  group: GymNavGroup
}

export const gymNavConfig: GymNavItem[] = [
  { label: "Dashboard",        href: "/portal/dashboard",   icon: "LayoutDashboard", roles: [],                                                          group: "Overview"    },
  { label: "Check-In",         href: "/portal/checkin",     icon: "ScanLine",        roles: ["gym_owner", "gym_manager", "front_desk"],                  group: "Overview"    },
  { label: "Members",          href: "/portal/members",     icon: "Users",           roles: ["gym_owner", "gym_manager", "trainer", "front_desk"],       group: "Members"     },
  { label: "Memberships",      href: "/portal/memberships", icon: "CreditCard",      roles: ["gym_owner", "gym_manager", "front_desk", "member"],        group: "Members"     },
  { label: "Attendance",       href: "/portal/attendance",  icon: "CalendarCheck",   roles: ["gym_owner", "gym_manager", "front_desk"],                  group: "Members"     },
  { label: "Loyalty & CRM",    href: "/portal/loyalty",     icon: "Heart",           roles: ["gym_owner", "gym_manager"],                                group: "Members"     },
  { label: "Classes & Schedule", href: "/portal/classes",   icon: "CalendarDays",    roles: ["gym_owner", "gym_manager", "trainer"],                     group: "Schedule"    },
  { label: "Bookings",         href: "/portal/bookings",    icon: "BookOpen",        roles: ["gym_owner", "gym_manager", "trainer", "front_desk", "member"], group: "Schedule" },
  { label: "Trainers",         href: "/portal/trainers",    icon: "UserCheck",       roles: ["gym_owner", "gym_manager"],                                group: "Schedule"    },
  { label: "Equipment",        href: "/portal/equipment",   icon: "Dumbbell",        roles: ["gym_owner", "gym_manager"],                                group: "Operations"  },
  { label: "Inventory",        href: "/portal/inventory",   icon: "Package",         roles: ["gym_owner", "gym_manager"],                                group: "Operations"  },
  { label: "Payments",         href: "/portal/payments",    icon: "Banknote",        roles: ["gym_owner", "gym_manager", "front_desk"],                  group: "Operations"  },
  { label: "Reports",          href: "/portal/reports",     icon: "BarChart2",       roles: ["gym_owner", "gym_manager"],                                group: "Insights"    },
  { label: "Analytics",        href: "/portal/analytics",   icon: "BarChart2",       roles: ["gym_owner", "gym_manager"],                                group: "Insights"    },
  { label: "Your Team",        href: "/portal/team",        icon: "Users",           roles: ["gym_owner", "gym_manager"],                                group: "System"      },
  { label: "Settings",         href: "/portal/settings",    icon: "Settings",        roles: [],                                                          group: "System"      },
]
