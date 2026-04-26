import { API } from "@/lib/api"

const opts = (signal?: AbortSignal): RequestInit => ({ credentials: "include", signal })

const qs = (params?: Record<string, string | undefined>) => {
  if (!params) return ""
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && p.set(k, v))
  const s = p.toString()
  return s ? `?${s}` : ""
}

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, opts(signal))
  if (!r.ok) throw new Error(`GET ${url} failed: ${r.status} ${r.statusText}`)
  return r.json()
}

export const fetchDashboardStats  = (signal?: AbortSignal) => get(`${API}/api/v1/tenant/dashboard/stats`, signal)
export const fetchOrders          = (signal?: AbortSignal) => get(`${API}/api/v1/restaurant/orders`, signal)
export const fetchMenuCategories  = (signal?: AbortSignal) => get(`${API}/api/v1/restaurant/menu/categories`, signal)
export const fetchMenuItems       = (signal?: AbortSignal) => get(`${API}/api/v1/restaurant/menu/items`, signal)
export const fetchTables          = (signal?: AbortSignal) => get(`${API}/api/v1/restaurant/tables`, signal)
export const fetchReservations    = (signal?: AbortSignal) => get(`${API}/api/v1/restaurant/reservations`, signal)
export const fetchKds             = (signal?: AbortSignal) => get(`${API}/api/v1/restaurant/kds`, signal)
export const fetchInventoryProducts  = (signal?: AbortSignal) => get(`${API}/api/v1/inventory/products`, signal)
export const fetchInventoryCategories = (signal?: AbortSignal) => get(`${API}/api/v1/inventory/categories`, signal)
export const fetchStaff           = (signal?: AbortSignal) => get(`${API}/api/v1/staff`, signal)
export const fetchLoyaltyCustomers = (signal?: AbortSignal) => get(`${API}/api/v1/loyalty/customers`, signal)
export const fetchAnalytics       = (signal?: AbortSignal) => get(`${API}/api/v1/restaurant/orders`, signal)
