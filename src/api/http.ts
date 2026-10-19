/**
 * The admin's complete API surface — one function per backend endpoint.
 *
 * This file is the contract the backend implements (docs/API.md lists the same
 * endpoints with their payloads). The demo database in src/api/mock implements
 * exactly this type, so screens never know which one they are talking to.
 */
import { http } from './client'
import type {
  ActivityEntry, Allocation, Analytics, Badges, Bonus, BonusStatus, Category, Consultation,
  ConsultationStatus, Courier, Customer, Dashboard, ID, InboxItem, LoginResult, Order, OrderCounts,
  OrderQuery, OrderStatus, Page, Period, Pharmacy, Product, ProductInput, ProductLine, Promo, Rep,
  RepSale, RepSummary, Review, ReviewStatus, SearchHit, Session, Settings, SiteContent, StaffMember,
  StockForecast, StockMovement, StockReason, Certificate,
} from './types'

export interface ListQuery {
  q?: string
  page?: number
  pageSize?: number
}

export const httpApi = {
  auth: {
    /** Step 1. Owners (2FA on) get a ticket and a code by SMS/Telegram. */
    login: (login: string, password: string) => http.post<LoginResult>('/auth/login', { login, password }),
    /** Step 2 for 2FA accounts. */
    verify: (ticket: string, code: string) => http.post<Session>('/auth/2fa', { ticket, code }),
    me: () => http.get<StaffMember>('/auth/me'),
    logout: () => http.post<void>('/auth/logout'),
  },

  inbox: {
    list: () => http.get<InboxItem[]>('/inbox'),
    badges: () => http.get<Badges>('/inbox/badges'),
  },

  dashboard: {
    get: (period: Period) => http.get<Dashboard>('/dashboard', { period }),
  },

  orders: {
    list: (query: OrderQuery) => http.get<Page<Order>>('/orders', { ...query }),
    get: (id: ID) => http.get<Order>(`/orders/${id}`),
    counts: () => http.get<OrderCounts>('/orders/counts'),
    setStatus: (id: ID, status: OrderStatus, note = '') => http.post<Order>(`/orders/${id}/status`, { status, note }),
    markSeen: (id: ID) => http.post<Order>(`/orders/${id}/seen`),
    assignCourier: (id: ID, courierId: ID | null) => http.put<Order>(`/orders/${id}/courier`, { courierId }),
    update: (id: ID, patch: Pick<Partial<Order>, 'notes' | 'address'>) => http.patch<Order>(`/orders/${id}`, patch),
  },

  products: {
    list: (params: { line?: ProductLine; q?: string } = {}) => http.get<Product[]>('/products', params),
    get: (id: number) => http.get<Product>(`/products/${id}`),
    create: (input: ProductInput) => http.post<Product>('/products', input),
    update: (id: number, patch: Partial<ProductInput>) => http.patch<Product>(`/products/${id}`, patch),
    categories: () => http.get<Category[]>('/categories'),
    /** Multipart upload; returns the public URL to store in `image` or certificate pages. */
    upload: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return http.post<{ url: string }>('/uploads', form)
    },
  },

  stock: {
    movements: (params: { productId?: number; reason?: StockReason; page?: number; pageSize?: number } = {}) =>
      http.get<Page<StockMovement>>('/stock/movements', params),
    adjust: (input: { productId: number; delta: number; reason: StockReason; note: string }) =>
      http.post<StockMovement>('/stock/adjustments', input),
    forecast: () => http.get<StockForecast[]>('/stock/forecast'),
  },

  customers: {
    list: (params: ListQuery & { city?: string; tag?: string; sort?: 'lastOrderAt' | 'totalSpent' | 'ordersCount' } = {}) =>
      http.get<Page<Customer>>('/customers', { ...params }),
    get: (id: ID) => http.get<Customer>(`/customers/${id}`),
    orders: (id: ID) => http.get<Order[]>(`/customers/${id}/orders`),
    update: (id: ID, patch: Pick<Partial<Customer>, 'notes' | 'tags'>) => http.patch<Customer>(`/customers/${id}`, patch),
  },

  promos: {
    list: () => http.get<Promo[]>('/promos'),
    create: (input: Omit<Promo, 'id' | 'used'>) => http.post<Promo>('/promos', input),
    update: (id: ID, patch: Partial<Omit<Promo, 'id'>>) => http.patch<Promo>(`/promos/${id}`, patch),
    remove: (id: ID) => http.delete<void>(`/promos/${id}`),
  },

  consultations: {
    list: (params: { status?: ConsultationStatus | 'all' } = {}) => http.get<Consultation[]>('/consultations', params),
    update: (id: ID, patch: Pick<Partial<Consultation>, 'status' | 'note'>) => http.patch<Consultation>(`/consultations/${id}`, patch),
  },

  reviews: {
    list: (params: { status?: ReviewStatus | 'all' } = {}) => http.get<Review[]>('/reviews', params),
    setStatus: (id: ID, status: ReviewStatus) => http.patch<Review>(`/reviews/${id}`, { status }),
  },

  content: {
    get: () => http.get<SiteContent>('/content'),
    update: (patch: Partial<Omit<SiteContent, 'certificates' | 'updatedAt'>>) => http.put<SiteContent>('/content', patch),
    saveCertificate: (cert: Certificate) => http.put<Certificate>(`/content/certificates/${cert.id}`, cert),
    removeCertificate: (id: ID) => http.delete<void>(`/content/certificates/${id}`),
  },

  analytics: {
    get: (period: Period) => http.get<Analytics>('/analytics', { period }),
  },

  pharmacies: {
    list: () => http.get<Pharmacy[]>('/pharmacies'),
    save: (pharmacy: Omit<Pharmacy, 'id'> & { id?: ID }) =>
      pharmacy.id ? http.put<Pharmacy>(`/pharmacies/${pharmacy.id}`, pharmacy) : http.post<Pharmacy>('/pharmacies', pharmacy),
    setStock: (id: ID, productId: number, qty: number) => http.put<Pharmacy>(`/pharmacies/${id}/stock/${productId}`, { qty }),
  },

  bonus: {
    reps: () => http.get<Rep[]>('/reps'),
    saveRep: (rep: Omit<Rep, 'id' | 'joinedAt'> & { id?: ID }) =>
      rep.id ? http.put<Rep>(`/reps/${rep.id}`, rep) : http.post<Rep>('/reps', rep),
    summaries: () => http.get<RepSummary[]>('/reps/summary'),
    allocations: () => http.get<Allocation[]>('/allocations'),
    allocate: (input: { repId: ID; productId: number; qty: number }) => http.post<Allocation>('/allocations', input),
    sales: (params: { repId?: ID } = {}) => http.get<RepSale[]>('/rep-sales', params),
    bonuses: (params: { status?: BonusStatus | 'all'; repId?: ID } = {}) => http.get<Bonus[]>('/bonuses', params),
    /** Marks every pending bonus of these reps as paid. */
    payout: (repIds: ID[]) => http.post<{ paid: number; amount: number }>('/bonuses/payout', { repIds }),
  },

  couriers: {
    list: () => http.get<Courier[]>('/couriers'),
    save: (courier: Omit<Courier, 'id'> & { id?: ID }) =>
      courier.id ? http.put<Courier>(`/couriers/${courier.id}`, courier) : http.post<Courier>('/couriers', courier),
  },

  staff: {
    list: () => http.get<StaffMember[]>('/staff'),
    save: (member: Omit<StaffMember, 'id' | 'createdAt' | 'lastSeenAt'> & { id?: ID }) =>
      member.id ? http.put<StaffMember>(`/staff/${member.id}`, member) : http.post<StaffMember>('/staff', member),
    resetPassword: (id: ID) => http.post<{ sent: boolean }>(`/staff/${id}/reset-password`),
  },

  activity: {
    list: (params: ListQuery & { entity?: ActivityEntry['entity'] | 'all'; userId?: ID } = {}) =>
      http.get<Page<ActivityEntry>>('/activity', { ...params }),
  },

  settings: {
    get: () => http.get<Settings>('/settings'),
    update: (patch: Partial<Settings>) => http.put<Settings>('/settings', patch),
    testTelegram: () => http.post<{ ok: boolean }>('/settings/telegram/test'),
  },

  search: (q: string) => http.get<SearchHit[]>('/search', { q }),

  exports: {
    /** Excel (.xlsx) downloads. */
    orders: (query: OrderQuery) => http.download('/exports/orders.xlsx', { ...query }),
    sales: (period: Period) => http.download('/exports/sales.xlsx', { period }),
    stock: () => http.download('/exports/stock.xlsx'),
    customers: () => http.download('/exports/customers.xlsx'),
  },
}

export type Api = typeof httpApi
