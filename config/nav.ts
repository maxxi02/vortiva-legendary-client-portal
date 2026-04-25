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
