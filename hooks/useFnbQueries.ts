import { useQuery } from "@tanstack/react-query"
import {
  fetchDashboardStats, fetchOrders, fetchMenuCategories, fetchMenuItems,
  fetchTables, fetchReservations, fetchKds, fetchInventoryProducts,
  fetchInventoryCategories, fetchStaff, fetchLoyaltyCustomers, fetchAnalytics,
} from "@/lib/api/fnb"

export const useDashboardStats     = () => useQuery({ queryKey: ["dashboard", "stats"],       queryFn: () => fetchDashboardStats(),        staleTime: 60 * 1000 })
export const useOrders             = () => useQuery({ queryKey: ["orders"],                    queryFn: () => fetchOrders(),                staleTime: 30 * 1000, refetchInterval: 30 * 1000 })
export const useMenuCategories     = () => useQuery({ queryKey: ["menu", "categories"],        queryFn: () => fetchMenuCategories(),        staleTime: 10 * 60 * 1000 })
export const useMenuItems          = () => useQuery({ queryKey: ["menu", "items"],             queryFn: () => fetchMenuItems(),             staleTime: 10 * 60 * 1000 })
export const useTables             = () => useQuery({ queryKey: ["tables"],                    queryFn: () => fetchTables(),                staleTime: 60 * 1000 })
export const useReservations       = () => useQuery({ queryKey: ["reservations"],              queryFn: () => fetchReservations(),          staleTime: 2 * 60 * 1000 })
export const useKds                = () => useQuery({ queryKey: ["kds"],                       queryFn: () => fetchKds(),                   staleTime: 15 * 1000, refetchInterval: 15 * 1000 })
export const useInventoryProducts  = () => useQuery({ queryKey: ["inventory", "products"],    queryFn: () => fetchInventoryProducts() })
export const useInventoryCategories = () => useQuery({ queryKey: ["inventory", "categories"], queryFn: () => fetchInventoryCategories(),   staleTime: 10 * 60 * 1000 })
export const useStaff              = () => useQuery({ queryKey: ["staff"],                     queryFn: () => fetchStaff(),                 staleTime: 10 * 60 * 1000 })
export const useLoyaltyCustomers   = () => useQuery({ queryKey: ["loyalty", "customers"],     queryFn: () => fetchLoyaltyCustomers() })
export const useAnalytics          = () => useQuery({ queryKey: ["analytics"],                 queryFn: () => fetchAnalytics() })
