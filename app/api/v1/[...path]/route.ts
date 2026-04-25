import { type NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.API_URL ?? "http://localhost:8000"

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
    credentials: "include",
    redirect: "follow",
  } as RequestInit)

  const resHeaders = new Headers(res.headers)
  // Node's fetch already decompresses the body — remove encoding headers
  // so the browser doesn't try to decompress again (ERR_CONTENT_DECODING_FAILED)
  resHeaders.delete("content-encoding")
  resHeaders.delete("transfer-encoding")

  // Buffer the full body before returning — streaming res.body directly can
  // result in truncated responses (unterminated JSON) in Vercel's edge runtime
  const body = await res.arrayBuffer()

  return new NextResponse(body, {
    status: res.status,
    headers: resHeaders,
  })
}

export const GET     = handler
export const POST    = handler
export const PATCH   = handler
export const PUT     = handler
export const DELETE  = handler
