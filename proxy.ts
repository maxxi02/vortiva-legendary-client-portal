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

  // Decode role directly from JWT — no backend call needed
  const payload = decodeJWTPayload(accessToken)
  const role = (payload?.role as string) ?? ""
  const userId = (payload?.sub as string) ?? ""

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
