import { useMutation, useQueryClient } from "@tanstack/react-query"
import { API } from "@/lib/api"

const req = (method: string, url: string, body?: unknown) =>
  fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((r) => {
    if (!r.ok) throw new Error(r.statusText)
    return r.json()
  })

export const useCreateMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/members`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  })
}

export const useUpdateMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/members/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["members"] })
      qc.invalidateQueries({ queryKey: ["members", id] })
    },
  })
}

export const useCheckInMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/checkins`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkins", "today"] })
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] })
    },
  })
}

export const useCreateBooking = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/bookings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      qc.invalidateQueries({ queryKey: ["classes"] })
    },
  })
}

export const useCancelBooking = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => req("PATCH", `${API}/api/bookings/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      qc.invalidateQueries({ queryKey: ["classes"] })
    },
  })
}

export const useRenewMembership = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/memberships/renew`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] })
      qc.invalidateQueries({ queryKey: ["memberships", "plans"] })
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] })
    },
  })
}

export const useCreateClass = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => req("POST", `${API}/api/classes`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  })
}

export const useUpdateClass = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/classes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  })
}

export const useUpdateEquipment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("PATCH", `${API}/api/equipment/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  })
}

export const useLogMaintenance = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      req("POST", `${API}/api/equipment/${id}/maintenance`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  })
}
