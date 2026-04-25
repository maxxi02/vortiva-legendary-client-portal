"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, X } from "lucide-react"
import { StatusBadge } from "@/components/portal/StatusBadge"
import { cn } from "@/lib/utils"
import { API } from "@/lib/api"

type OrderItem = {
  id: string
  name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
}

type Order = {
  id: string
  table_id: string | null
  status: string
  notes?: string
  total: number
  created_at: string
  items: OrderItem[]
}

const STATUSES = ["all", "pending", "preparing", "ready", "served", "paid", "cancelled"]

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`${API}/api/v1/restaurant/orders`, { credentials: "include" })
    if (res.ok) setOrders(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)

  async function updateStatus(orderId: string, status: string) {
    setUpdating(true)
    const res = await fetch(`${API}/api/v1/restaurant/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: Order = await res.json()
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      setSelected(updated)
    }
    setUpdating(false)
  }

  const NEXT_STATUS: Record<string, string> = {
    pending: "preparing",
    preparing: "ready",
    ready: "served",
    served: "paid",
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <Link
          href="/portal/orders/new"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Table</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map(order => (
                <tr
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">{order.table_id ? "Table" : "Takeaway"}</td>
                  <td className="px-4 py-3">{order.items.length}</td>
                  <td className="px-4 py-3">
                    ₱{Number(order.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(order.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-medium">Order detail</p>
                <p className="text-xs text-muted-foreground font-mono">{selected.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <span className="text-sm text-muted-foreground">
                  {selected.table_id ? "Dine-in" : "Takeaway"}
                </span>
              </div>

              {selected.notes && (
                <p className="text-sm text-muted-foreground italic">{selected.notes}</p>
              )}

              <div className="space-y-2">
                {selected.items.map(item => (
                  <div key={item.id} className="flex items-start justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.quantity}× {item.name}</span>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      ₱{Number(item.subtotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 flex justify-between font-medium">
                <span>Total</span>
                <span>₱{Number(selected.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Actions */}
            {NEXT_STATUS[selected.status] && (
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => updateStatus(selected.id, NEXT_STATUS[selected.status])}
                  disabled={updating}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity capitalize"
                >
                  {updating ? "Updating…" : `Mark as ${NEXT_STATUS[selected.status]}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
