"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", password: "" })

  useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        window.location.href = data.role === "super_admin" ? "/portal/tenants" : "/portal/dashboard"
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/v1/auth/login/cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.detail ?? "Invalid email or password.")
        return
      }
      const data = await res.json().catch(() => ({}))
      const role = data?.role ?? ""
      window.location.href = role === "super_admin" ? "/portal/tenants" : "/portal/dashboard"
    } catch {
      setError("Unable to connect. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[oklch(0.25_0.02_49.25)] overflow-hidden flex-col justify-between p-14">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-md bg-[oklch(0.553_0.195_38.402)] opacity-[0.08] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-md bg-[oklch(0.646_0.222_41.116)] opacity-[0.06] blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <span className="font-serif text-2xl font-semibold tracking-tight text-white">
            Vortiva
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="font-serif text-3xl leading-snug text-white/90 font-normal italic">
            &ldquo;Manage your business with clarity, speed, and confidence.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-white/30" />
            <span className="text-sm text-white/50 tracking-wide uppercase font-sans">
              Client Portal
            </span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <span className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Vortiva
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">Sign in to your client account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className={cn(
                  "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-sm text-foreground",
                  "placeholder:text-muted-foreground/60 outline-none transition-all duration-150",
                  "focus:ring-2 focus:ring-primary/40 focus:border-primary"
                )}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors duration-150"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className={cn(
                    "w-full rounded-md border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground",
                    "placeholder:text-muted-foreground/60 outline-none transition-all duration-150",
                    "focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium",
                "bg-primary text-primary-foreground transition-all duration-150",
                "hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="text-foreground font-medium hover:text-primary transition-colors duration-150"
            >
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
