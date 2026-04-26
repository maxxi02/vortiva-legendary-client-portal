export type BusinessTypeStatus = "live" | "coming_soon" | "beta"

export type GymRole = "gym_owner" | "gym_manager" | "trainer" | "front_desk" | "member"

export type BusinessType = {
  key: string
  label: string
  description: string
  icon: string
  status: BusinessTypeStatus
  modules?: string[]
  roles?: string[]
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
    key: "gym",
    label: "Gym / Fitness Center",
    description: "Gym and fitness center with memberships, classes, and trainer bookings",
    icon: "Dumbbell",
    status: "coming_soon",
    modules: [
      "dashboard",
      "members",
      "memberships",
      "classes",
      "bookings",
      "equipment",
      "inventory",
      "team",
      "analytics",
      "loyalty",
      "settings",
    ],
    roles: ["super_admin", "gym_owner", "gym_manager", "trainer", "front_desk", "member"],
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

// ─── Gym role metadata ────────────────────────────────────────────────────────

export const GYM_ROLE_LABELS: Record<GymRole, string> = {
  gym_owner:   "Gym Owner",
  gym_manager: "Gym Manager",
  trainer:     "Trainer",
  front_desk:  "Front Desk",
  member:      "Member",
}

/**
 * Modules each gym role can access.
 * "all" means every module in the gym modules list.
 * Arrays list specific allowed modules.
 */
export const GYM_ROLE_PERMISSIONS: Record<GymRole, string[] | "all"> = {
  gym_owner:   "all",
  gym_manager: [
    "dashboard",
    "members",
    "memberships",
    "classes",
    "bookings",
    "equipment",
    "inventory",
    "team",
    "analytics",
    "loyalty",
    "settings", // all settings except billing — enforced at the settings page level
  ],
  trainer:     ["classes", "bookings", "members"], // read-only enforced at page level
  front_desk:  ["members", "bookings", "memberships"],
  member:      ["dashboard", "bookings", "memberships"], // own profile/class bookings/membership status
}
