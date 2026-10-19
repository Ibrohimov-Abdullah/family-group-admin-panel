/**
 * Family Group admin — API data contract.
 *
 * Every screen reads and writes these shapes only, through `src/api/index.ts`.
 * The backend returns the same JSON; field names are camelCase, money is an
 * integer in so'm (UZS), timestamps are ISO-8601 strings in UTC.
 * docs/API.md lists the endpoint for every call.
 */

/** Text that exists in both interface languages. */
export interface Localized {
  uz: string
  ru: string
}

export type Lang = keyof Localized
export type ID = string
export type ISODate = string

/* ---------------------------------------------------------------- staff */

export type Role = 'owner' | 'manager' | 'operator' | 'bonus'

export interface StaffMember {
  id: ID
  name: string
  email: string
  phone: string
  role: Role
  /** Two-step verification enabled (always on for owners). */
  twoFactor: boolean
  active: boolean
  lastSeenAt: ISODate | null
  createdAt: ISODate
}

export interface Session {
  token: string
  user: StaffMember
}

/** Step one of login: either a session, or a ticket for the 2-step code. */
export type LoginResult =
  | { status: 'ok'; session: Session }
  | { status: '2fa'; ticket: string; phoneHint: string }

/* ------------------------------------------------------------- catalog */

export type ProductLine = 'supplement' | 'cosmetic'
export type Badge = 'new' | 'best' | 'pop' | 'prem' | null

export interface Category {
  id: number
  line: ProductLine
  name: Localized
}

export interface Ingredient {
  name: Localized
  amount: string
}

export interface Product {
  id: number
  line: ProductLine
  sku: string
  name: Localized
  /** Dose and pack ("1000 mg · 60 kapsula") or, for cosmetics, the kind. */
  subtitle: Localized
  categoryId: number
  price: number
  /** Discounted price while a sale runs; null when there is no sale. */
  salePrice: number | null
  saleEndsAt: ISODate | null
  badge: Badge
  image: string
  description: Localized
  usage: Localized
  howToTake: Localized
  ingredients: Ingredient[]
  /** Shown on the website. Hidden products keep their data and history. */
  visible: boolean
  stock: number
  /** Stock at or below this number raises a low-stock alert. */
  lowStockAt: number
  /** Bonus paid to a representative per unit sold (bonus program). */
  bonusPerUnit: number
  createdAt: ISODate
  updatedAt: ISODate
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stock'> & { stock?: number }

/* --------------------------------------------------------------- orders */

export type OrderStatus = 'new' | 'confirmed' | 'packed' | 'shipping' | 'delivered' | 'cancelled'
export type PaymentMethod = 'payme' | 'click' | 'card'
export type PaymentStatus = 'pending' | 'paid' | 'refunded'
export type OrderSource = 'website' | 'phone' | 'telegram'

export interface OrderItem {
  productId: number
  name: Localized
  image: string
  price: number
  qty: number
}

export interface Address {
  city: string
  street: string
  apt: string
  zip: string
  /** Delivery point picked on the website map, if any. */
  lat: number | null
  lon: number | null
  note: string
}

export interface OrderEvent {
  at: ISODate
  status: OrderStatus
  by: string
  note: string
}

export interface Order {
  id: ID
  number: string
  createdAt: ISODate
  status: OrderStatus
  source: OrderSource
  customerId: ID
  customerName: string
  customerPhone: string
  address: Address
  items: OrderItem[]
  subtotal: number
  delivery: number
  discount: number
  total: number
  promoCode: string | null
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  /** Delivery slot chosen at checkout (0 = fastest). */
  slot: number
  courierId: ID | null
  history: OrderEvent[]
  notes: string
  /** First time a staff member opened the order; null keeps it "lit" as unseen. */
  seenAt: ISODate | null
}

export interface OrderQuery {
  q?: string
  status?: OrderStatus | 'all' | 'open'
  city?: string
  payment?: PaymentMethod | 'all'
  from?: ISODate
  to?: ISODate
  courierId?: ID
  page?: number
  pageSize?: number
  sort?: 'createdAt' | 'total'
  dir?: 'asc' | 'desc'
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/* ------------------------------------------------------------ customers */

export interface Customer {
  id: ID
  name: string
  phone: string
  city: string
  ordersCount: number
  totalSpent: number
  firstOrderAt: ISODate
  lastOrderAt: ISODate
  tags: string[]
  notes: string
}

/* ---------------------------------------------------------------- stock */

export type StockReason = 'order' | 'restock' | 'adjustment' | 'return' | 'writeoff' | 'allocation'

export interface StockMovement {
  id: ID
  productId: number
  delta: number
  balance: number
  reason: StockReason
  ref: string
  by: string
  at: ISODate
  note: string
}

export interface StockForecast {
  productId: number
  stock: number
  /** Average units sold per day over the last 30 days. */
  dailyRate: number
  /** Days until stock runs out at that rate; null when nothing sells. */
  daysLeft: number | null
}

/* ----------------------------------------------------------- promotions */

export type PromoType = 'percent' | 'fixed' | 'free_delivery'

export interface Promo {
  id: ID
  code: string
  type: PromoType
  /** Percent (1–90) or so'm amount; ignored for free delivery. */
  value: number
  minOrder: number
  startsAt: ISODate
  endsAt: ISODate | null
  usageLimit: number | null
  used: number
  active: boolean
}

export interface DeliverySettings {
  freeFrom: number
  fee: number
  homeCity: string
  homeCityDays: string
  otherCitiesDays: string
}

/* -------------------------------------------------------- consultations */

export type ConsultationStatus = 'new' | 'called' | 'no_answer' | 'done'
export type ConsultationChannel = 'call' | 'whatsapp' | 'telegram'

export interface Consultation {
  id: ID
  createdAt: ISODate
  name: string
  phone: string
  channel: ConsultationChannel
  productId: number | null
  page: string
  status: ConsultationStatus
  note: string
  handledBy: string | null
}

/* -------------------------------------------------------------- reviews */

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface Review {
  id: ID
  createdAt: ISODate
  name: string
  city: string
  productId: number
  rating: number
  text: string
  /** Written permission to publish; without it a review cannot be approved. */
  consent: boolean
  consentRef: string
  status: ReviewStatus
}

/* -------------------------------------------------------------- content */

export interface Certificate {
  id: ID
  title: Localized
  number: string
  issuedBy: string
  validUntil: ISODate | null
  pdf: string | null
  pages: string[]
}

export interface SiteContent {
  heroProductIds: number[]
  quote: Localized
  aboutTitle: Localized
  aboutText: Localized
  videoId: string
  contacts: {
    phone: string
    telegram: string
    whatsapp: string
    instagram: string
    youtube: string
    email: string
    address: Localized
    landmark: Localized
    hours: Localized
    lat: number
    lon: number
  }
  certificates: Certificate[]
  updatedAt: ISODate
}

/* ------------------------------------------------------------ analytics */

export type Period = '7d' | '30d' | '90d'

export interface KpiValue {
  value: number
  /** Same metric over the previous period of equal length. */
  previous: number
  /** One point per day, oldest first. */
  series: number[]
}

export interface Dashboard {
  period: Period
  revenue: KpiValue
  orders: KpiValue
  averageOrder: KpiValue
  newCustomers: KpiValue
  repeatShare: number
  queue: {
    newOrders: number
    toPack: number
    shipping: number
    consultations: number
    lowStock: number
    pendingReviews: number
    expiringCertificates: number
  }
  revenueByDay: { date: ISODate; revenue: number; orders: number }[]
  statusCounts: Record<OrderStatus, number>
  paymentSplit: Record<PaymentMethod, number>
}

export interface ProductSales {
  productId: number
  units: number
  revenue: number
  /** Units per day, oldest first, for sparklines. */
  series: number[]
}

export interface CitySales {
  city: string
  lat: number
  lon: number
  orders: number
  revenue: number
}

export interface Analytics {
  period: Period
  products: ProductSales[]
  cities: CitySales[]
  categories: { categoryId: number; revenue: number }[]
  lines: Record<ProductLine, number>
  newVsRepeat: { date: ISODate; new: number; repeat: number }[]
}

/* ------------------------------------------------------ pharmacy network */

export interface Pharmacy {
  id: ID
  name: string
  city: string
  address: string
  lat: number
  lon: number
  phone: string
  manager: string
  active: boolean
  /** Real company pharmacy (from the certificates) vs. a partner point. */
  own: boolean
  stock: { productId: number; qty: number }[]
}

/* -------------------------------------------------------- bonus program */

export interface Rep {
  id: ID
  name: string
  phone: string
  city: string
  pharmacyId: ID | null
  active: boolean
  joinedAt: ISODate
}

export interface Allocation {
  id: ID
  repId: ID
  productId: number
  qty: number
  at: ISODate
  by: string
}

export interface RepSale {
  id: ID
  repId: ID
  productId: number
  qty: number
  bonus: number
  pharmacyId: ID | null
  customerName: string
  at: ISODate
}

export type BonusStatus = 'pending' | 'paid'

export interface Bonus {
  id: ID
  repId: ID
  saleId: ID
  amount: number
  status: BonusStatus
  at: ISODate
  paidAt: ISODate | null
}

/** Per-rep summary used by the reps table and payouts. */
export interface RepSummary {
  repId: ID
  allocated: number
  sold: number
  onHand: number
  pending: number
  paid: number
}

/* ------------------------------------------------------------- delivery */

export interface Courier {
  id: ID
  name: string
  phone: string
  city: string
  vehicle: string
  active: boolean
}

/* ---------------------------------------------------------- activity log */

export interface ActivityEntry {
  id: ID
  at: ISODate
  userId: ID
  userName: string
  role: Role
  action: string
  entity: 'order' | 'product' | 'stock' | 'customer' | 'promo' | 'consultation' | 'review' | 'content' | 'pharmacy' | 'rep' | 'bonus' | 'courier' | 'staff' | 'settings' | 'auth'
  entityId: string
  summary: string
}

/* ------------------------------------------------------------- settings */

export interface Settings {
  shopName: string
  legalName: string
  inn: string
  supportPhone: string
  telegram: {
    connected: boolean
    groupName: string
    events: Record<'newOrder' | 'consultation' | 'lowStock' | 'review', boolean>
  }
  delivery: DeliverySettings
  lowStockDefault: number
  certificateWarnDays: number
}

/* --------------------------------------------------------------- search */

export interface SearchHit {
  kind: 'order' | 'product' | 'customer' | 'pharmacy' | 'rep'
  id: string
  title: string
  subtitle: string
}

/* ---------------------------------------------------------------- inbox */

export type InboxKind = 'order' | 'consultation' | 'stock' | 'review' | 'certificate'

/** One row of the home queue: anything that needs a person. */
export interface InboxItem {
  kind: InboxKind
  id: string
  title: string
  at: ISODate
  /** Unseen / unhandled: stays highlighted until someone opens or handles it. */
  lit: boolean
  severity: 'normal' | 'warning' | 'critical'
  amount?: number
  /** Kind-specific facts the row shows (each kind fills its own). */
  meta: {
    status?: string
    city?: string
    units?: number
    channel?: ConsultationChannel
    productId?: number | null
    stock?: number
    daysLeft?: number | null
    rating?: number
    consent?: boolean
    validUntil?: ISODate | null
  }
}

export interface OrderCounts {
  byStatus: Record<OrderStatus, number>
  unseen: number
}

export interface Badges {
  orders: number
  consultations: number
  reviews: number
  stock: number
}
