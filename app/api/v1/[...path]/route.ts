import { type NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${BACKEND}/api/v1/${path.join("/")}${req.nextUrl.search}`

  const headers = new Headers(req.headers)
  headers.delete("host")

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    duplex: "half",
    // @ts-expect-error — Node fetch supports this
    credentials: "include",
  } as RequestInit)

  const resHeaders = new Headers(res.headers)
  // Forward Set-Cookie so auth cookies are set on the browser
  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  })
}

export const GET     = handler
export const POST    = handler
export const PATCH   = handler
export const PUT     = handler
export const DELETE  = handler
