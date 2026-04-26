import { useMutation, useQueryClient } from "@tanstack/react-query"
import { API } from "@/lib/api"

const req = (method: string, url: string, body?: unknown) =>
  fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => { if (!r.ok) throw new Error(`${method} ${url}: ${r.status}`); return r.json() })

export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/v1/restaurant/orders`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  })
}

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/v1/restaurant/orders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["kds"] }) },
  })
}

export const useCreateMenuItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/v1/restaurant/menu/items`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu"] }),
  })
}

export const useUpdateMenuItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/v1/restaurant/menu/items/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu"] }),
  })
}

export const useCreateMenuCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/v1/restaurant/menu/categories`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu", "categories"] }),
  })
}

export const useDeleteMenuCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => req("DELETE", `${API}/api/v1/restaurant/menu/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu"] }),
  })
}

export const useCreateReservation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/v1/restaurant/reservations`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  })
}

export const useUpdateReservation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/v1/restaurant/reservations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  })
}

export const useDeleteReservation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => req("DELETE", `${API}/api/v1/restaurant/reservations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  })
}

export const useUpdateTable = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/v1/restaurant/tables/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  })
}

export const useRestockProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/v1/inventory/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  })
}

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/v1/inventory/products`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  })
}
