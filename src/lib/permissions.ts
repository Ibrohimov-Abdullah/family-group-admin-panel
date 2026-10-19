import type { Role } from '../api/types'

/** Sections of the admin. A role sees a section only when it is listed here. */
export type Section =
  | 'inbox' | 'dashboard' | 'orders' | 'delivery' | 'consultations'
  | 'products' | 'stock' | 'promos' | 'customers' | 'reviews' | 'content'
  | 'pharmacies' | 'bonus' | 'staff' | 'activity' | 'settings'

export const ACCESS: Record<Section, Role[]> = {
  inbox: ['owner', 'manager', 'operator', 'bonus'],
  dashboard: ['owner', 'manager'],
  orders: ['owner', 'manager', 'operator'],
  delivery: ['owner', 'manager', 'operator'],
  consultations: ['owner', 'manager', 'operator'],
  products: ['owner', 'manager'],
  stock: ['owner', 'manager', 'bonus'],
  promos: ['owner', 'manager'],
  customers: ['owner', 'manager', 'operator'],
  reviews: ['owner', 'manager'],
  content: ['owner', 'manager'],
  pharmacies: ['owner', 'manager', 'bonus'],
  bonus: ['owner', 'bonus'],
  staff: ['owner'],
  activity: ['owner'],
  settings: ['owner'],
}

export const can = (role: Role | undefined, section: Section) => !!role && ACCESS[section].includes(role)

export const ROLES: Role[] = ['owner', 'manager', 'operator', 'bonus']
