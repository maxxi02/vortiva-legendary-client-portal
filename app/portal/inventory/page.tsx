"use client"

import { useEffect, useState } from "react"
import { Plus, Package, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"

type Category = { id: string; name: string }
type Product = {
  id: string
  name: string
  description?: string
  sku?: string
  price: number
  stock_qty: number
  is_active: boolean
  category_id?: string
}

const LOW_STOCK = 5

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")

  // Restock modal
  const [restocking, setRestocking] = useState<Product | null>(null)
  const [restockQty, setRestockQty] = useState("")
  const [restockSaving, setRestockSaving] = useState(false)

  // Add product drawer
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: "", price: "", stock_qty: "0", sku: "", category_id: "", description: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    const [p, c] = await Promise.all([
      fetch(`${API}/api/v1/inventory/products`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/v1/inventory/categories`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    ])
    setProducts(p)
    setCategories(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === "all" || p.category_id === catFilter
    return matchSearch && matchCat
  })

  async function restock() {
    if (!restocking || !restockQty) return
    setRestockSaving(true)
    const newQty = (restocking.stock_qty) + parseInt(restockQty)
    const res = await fetch(`${API}/api/v1/inventory/products/${restocking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stock_qty: newQty }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === restocking.id ? updated : p))
      setRestocking(null)
      setRestockQty("")
    }
    setRestockSaving(false)
  }

  async function addProduct() {
    if (!form.name || !form.price) { setError("Name and price are required."); return }
    setError("")
    setSaving(true)
    const res = await fetch(`${API}/api/v1/inventory/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: form.name,
        price: parseFloat(form.price),
        stock_qty: parseInt(form.stock_qty) || 0,
        sku: form.sku || null,
        description: form.description || null,
        category_id: form.category_id || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setProducts(prev => [created, ...prev])
      setAdding(false)
      setForm({ name: "", price: "", stock_qty: "0", sku: "", category_id: "", description: "" })
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.detail ?? "Failed to add product.")
    }
    setSaving(false)
  }

  const catName = (id?: string) => categories.find(c => c.id === id)?.name ?? "—"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-56"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-20" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className={cn("transition-colors", !p.is_active && "opacity-50")}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.sku ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{catName(p.category_id)}</td>
                  <td className="px-4 py-3">₱{Number(p.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    <span className={cn("flex items-center gap-1", p.stock_qty <= LOW_STOCK && "text-red-600 dark:text-red-400 font-medium")}>
                      {p.stock_qty <= LOW_STOCK && <AlertTriangle className="h-3.5 w-3.5" />}
                      {p.stock_qty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setRestocking(p); setRestockQty("") }}
                      className="text-xs text-primary hover:underline"
                    >
                      Restock
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Restock modal */}
      {restocking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRestocking(null)} />
          <div className="relative bg-background rounded-lg border border-border shadow-xl w-full max-w-xs p-5 space-y-4">
            <p className="font-semibold">Restock: {restocking.name}</p>
            <p className="text-sm text-muted-foreground">Current stock: {restocking.stock_qty}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Add quantity</label>
              <input
                type="number"
                min="1"
                value={restockQty}
                onChange={e => setRestockQty(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRestocking(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={restock}
                disabled={restockSaving || !restockQty}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {restockSaving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add product drawer */}
      {adding && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdding(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-border font-medium">Add Product</div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[
                { label: "Name *", key: "name", type: "text" },
                { label: "Price *", key: "price", type: "number" },
                { label: "Initial Stock", key: "stock_qty", type: "number" },
                { label: "SKU", key: "sku", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={addProduct}
                disabled={saving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? "Saving…" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
