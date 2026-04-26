"use client"

import { useState } from "react"
import { Plus, Package, AlertTriangle, ShoppingCart, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchInventoryProducts, fetchInventoryCategories } from "@/lib/api/fnb"
import { API } from "@/lib/api"

const GYM_CATEGORIES = ["Supplements", "Merchandise", "Cleaning Supplies", "Office Supplies", "First Aid", "Towels & Linen", "Vending / Supplement Bar"]
const LOW_STOCK = 5

type Category = { id: string; name: string }
type Product = { id: string; name: string; description?: string; sku?: string; price: number; stock_qty: number; is_active: boolean; is_for_sale?: boolean; category_id?: string }
type Member = { id: string; name: string }

function getCookieJson(key: string) {
  if (typeof document === "undefined") return null
  const raw = document.cookie.split("; ").find(c => c.startsWith(`${key}=`))?.split("=").slice(1).join("=")
  try { return raw ? JSON.parse(decodeURIComponent(raw)) : null } catch { return null }
}
const getRole = () => getCookieJson("user-info")?.role ?? ""
const getBusinessType = () => getCookieJson("user-info")?.business_type ?? ""

export default function InventoryPage() {
  const qc = useQueryClient()
  const isAdmin = getRole() !== "staff"
  const isGym = getBusinessType() === "gym"

  const { data: products = [], isLoading } = useQuery({ queryKey: ["inventory", "products"], queryFn: () => fetchInventoryProducts() as Promise<Product[]> })
  const { data: categories = [] } = useQuery({ queryKey: ["inventory", "categories"], queryFn: () => fetchInventoryCategories() as Promise<Category[]>, enabled: isAdmin })

  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")
  const [restocking, setRestocking] = useState<Product | null>(null)
  const [restockQty, setRestockQty] = useState("")
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: "", price: "", stock_qty: "0", sku: "", category_id: "", description: "", is_for_sale: false })
  const [error, setError] = useState("")
  const [showShop, setShowShop] = useState(false)
  const [sellTarget, setSellTarget] = useState<Product | null>(null)
  const [sellMember, setSellMember] = useState("")
  const [sellQty, setSellQty] = useState("1")
  const [members, setMembers] = useState<Member[]>([])
  const [sellErr, setSellErr] = useState("")

  const invalidate = () => qc.invalidateQueries({ queryKey: ["inventory"] })

  const restockMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      fetch(`${API}/api/v1/inventory/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ stock_qty: qty }) }).then(r => r.json()),
    onSuccess: () => { invalidate(); setRestocking(null); setRestockQty("") },
  })

  const addProductMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch(`${API}/api/v1/inventory/products`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: data.name, price: parseFloat(data.price), stock_qty: parseInt(data.stock_qty) || 0, sku: data.sku || null, description: data.description || null, category_id: data.category_id || null, is_for_sale: data.is_for_sale }),
      }).then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? "Failed"); return r.json() }),
    onSuccess: () => { invalidate(); setAdding(false); setForm({ name: "", price: "", stock_qty: "0", sku: "", category_id: "", description: "", is_for_sale: false }) },
    onError: (e: Error) => setError(e.message),
  })

  const sellMutation = useMutation({
    mutationFn: ({ product_id, member_id, qty }: { product_id: string; member_id: string | null; qty: number }) =>
      fetch(`${API}/api/v1/gym/shop/sell`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id, member_id, qty }) })
        .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() }),
    onSuccess: () => { invalidate(); setSellTarget(null) },
    onError: (e: Error) => setSellErr(e.message),
  })

  async function openSell(p: Product) {
    setSellTarget(p); setSellQty("1"); setSellMember(""); setSellErr("")
    if (members.length === 0) {
      const res = await fetch(`${API}/api/v1/gym/members?fields=id,name`, { credentials: "include" })
      if (res.ok) setMembers(await res.json())
    }
  }

  const catName = (id?: string) => categories.find(c => c.id === id)?.name ?? "—"
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === "all" || (isGym ? (p.category_id === catFilter || catName(p.category_id) === catFilter) : p.category_id === catFilter)
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <div className="flex items-center gap-2">
          {isGym && (
            <button onClick={() => setShowShop(s => !s)}
              className={cn("flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors", showShop ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent")}>
              <ShoppingCart className="h-4 w-4" /> Gym Shop
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      {isGym && showShop && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium mb-3">For Sale — Front Desk POS</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.filter(p => p.is_for_sale && p.is_active && p.stock_qty > 0).map(p => (
              <div key={p.id} className="rounded-md border border-border bg-background p-3 space-y-1">
                <p className="text-sm font-medium leading-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground">₱{Number(p.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                <p className={cn("text-xs", p.stock_qty <= LOW_STOCK ? "text-red-600 font-medium" : "text-muted-foreground")}>Stock: {p.stock_qty}</p>
                <button onClick={() => openSell(p)} className="w-full mt-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">Sell to Member</button>
              </div>
            ))}
            {products.filter(p => p.is_for_sale && p.is_active && p.stock_qty > 0).length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground py-4 text-center">No items marked for sale.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <input type="search" placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-56" />
        {isGym ? (
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="all">All Categories</option>
            {GYM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : isAdmin && (
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="all">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Product", "SKU", "Category", "Price", "Stock", ...(isGym ? ["For Sale"] : []), "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(6)].map((_, i) => <tr key={i}>{[...Array(isGym ? 7 : 6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse w-20" /></td>)}</tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isGym ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />No products found.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={cn("transition-colors", !p.is_active && "opacity-50")}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.sku ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{catName(p.category_id)}</td>
                <td className="px-4 py-3">₱{Number(p.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={cn("flex items-center gap-1", p.stock_qty <= LOW_STOCK && "text-red-600 dark:text-red-400 font-medium")}>
                    {p.stock_qty <= LOW_STOCK && <AlertTriangle className="h-3.5 w-3.5" />}{p.stock_qty}
                  </span>
                </td>
                {isGym && <td className="px-4 py-3">{p.is_for_sale ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Yes</span> : <span className="text-xs text-muted-foreground">—</span>}</td>}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setRestocking(p); setRestockQty("") }} className="text-xs text-primary hover:underline">Restock</button>
                    {isGym && p.is_for_sale && p.stock_qty > 0 && <button onClick={() => openSell(p)} className="text-xs text-primary hover:underline">Sell</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {restocking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRestocking(null)} />
          <div className="relative bg-background rounded-lg border border-border shadow-xl w-full max-w-xs p-5 space-y-4">
            <p className="font-semibold">Restock: {restocking.name}</p>
            <p className="text-sm text-muted-foreground">Current stock: {restocking.stock_qty}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Add quantity</label>
              <input type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} autoFocus
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRestocking(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={() => restockMutation.mutate({ id: restocking.id, qty: restocking.stock_qty + parseInt(restockQty) })}
                disabled={restockMutation.isPending || !restockQty}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {restockMutation.isPending ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdding(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-border font-medium">Add Product</div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[{ label: "Name *", key: "name", type: "text" }, { label: "Price *", key: "price", type: "number" }, { label: "Initial Stock", key: "stock_qty", type: "number" }, { label: "SKU", key: "sku", type: "text" }].map(({ label, key, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              {isGym && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_for_sale} onChange={e => setForm(f => ({ ...f, is_for_sale: e.target.checked }))} className="rounded border-border" />
                  <span className="text-sm font-medium">Available for sale (Gym Shop / POS)</span>
                </label>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={() => { if (!form.name || !form.price) { setError("Name and price are required."); return } setError(""); addProductMutation.mutate(form) }}
                disabled={addProductMutation.isPending}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {addProductMutation.isPending ? "Saving…" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sellTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSellTarget(null)} />
          <div className="relative bg-background rounded-lg border border-border shadow-xl w-full max-w-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Sell: {sellTarget.name}</p>
              <button onClick={() => setSellTarget(null)} className="p-1 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground">₱{Number(sellTarget.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })} · Stock: {sellTarget.stock_qty}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantity</label>
              <input type="number" min="1" max={sellTarget.stock_qty} value={sellQty} onChange={e => setSellQty(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Member (optional)</label>
              <select value={sellMember} onChange={e => setSellMember(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Walk-in / No member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            {sellErr && <p className="text-sm text-destructive">{sellErr}</p>}
            <div className="flex gap-2">
              <button onClick={() => setSellTarget(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={() => sellMutation.mutate({ product_id: sellTarget.id, member_id: sellMember || null, qty: parseInt(sellQty) || 1 })}
                disabled={sellMutation.isPending}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {sellMutation.isPending ? "Saving…" : "Confirm Sale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
