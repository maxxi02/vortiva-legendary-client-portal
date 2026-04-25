import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/forgot-password", "/register"])
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get("access_token")?.value
  const isPublic = PUBLIC_PATHS.has(pathname)
  const isPortal = pathname.startsWith("/portal")

  // Authenticated + not expired → skip login page
  if (isPublic && accessToken && !isExpired(accessToken)) {
    const cached = request.cookies.get("user-info")?.value
    let role = ""
    try { role = cached ? (JSON.parse(cached).role ?? "") : "" } catch { /* ignore */ }
    if (!role) {
      // No cached role yet — let the login page load; portal proxy will cache it on first portal visit
      return NextResponse.next()
    }
    const dest = role === "super_admin" ? "/portal/tenants" : "/portal/dashboard"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // No token → block portal
  if (isPortal && !accessToken) {
    const url = new URL("/", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  if (isPortal && accessToken) {
    // Expired → clear and redirect
    if (isExpired(accessToken)) {
      const res = NextResponse.redirect(new URL("/", request.url))
      res.cookies.delete("access_token")
      res.cookies.delete("refresh_token")
      res.cookies.delete("user-info")
      return res
    }

    // Read role from cached user-info cookie
    const cached = request.cookies.get("user-info")?.value
    let role = ""
    let userId = ""

    if (cached) {
      try {
        const info = JSON.parse(cached)
        role = info.role ?? ""
        userId = info.id ?? ""
      } catch { /* ignore */ }
    }

    // No cache → fetch /me from backend and cache the result
    if (!role) {
      try {
        const meRes = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
          headers: { Cookie: `access_token=${accessToken}` },
          cache: "no-store",
        })
        if (meRes.ok) {
          const me = await meRes.json()
          role = me.role ?? ""
          userId = me.id ?? ""

          const requestHeaders = new Headers(request.headers)
          requestHeaders.set("x-user-role", role)
          requestHeaders.set("x-user-id", userId)

          const response = NextResponse.next({ request: { headers: requestHeaders } })
          response.cookies.set("user-info", JSON.stringify({ role, id: userId }), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
          })
          return response
        } else if (meRes.status === 401) {
          // Token rejected by backend → force logout
          const res = NextResponse.redirect(new URL("/", request.url))
          res.cookies.delete("access_token")
          res.cookies.delete("refresh_token")
          res.cookies.delete("user-info")
          return res
        }
        // Any other error (503, timeout, etc.) → let through without role
      } catch {
        // Backend unreachable — let through
      }
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-role", role)
    requestHeaders.set("x-user-id", userId)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api|.*\\..*).*)"],
}
