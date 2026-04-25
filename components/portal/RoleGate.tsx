import type { UserRole } from "@/config/nav"

interface Props {
  allowedRoles: UserRole[]
  role: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGate({ allowedRoles, role, children, fallback = null }: Props) {
  if (!allowedRoles.includes(role as UserRole)) return <>{fallback}</>
  return <>{children}</>
}
