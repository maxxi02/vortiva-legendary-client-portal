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

export const fetchDashboardStats  = (signal?: AbortSignal) => get(`${API}/api/v1/gym/dashboard/stats`, signal)
export const fetchMembers          = (filters?: Record<string, string | undefined>, signal?: AbortSignal) => get(`${API}/api/v1/gym/members${qs(filters)}`, signal)
export const fetchMemberProfile    = (id: string, signal?: AbortSignal) => get(`${API}/api/v1/gym/members/${id}`, signal)
export const fetchMembershipPlans  = (signal?: AbortSignal) => get(`${API}/api/v1/gym/membership-plans`, signal)
export const fetchClasses          = (date?: string, signal?: AbortSignal) => get(`${API}/api/v1/gym/classes${qs({ date })}`, signal)
export const fetchBookings         = (filters?: Record<string, string | undefined>, signal?: AbortSignal) => get(`${API}/api/v1/gym/bookings/class${qs(filters)}`, signal)
export const fetchTeam             = (signal?: AbortSignal) => get(`${API}/api/v1/staff`, signal)
export const fetchInventory        = (signal?: AbortSignal) => get(`${API}/api/v1/inventory/products`, signal)
export const fetchAnalytics        = (dateRange?: Record<string, string | undefined>, signal?: AbortSignal) => get(`${API}/api/v1/restaurant/orders${qs(dateRange)}`, signal)
export const fetchEquipment        = (signal?: AbortSignal) => get(`${API}/api/v1/gym/equipment`, signal)
export const fetchLoyalty          = (signal?: AbortSignal) => get(`${API}/api/v1/loyalty/customers`, signal)
export const fetchTodayCheckins    = (signal?: AbortSignal) => get(`${API}/api/v1/gym/checkins/today`, signal)
