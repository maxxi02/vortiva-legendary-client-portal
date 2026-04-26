import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/forgot-password", "/register", "/get-started"])

const GYM_ROUTES = new Set([
  "/portal/checkin",
  "/portal/members",
  "/portal/memberships",
  "/portal/classes",
  "/portal/bookings",
  "/portal/equipment",
])

function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf-8"))
  } catch {
    return null
  }
}

function isExpired(token: string): boolean {
  const payload = decodeJWTPayload(token)
  if (!payload?.exp) return true
  return Date.now() / 1000 > (payload.exp as number)
}

function clearSession(response: NextResponse) {
  response.cookies.delete("access_token")
  response.cookies.delete("refresh_token")
  response.cookies.delete("user-info")
  return response
}

/** Returns true if the route is gym-specific and businessType is not "gym" */
function gymRouteGuard(pathname: string, businessType: string): boolean {
  const base = "/" + pathname.split("/").slice(1, 3).join("/")
  return GYM_ROUTES.has(base) && businessType !== "gym"
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.has(pathname)
  const isPortal = pathname.startsWith("/portal")
  const isMember = pathname.startsWith("/member")
  const accessToken = request.cookies.get("access_token")?.value

  const userInfoRaw = request.cookies.get("user-info")?.value
  const userInfo = userInfoRaw
    ? (() => { try { return JSON.parse(decodeURIComponent(userInfoRaw)) } catch { return null } })()
    : null

  const hasSession = !!accessToken || !!userInfo?.role

  // No session → block portal + member
  if (!hasSession) {
    if (isPortal || isMember) {
      const url = new URL("/", request.url)
      url.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Expired token → clear and redirect to login
  if (accessToken && isExpired(accessToken)) {
    return clearSession(NextResponse.redirect(new URL("/", request.url)))
  }

  // Decode claims — JWT first, fall back to user-info cookie
  const payload = accessToken ? decodeJWTPayload(accessToken) : null
  const role         = (payload?.role         as string) ?? (userInfo?.role          as string) ?? ""
  const businessType = (payload?.businessType as string) ?? (userInfo?.businessType  as string) ?? ""
  const tenantId     = (payload?.tenantId     as string) ?? (userInfo?.tenantId      as string) ?? ""
  const userId       = (payload?.sub          as string) ?? (userInfo?.id            as string) ?? ""

  // Already logged in → skip public pages
  if (isPublic && role) {
    let dest = "/portal/dashboard"
    if (role === "super_admin") dest = "/portal/tenants"
    else if (role === "member") dest = "/member/dashboard"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Members can only access /member/*
  if (isPortal && role === "member") {
    return NextResponse.redirect(new URL("/member/dashboard", request.url))
  }

  // Non-members cannot access /member/*
  if (isMember && role && role !== "member") {
    return NextResponse.redirect(new URL("/portal/dashboard", request.url))
  }

  if (isPortal) {
    const toDashboard = new URL("/portal/dashboard", request.url)

    // super_admin-only routes
    if (
      (pathname.startsWith("/portal/tenants") || pathname.startsWith("/portal/business-types")) &&
      role !== "super_admin"
    ) {
      return NextResponse.redirect(toDashboard)
    }

    // /portal/team — block member + trainer
    if (pathname.startsWith("/portal/team") && (role === "member" || role === "trainer")) {
      return NextResponse.redirect(toDashboard)
    }

    // /portal/settings — block front_desk + trainer
    if (pathname.startsWith("/portal/settings") && (role === "front_desk" || role === "trainer")) {
      return NextResponse.redirect(toDashboard)
    }

    // Gym-specific routes — block if businessType !== "gym"
    if (gymRouteGuard(pathname, businessType)) {
      return NextResponse.redirect(toDashboard)
    }
  }

  // Forward claims as request headers for server components
  const requestHeaders = new Headers(request.headers)
  if (role)         requestHeaders.set("x-user-role",      role)
  if (businessType) requestHeaders.set("x-business-type",  businessType)
  if (tenantId)     requestHeaders.set("x-tenant-id",      tenantId)
  if (userId)       requestHeaders.set("x-user-id",        userId)
  requestHeaders.set("x-pathname", pathname)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api|.*\\..*).*)"],
}
