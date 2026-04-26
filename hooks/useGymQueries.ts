import { useQuery } from "@tanstack/react-query"
import {
  fetchDashboardStats, fetchMembers, fetchMemberProfile, fetchMembershipPlans,
  fetchClasses, fetchBookings, fetchTeam, fetchInventory, fetchAnalytics,
  fetchEquipment, fetchLoyalty, fetchTodayCheckins,
} from "@/lib/api/gym"

export const useDashboardStats = () =>
  useQuery({ queryKey: ["dashboard", "stats"], queryFn: () => fetchDashboardStats() })

export const useMembers = (filters?: Record<string, string | undefined>) =>
  useQuery({ queryKey: ["members", filters], queryFn: () => fetchMembers(filters) })

export const useMemberProfile = (memberId: string) =>
  useQuery({ queryKey: ["members", memberId], queryFn: () => fetchMemberProfile(memberId), enabled: !!memberId })

export const useMembershipPlans = () =>
  useQuery({ queryKey: ["memberships", "plans"], queryFn: () => fetchMembershipPlans(), staleTime: 10 * 60 * 1000 })

export const useClasses = (date?: string) =>
  useQuery({ queryKey: ["classes", date], queryFn: () => fetchClasses(date), staleTime: 2 * 60 * 1000 })

export const useBookings = (filters?: Record<string, string | undefined>) =>
  useQuery({ queryKey: ["bookings", filters], queryFn: () => fetchBookings(filters), staleTime: 2 * 60 * 1000 })

export const useTeam = () =>
  useQuery({ queryKey: ["team"], queryFn: () => fetchTeam(), staleTime: 10 * 60 * 1000 })

export const useInventory = () =>
  useQuery({ queryKey: ["inventory"], queryFn: () => fetchInventory() })

export const useAnalytics = (dateRange?: Record<string, string | undefined>) =>
  useQuery({ queryKey: ["analytics", dateRange], queryFn: () => fetchAnalytics(dateRange) })

export const useEquipment = () =>
  useQuery({ queryKey: ["equipment"], queryFn: () => fetchEquipment(), staleTime: 10 * 60 * 1000 })

export const useLoyalty = () =>
  useQuery({ queryKey: ["loyalty"], queryFn: () => fetchLoyalty() })

export const useTodayCheckins = () =>
  useQuery({ queryKey: ["checkins", "today"], queryFn: () => fetchTodayCheckins(), staleTime: 30 * 1000, refetchInterval: 30 * 1000 })
