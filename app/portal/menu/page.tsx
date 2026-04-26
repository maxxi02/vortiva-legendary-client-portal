"use client"

import { useState, useRef } from "react"
import { Plus, Trash2, Pencil, X, Check, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"
import QRCodeLib from "qrcode"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchMenuCategories, fetchMenuItems } from "@/lib/api/fnb"
import { API } from "@/lib/api"

type Category = { id: string; name: string; sort_order: number }
type MenuItem = { id: string; name: string; description?: string; price: number; is_available: boolean; prep_time_minutes: number; category_id?: string }

const json = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })

export default function MenuPage() {
  const qc = useQueryClient()
  const { data: categories = [], isLoading: catLoading } = useQuery({ queryKey: ["menu", "categories"], queryFn: () => fetchMenuCategories() as Promise<Category[]> })
  const { data: items = [], isLoading: itemLoading } = useQuery({ queryKey: ["menu", "items"], queryFn: () => fetchMenuItems() as Promise<MenuItem[]> })
  const isLoading = catLoading || itemLoading

  const [activeCat, setActiveCat] = useState("all")
  const [newCatName, setNewCatName] = useState("")
  const [addingCat, setAddingCat] = useState(false)
  const [itemDrawer, setItemDrawer] = useState<Partial<MenuItem> | null>(null)
  const [itemError, setItemError] = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const invalidateMenu = () => qc.invalidateQueries({ queryKey: ["menu"] })

  const addCatMutation = useMutation({
    mutationFn: (name: string) => json("POST", `${API}/api/v1/restaurant/menu/categories`, { name, sort_order: categories.length }).then(r => r.json()),
    onSuccess: () => { invalidateMenu(); setNewCatName("") },
  })

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => json("DELETE", `${API}/api/v1/restaurant/menu/categories/${id}`),
    onSuccess: () => invalidateMenu(),
  })

  const saveItemMutation = useMutation({
    mutationFn: (item: Partial<MenuItem>) => {
      const isEdit = !!item.id
      return json(isEdit ? "PATCH" : "POST",
        isEdit ? `${API}/api/v1/restaurant/menu/items/${item.id}` : `${API}/api/v1/restaurant/menu/items`,
        { name: item.name, price: Number(item.price), description: item.description || null, category_id: item.category_id || null, prep_time_minutes: Number(item.prep_time_minutes) || 0, is_available: item.is_available ?? true }
      ).then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? "Failed"); return r.json() })
    },
    onSuccess: () => { invalidateMenu(); setItemDrawer(null) },
    onError: (e: Error) => setItemError(e.message),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => json("DELETE", `${API}/api/v1/restaurant/menu/items/${id}`),
    onSuccess: () => invalidateMenu(),
  })

  async function toggleAvailability(item: MenuItem) {
    setTogglingId(item.id)
    await json("PATCH", `${API}/api/v1/restaurant/menu/items/${item.id}`, { is_available: !item.is_available })
    invalidateMenu(); setTogglingId(null)
  }

  async function openQR() {
    const dataUrl = await QRCodeLib.toDataURL(`${window.location.origin}/menu`, { width: 300, margin: 2 })
    setQrDataUrl(dataUrl); setQrOpen(true)
  }

  function saveItem() {
    if (!itemDrawer?.name || !itemDrawer?.price) { setItemError("Name and price are required."); return }
    setItemError(""); saveItemMutation.mutate(itemDrawer)
  }

  const visibleItems = activeCat === "all" ? items : items.filter(i => i.category_id === activeCat)
  const catName = (id?: string) => categories.find(c => c.id === id)?.name

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Menu Builder</h1>
        <div className="flex items-center gap-2">
          <button onClick={openQR} className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <QrCode className="h-4 w-4" /> QR Code
          </button>
          <button onClick={() => setItemDrawer({ is_available: true, prep_time_minutes: 0 })}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>
      </div>

      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setQrOpen(false)} />
          <div className="relative bg-background rounded-xl border border-border shadow-xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Digital Menu QR Code</h2>
              <button onClick={() => setQrOpen(false)} className="p-1 rounded hover:bg-accent transition-colors"><X className="size-4" /></button>
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt="Menu QR Code" className="mx-auto rounded-lg" width={300} height={300} />}
            <p className="text-xs text-muted-foreground">Scan to view the digital menu</p>
            <a href={qrDataUrl} download="menu-qr.png" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">Download PNG</a>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categories</p>
          <div className="flex gap-1.5">
            <input type="text" placeholder="New category…" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCatMutation.mutate(newCatName.trim())}
              className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <button onClick={() => addCatMutation.mutate(newCatName.trim())} disabled={addingCat || !newCatName.trim()}
              className="rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            <button onClick={() => setActiveCat("all")}
              className={cn("w-full text-left px-3 py-2 rounded-md text-sm transition-colors", activeCat === "all" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground")}>
              All items <span className="ml-1.5 text-xs opacity-60">({items.length})</span>
            </button>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1">
                <button onClick={() => setActiveCat(cat.id)}
                  className={cn("flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors", activeCat === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground")}>
                  {cat.name} <span className="ml-1.5 text-xs opacity-60">({items.filter(i => i.category_id === cat.id).length})</span>
                </button>
                <button onClick={() => { if (confirm("Delete this category? Items will be uncategorised.")) deleteCatMutation.mutate(cat.id) }}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-lg border border-border animate-pulse bg-muted/30" />)}
            </div>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No items in this category.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleItems.map(item => (
                <div key={item.id} className={cn("rounded-lg border border-border bg-card p-4 space-y-2 transition-opacity", !item.is_available && "opacity-50")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {catName(item.category_id) && <p className="text-xs text-muted-foreground">{catName(item.category_id)}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setItemDrawer(item)} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("Delete this item?")) deleteItemMutation.mutate(item.id) }} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">₱{Number(item.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    <button onClick={() => toggleAvailability(item)} disabled={togglingId === item.id}
                      className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                        item.is_available ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400" : "bg-muted text-muted-foreground hover:bg-accent")}>
                      {item.is_available ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {item.is_available ? "Available" : "Unavailable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {itemDrawer !== null && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setItemDrawer(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-border font-medium">{itemDrawer.id ? "Edit Item" : "Add Item"}</div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[{ label: "Name *", key: "name", type: "text" }, { label: "Price *", key: "price", type: "number" }, { label: "Prep time (minutes)", key: "prep_time_minutes", type: "number" }].map(({ label, key, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={(itemDrawer as Record<string, unknown>)[key] as string ?? ""}
                    onChange={e => setItemDrawer(d => ({ ...d, [key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <select value={itemDrawer.category_id ?? ""} onChange={e => setItemDrawer(d => ({ ...d, category_id: e.target.value || undefined }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea value={itemDrawer.description ?? ""} onChange={e => setItemDrawer(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              {itemError && <p className="text-sm text-destructive">{itemError}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setItemDrawer(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
              <button onClick={saveItem} disabled={saveItemMutation.isPending}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
                {saveItemMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
