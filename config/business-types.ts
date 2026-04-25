export type BusinessTypeStatus = "live" | "coming_soon" | "beta"

export type BusinessType = {
  key: string
  label: string
  description: string
  icon: string
  status: BusinessTypeStatus
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    key: "food_and_beverage",
    label: "Food & Beverage",
    description: "Restaurants, cafes, bars, cloud kitchens, and food stalls.",
    icon: "UtensilsCrossed",
    status: "live",
  },
  {
    key: "retail",
    label: "Retail",
    description: "General merchandise, clothing, electronics, and specialty stores.",
    icon: "ShoppingBag",
    status: "coming_soon",
  },
  {
    key: "salon_and_spa",
    label: "Salon & Spa",
    description: "Hair salons, nail studios, massage, and wellness centers.",
    icon: "Sparkles",
    status: "coming_soon",
  },
  {
    key: "bakery",
    label: "Bakery & Pastry",
    description: "Bakeries, pastry shops, and specialty dessert businesses.",
    icon: "Cake",
    status: "coming_soon",
  },
  {
    key: "gym_and_fitness",
    label: "Gym & Fitness",
    description: "Gyms, fitness studios, yoga centers, and sports facilities.",
    icon: "Dumbbell",
    status: "coming_soon",
  },
  {
    key: "clinic",
    label: "Clinic & Healthcare",
    description: "Dental, medical, and wellness clinics.",
    icon: "Stethoscope",
    status: "coming_soon",
  },
]

export const BUSINESS_TYPE_MAP = Object.fromEntries(
  BUSINESS_TYPES.map(b => [b.key, b])
)

export const STATUS_LABELS: Record<BusinessTypeStatus, string> = {
  live: "Live",
  beta: "Beta",
  coming_soon: "Coming Soon",
}

export const STATUS_STYLES: Record<BusinessTypeStatus, string> = {
  live: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  beta: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  coming_soon: "bg-muted text-muted-foreground",
}
