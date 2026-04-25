"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Table = { id: string; name: string; status: string; capacity: number }
type MenuItem = { id: string; name: string; price: number; is_available: boolean; category_id: string | null }
type CartItem = { menu_item_id: string; name: string; unit_price: number; quantity: number; notes: string }

export default function NewOrderPage() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tableId, setTableId] = useState<string>("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const safe = (p: Promise<Response>) => p.then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : []).catch(() => [])
    Promise.all([
      safe(fetch("/api/v1/restaurant/tables", { credentials: "include" })),
      safe(fetch("/api/v1/restaurant/menu/items", { credentials: "include" })),
    ]).then(([t, m]) => {
      setTables(t)
      setMenuItems(m)
    })
  }, [])

  const filteredItems = menuItems.filter(
    m => m.is_available && m.name.toLowerCase().includes(search.toLowerCase())
  )

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id)
      if (existing) {
        return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { menu_item_id: item.id, name: item.name, unit_price: Number(item.price), quantity: 1, notes: "" }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(prev =>
      prev.flatMap(c => {
        if (c.menu_item_id !== id) return [c]
        const q = c.quantity + delta
        return q <= 0 ? [] : [{ ...c, quantity: q }]
      })
    )
  }

  function updateNotes(id: string, notes: string) {
    setCart(prev => prev.map(c => c.menu_item_id === id ? { ...c, notes } : c))
  }

  const total = cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)

  async function submit() {
    if (cart.length === 0) { setError("Add at least one item."); return }
    setError("")
    setSubmitting(true)
    const res = await fetch("/api/v1/restaurant/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        table_id: tableId || null,
        items: cart.map(c => ({
          menu_item_id: c.menu_item_id,
          name: c.name,
          unit_price: c.unit_price,
          quantity: c.quantity,
          notes: c.notes || null,
        })),
      }),
    })
    if (res.ok) {
      router.push("/portal/orders")
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.detail ?? "Failed to create order.")
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New Order</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left — menu */}
        <div className="space-y-4">
          {/* Table select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Table (optional)</label>
            <select
              value={tableId}
              onChange={e => setTableId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Takeaway / No table</option>
              {tables.filter(t => t.status === "available").map(t => (
                <option key={t.id} value={t.id}>{t.name} (cap. {t.capacity})</option>
              ))}
            </select>
          </div>

          {/* Menu search */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Menu Items</label>
            <input
              type="search"
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="rounded-md border border-border divide-y divide-border max-h-96 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No items found.</p>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors text-left"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    ₱{Number(item.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right — cart */}
        <div className="space-y-4">
          <p className="text-sm font-medium">Order Summary</p>

          {cart.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No items added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.menu_item_id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.name}</span>
                    <button
                      onClick={() => setCart(prev => prev.filter(c => c.menu_item_id !== item.menu_item_id))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.menu_item_id, -1)}
                        className="p-1 rounded border border-border hover:bg-accent transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.menu_item_id, 1)}
                        className="p-1 rounded border border-border hover:bg-accent transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ₱{(item.unit_price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Special notes…"
                    value={item.notes}
                    onChange={e => updateNotes(item.menu_item_id, e.target.value)}
                    className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                  />
                </div>
              ))}

              <div className="flex justify-between font-medium text-sm pt-1 border-t border-border">
                <span>Total</span>
                <span>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting || cart.length === 0}
            className={cn(
              "w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground",
              "hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            )}
          >
            {submitting ? "Placing order…" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  )
}
