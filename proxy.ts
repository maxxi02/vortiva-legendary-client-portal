import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/forgot-password", "/register", "/get-started"])

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.has(pathname)
  const isPortal = pathname.startsWith("/portal")
  const accessToken = request.cookies.get("access_token")?.value

  // In cross-origin dev mode the access_token cookie may not be present
  // (set by onrender.com, not localhost). Fall back to user-info cookie
  // which is set same-origin by the login page.
  const userInfoRaw = request.cookies.get("user-info")?.value
  const userInfo = userInfoRaw ? (() => { try { return JSON.parse(decodeURIComponent(userInfoRaw)) } catch { return null } })() : null

  const hasSession = !!accessToken || !!userInfo?.role

  // No session → block portal, allow public
  if (!hasSession) {
    if (isPortal) {
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

  // Decode role — from JWT if available, else from user-info cookie
  const payload = accessToken ? decodeJWTPayload(accessToken) : null
  const role = (payload?.role as string) ?? (userInfo?.role as string) ?? ""
  const userId = (payload?.sub as string) ?? (userInfo?.id as string) ?? ""

  // Already logged in → skip public pages
  if (isPublic && role) {
    const dest = role === "super_admin" ? "/portal/tenants" : "/portal/dashboard"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Forward role + pathname as headers for server components
  const requestHeaders = new Headers(request.headers)
  if (role) requestHeaders.set("x-user-role", role)
  if (userId) requestHeaders.set("x-user-id", userId)
  requestHeaders.set("x-pathname", pathname)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api|.*\\..*).*)"],
}
