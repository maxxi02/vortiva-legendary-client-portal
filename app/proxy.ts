import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/forgot-password", "/register", "/get-started"])
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

  // No token → block portal, allow public
  if (!accessToken) {
    if (isPortal) {
      const url = new URL("/", request.url)
      url.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Expired token → clear and redirect to login
  if (isExpired(accessToken)) {
    return clearSession(NextResponse.redirect(new URL("/", request.url)))
  }

  // Read cached role
  let role = ""
  let userId = ""
  const cached = request.cookies.get("user-info")?.value
  if (cached) {
    try {
      const info = JSON.parse(cached)
      role = info.role ?? ""
      userId = info.id ?? ""
    } catch { /* ignore */ }
  }

  // No cache → fetch /me and cache it (fail open if backend unreachable)
  if (!role) {
    try {
      const me = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { Cookie: `access_token=${accessToken}` },
        cache: "no-store",
      })
      if (me.ok) {
        const data = await me.json()
        role = data.role ?? ""
        userId = data.id ?? ""
      } else if (me.status === 401) {
        // Token explicitly rejected → logout
        return clearSession(NextResponse.redirect(new URL("/", request.url)))
      }
      // Any other status (503 etc.) → fail open, let through
    } catch { /* backend unreachable — fail open */ }
  }

  // Already logged in → skip public pages
  if (isPublic && role) {
    const dest = role === "super_admin" ? "/portal/tenants" : "/portal/dashboard"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Forward role headers + cache for subsequent requests
  const requestHeaders = new Headers(request.headers)
  if (role) requestHeaders.set("x-user-role", role)
  if (userId) requestHeaders.set("x-user-id", userId)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  if (role && !cached) {
    response.cookies.set("user-info", JSON.stringify({ role, id: userId }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    })
  }

  return response
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api|.*\\..*).*)"],
}
