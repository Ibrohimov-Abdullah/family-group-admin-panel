/**
 * In-browser demo backend. Implements the full `Api` contract (src/api/http.ts)
 * against a generated database kept in localStorage, with small delays so the
 * UI's loading states are real. Not used once VITE_API_URL is set.
 */
import type { Api } from '../http'
import { ApiError } from '../client'
import { buildDatabase, DB_VERSION, type DB } from './seed'
import { buildXlsx, type Cell } from '../../lib/xlsx'
import type {
  ActivityEntry, Analytics, Badges, Bonus, Customer, Dashboard, InboxItem, KpiValue, Order,
  OrderCounts, OrderQuery, OrderStatus, Page, PaymentMethod, Period, Pharmacy, Product, ProductLine,
  RepSummary, SearchHit, Session, StaffMember, StockForecast, StockMovement,
} from '../types'

const DB_KEY = 'fg_admin_demo_db'
const SESSION_KEY = 'fg_admin_demo_sessions'
const DAY = 86_400_000
const STATUSES: OrderStatus[] = ['new', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled']

/* ------------------------------------------------------------ storage */

let db: DB = load()

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      // Keep the demo current: regenerate when the version changes or the day turns over.
      const sameDay = new Date(parsed.seededAt).toDateString() === new Date().toDateString()
      if (parsed.version === DB_VERSION && sameDay) return parsed
    }
  } catch { /* fall through to a fresh database */ }
  const fresh = buildDatabase()
  persist(fresh)
  return fresh
}

function persist(data: DB = db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(data)) } catch { /* quota or private mode: keep in memory */ }
}

export function resetDemoData() {
  db = buildDatabase()
  persist()
}

function sessions(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}') } catch { return {} }
}
function saveSessions(map: Record<string, string>) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(map)) } catch { /* ignore */ }
}

/* ------------------------------------------------------------- helpers */

const wait = (ms = 160 + Math.random() * 220) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = <T,>(value: T): T => structuredClone(value)

async function respond<T>(fn: () => T): Promise<T> {
  await wait()
  const result = fn()
  persist()
  return clone(result)
}

function currentUser(): StaffMember {
  const token = (() => { try { return localStorage.getItem('fg_admin_token') } catch { return null } })()
  const staffId = token ? sessions()[token] : undefined
  const user = db.staff.find((s) => s.id === staffId)
  if (!user) throw new ApiError(401, 'unauthorized')
  return user
}

function log(action: string, entity: ActivityEntry['entity'], entityId: string, summary: string) {
  let user: StaffMember
  try { user = currentUser() } catch { return }
  db.activity.unshift({
    id: `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(), userId: user.id, userName: user.name, role: user.role, action, entity, entityId, summary,
  })
}

function paginate<T>(items: T[], page = 1, pageSize = 20): Page<T> {
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}

const find = <T extends { id: unknown }>(list: T[], id: unknown, label: string): T => {
  const item = list.find((x) => x.id === id)
  if (!item) throw new ApiError(404, `${label} not found`)
  return item
}

const productById = (id: number) => find(db.products, id, 'product')
const norm = (s: string) => s.toLowerCase().replace(/[‘’ʻʼ`]/g, "'")
const days = (period: Period) => (period === '7d' ? 7 : period === '30d' ? 30 : 90)
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

function filterOrders(query: OrderQuery): Order[] {
  const q = norm(query.q?.trim() ?? '')
  const digits = q.replace(/\D/g, '')
  let list = db.orders.filter((o) => {
    if (query.status === 'open') { if (['delivered', 'cancelled'].includes(o.status)) return false }
    else if (query.status && query.status !== 'all' && o.status !== query.status) return false
    if (query.city && o.address.city !== query.city) return false
    if (query.payment && query.payment !== 'all' && o.paymentMethod !== query.payment) return false
    if (query.courierId && o.courierId !== query.courierId) return false
    if (query.from && o.createdAt < query.from) return false
    if (query.to && o.createdAt > query.to) return false
    if (q) {
      const hay = norm(`${o.number} ${o.customerName} ${o.address.city} ${o.address.street}`)
      const phoneHit = digits.length >= 3 && o.customerPhone.replace(/\D/g, '').includes(digits)
      if (!hay.includes(q) && !phoneHit) return false
    }
    return true
  })
  if (query.sort === 'total') list = [...list].sort((a, b) => a.total - b.total)
  if ((query.dir ?? 'desc') === 'desc') list = query.sort === 'total' ? list.reverse() : list
  else if (query.sort !== 'total') list = [...list].reverse()
  return list
}

/** Revenue counts orders that were not cancelled. */
const counted = (o: Order) => o.status !== 'cancelled'

function series(fromT: number, n: number, value: (dayStart: number) => number): number[] {
  return Array.from({ length: n }, (_, i) => value(fromT + i * DAY))
}

function kpi(n: number, metric: (from: number, to: number) => number, perDay: (dayStart: number) => number): KpiValue {
  const today = startOfDay(Date.now())
  const from = today - (n - 1) * DAY
  return { value: metric(from, Date.now()), previous: metric(from - n * DAY, from), series: series(from, n, perDay) }
}

function ordersBetween(from: number, to: number) {
  return db.orders.filter((o) => { const t = Date.parse(o.createdAt); return t >= from && t < to })
}

function forecast(): StockForecast[] {
  const since = Date.now() - 30 * DAY
  const sold = new Map<number, number>()
  for (const o of db.orders) {
    if (!counted(o) || Date.parse(o.createdAt) < since) continue
    for (const it of o.items) sold.set(it.productId, (sold.get(it.productId) ?? 0) + it.qty)
  }
  return db.products.map((p) => {
    const dailyRate = +((sold.get(p.id) ?? 0) / 30).toFixed(2)
    return { productId: p.id, stock: p.stock, dailyRate, daysLeft: dailyRate > 0 ? Math.floor(p.stock / dailyRate) : null }
  })
}

const expiringCertificates = () => {
  const limit = Date.now() + db.settings.certificateWarnDays * DAY
  return db.content.certificates.filter((c) => c.validUntil && Date.parse(c.validUntil) < limit)
}

function repSummaries(): RepSummary[] {
  return db.reps.map((rep) => {
    const allocated = db.allocations.filter((a) => a.repId === rep.id).reduce((s, a) => s + a.qty, 0)
    const sold = db.repSales.filter((s) => s.repId === rep.id).reduce((s, x) => s + x.qty, 0)
    const bonuses = db.bonuses.filter((b) => b.repId === rep.id)
    return {
      repId: rep.id, allocated, sold, onHand: allocated - sold,
      pending: bonuses.filter((b) => b.status === 'pending').reduce((s, b) => s + b.amount, 0),
      paid: bonuses.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0),
    }
  })
}

const L = (text: { uz: string }) => text.uz

/* ----------------------------------------------------------------- api */

export const mockApi: Api = {
  auth: {
    login: (login, password) => respond(() => {
      const key = login.trim().toLowerCase()
      const user = db.staff.find((s) => s.email.toLowerCase() === key || s.phone.replace(/\D/g, '') === key.replace(/\D/g, ''))
      if (!user || db.passwords[user.email] !== password) throw new ApiError(400, 'invalid_credentials')
      if (!user.active) throw new ApiError(403, 'inactive')
      if (user.twoFactor) {
        const ticket = `t_${user.id}_${Date.now()}`
        return { status: '2fa' as const, ticket, phoneHint: `${user.phone.slice(0, 8)} ••• •• ${user.phone.slice(-2)}` }
      }
      return { status: 'ok' as const, session: openSession(user) }
    }),
    verify: (ticket, code) => respond(() => {
      const staffId = ticket.split('_').slice(1, 3).join('_')
      const user = db.staff.find((s) => s.id === staffId)
      if (!user) throw new ApiError(400, 'expired')
      if (code.replace(/\D/g, '') !== '123456') throw new ApiError(400, 'invalid_code')
      return openSession(user)
    }),
    me: () => respond(() => currentUser()),
    logout: () => respond(() => {
      try {
        const token = localStorage.getItem('fg_admin_token')
        const map = sessions()
        if (token) { delete map[token]; saveSessions(map) }
      } catch { /* ignore */ }
    }),
  },

  inbox: {
    list: () => respond(() => {
      const items: InboxItem[] = []
      for (const o of db.orders) {
        if (!['new', 'confirmed', 'packed'].includes(o.status)) continue
        items.push({
          kind: 'order', id: o.id, title: `${o.number} · ${o.customerName}`,
          meta: { status: o.status, city: o.address.city, units: o.items.reduce((s, i) => s + i.qty, 0) },
          at: o.createdAt, lit: o.seenAt === null, severity: o.status === 'new' ? 'warning' : 'normal', amount: o.total,
        })
      }
      for (const c of db.consultations) {
        if (c.status !== 'new' && c.status !== 'no_answer') continue
        items.push({
          kind: 'consultation', id: c.id, title: c.name || c.phone, meta: { channel: c.channel, productId: c.productId, status: c.status },
          at: c.createdAt, lit: c.status === 'new', severity: c.status === 'new' ? 'warning' : 'normal',
        })
      }
      const today = new Date().toISOString()
      for (const f of forecast()) {
        const p = productById(f.productId)
        if (p.stock > p.lowStockAt) continue
        items.push({
          kind: 'stock', id: String(p.id), title: L(p.name), meta: { stock: p.stock, daysLeft: f.daysLeft, productId: p.id },
          at: today, lit: true, severity: p.stock === 0 ? 'critical' : 'warning',
        })
      }
      for (const r of db.reviews) {
        if (r.status !== 'pending') continue
        items.push({ kind: 'review', id: r.id, title: r.name, meta: { productId: r.productId, rating: r.rating, consent: r.consent }, at: r.createdAt, lit: true, severity: 'normal' })
      }
      for (const c of expiringCertificates()) {
        items.push({ kind: 'certificate', id: c.id, title: L(c.title), meta: { validUntil: c.validUntil }, at: today, lit: true, severity: 'warning' })
      }
      // Lit first; within each group people-facing work (orders, call requests) leads alerts.
      const rank: Record<InboxItem['kind'], number> = { order: 0, consultation: 0, review: 1, stock: 2, certificate: 3 }
      return items.sort((a, b) => Number(!a.lit) - Number(!b.lit) || rank[a.kind] - rank[b.kind] || b.at.localeCompare(a.at))
    }),
    badges: () => respond<Badges>(() => ({
      orders: db.orders.filter((o) => o.status === 'new').length,
      consultations: db.consultations.filter((c) => c.status === 'new').length,
      reviews: db.reviews.filter((r) => r.status === 'pending').length,
      stock: db.products.filter((p) => p.stock <= p.lowStockAt).length,
    })),
  },

  dashboard: {
    get: (period) => respond<Dashboard>(() => {
      const n = days(period)
      const revenue = (from: number, to: number) => ordersBetween(from, to).filter(counted).reduce((s, o) => s + o.total, 0)
      const count = (from: number, to: number) => ordersBetween(from, to).filter(counted).length
      const newCustomers = (from: number, to: number) => db.customers.filter((c) => { const t = Date.parse(c.firstOrderAt); return t >= from && t < to }).length
      const avg = (from: number, to: number) => { const c = count(from, to); return c ? Math.round(revenue(from, to) / c) : 0 }
      const today = startOfDay(Date.now())
      const from = today - (n - 1) * DAY
      const inPeriod = ordersBetween(from, Date.now())
      const repeatOrders = inPeriod.filter((o) => Date.parse(db.customers.find((c) => c.id === o.customerId)?.firstOrderAt ?? o.createdAt) < Date.parse(o.createdAt) - 60_000)
      const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, inPeriod.filter((o) => o.status === s).length])) as Record<OrderStatus, number>
      const methods: PaymentMethod[] = ['payme', 'click', 'card']
      const paymentSplit = Object.fromEntries(methods.map((m) => [m, inPeriod.filter((o) => counted(o) && o.paymentMethod === m).reduce((s, o) => s + o.total, 0)])) as Record<PaymentMethod, number>
      return {
        period,
        revenue: kpi(n, revenue, (d) => revenue(d, d + DAY)),
        orders: kpi(n, count, (d) => count(d, d + DAY)),
        averageOrder: kpi(n, avg, (d) => avg(d, d + DAY)),
        newCustomers: kpi(n, newCustomers, (d) => newCustomers(d, d + DAY)),
        repeatShare: inPeriod.length ? repeatOrders.length / inPeriod.length : 0,
        queue: {
          newOrders: db.orders.filter((o) => o.status === 'new').length,
          toPack: db.orders.filter((o) => o.status === 'confirmed').length,
          shipping: db.orders.filter((o) => o.status === 'shipping' || o.status === 'packed').length,
          consultations: db.consultations.filter((c) => c.status === 'new').length,
          lowStock: db.products.filter((p) => p.stock <= p.lowStockAt).length,
          pendingReviews: db.reviews.filter((r) => r.status === 'pending').length,
          expiringCertificates: expiringCertificates().length,
        },
        revenueByDay: Array.from({ length: n }, (_, i) => {
          const d = from + i * DAY
          return { date: new Date(d).toISOString(), revenue: revenue(d, d + DAY), orders: count(d, d + DAY) }
        }),
        statusCounts,
        paymentSplit,
      }
    }),
  },

  orders: {
    list: (query) => respond(() => paginate(filterOrders(query), query.page, query.pageSize)),
    get: (id) => respond(() => find(db.orders, id, 'order')),
    counts: () => respond<OrderCounts>(() => ({
      byStatus: Object.fromEntries(STATUSES.map((s) => [s, db.orders.filter((o) => o.status === s).length])) as Record<OrderStatus, number>,
      unseen: db.orders.filter((o) => o.seenAt === null).length,
    })),
    setStatus: (id, status, note = '') => respond(() => {
      const order = find(db.orders, id, 'order')
      const user = currentUser()
      const wasCounted = counted(order)
      order.status = status
      order.seenAt ??= new Date().toISOString()
      order.history.push({ at: new Date().toISOString(), status, by: user.name, note })
      if (status === 'cancelled' && wasCounted) {
        // put the goods back on the shelf
        for (const it of order.items) adjustStock(it.productId, it.qty, 'return', order.number, user.name, 'Bekor qilingan buyurtma')
        if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded'
      }
      if (status === 'delivered' && order.paymentStatus === 'pending') order.paymentStatus = 'paid'
      log(`order.${status}`, 'order', order.number, `${order.number} → ${status}${note ? ` (${note})` : ''}`)
      return order
    }),
    markSeen: (id) => respond(() => {
      const order = find(db.orders, id, 'order')
      order.seenAt ??= new Date().toISOString()
      return order
    }),
    assignCourier: (id, courierId) => respond(() => {
      const order = find(db.orders, id, 'order')
      order.courierId = courierId
      const courier = db.couriers.find((c) => c.id === courierId)
      log('order.courier', 'order', order.number, `${order.number}: ${courier ? courier.name : '—'}`)
      return order
    }),
    update: (id, patch) => respond(() => {
      const order = find(db.orders, id, 'order')
      Object.assign(order, patch)
      log('order.update', 'order', order.number, `${order.number}: izoh/manzil`)
      return order
    }),
  },

  products: {
    list: (params = {}) => respond(() => {
      const q = norm(params.q?.trim() ?? '')
      return db.products.filter((p) => (!params.line || p.line === params.line) && (!q || norm(`${p.name.uz} ${p.name.ru} ${p.sku}`).includes(q)))
    }),
    get: (id) => respond(() => productById(id)),
    create: (input) => respond(() => {
      const now = new Date().toISOString()
      const product: Product = { ...input, id: Math.max(...db.products.map((p) => p.id)) + 1, stock: input.stock ?? 0, createdAt: now, updatedAt: now }
      db.products.push(product)
      log('product.create', 'product', String(product.id), `${product.name.uz}: yangi mahsulot`)
      return product
    }),
    update: (id, patch) => respond(() => {
      const product = productById(id)
      const before = { price: product.price, visible: product.visible, salePrice: product.salePrice }
      Object.assign(product, patch, { updatedAt: new Date().toISOString() })
      const parts: string[] = []
      if (patch.price !== undefined && patch.price !== before.price) parts.push(`narx ${before.price} → ${patch.price}`)
      if (patch.visible !== undefined && patch.visible !== before.visible) parts.push(patch.visible ? "saytda ko'rinadi" : 'saytdan yashirildi')
      if (patch.salePrice !== undefined && patch.salePrice !== before.salePrice) parts.push(patch.salePrice ? `aksiya ${patch.salePrice}` : 'aksiya tugatildi')
      log('product.update', 'product', String(id), `${product.name.uz}: ${parts.join(', ') || "ma'lumotlar yangilandi"}`)
      return product
    }),
    categories: () => respond(() => db.categories),
    upload: (file) => respond(() => ({ url: URL.createObjectURL(file) })),
  },

  stock: {
    movements: (params = {}) => respond(() => paginate(
      db.movements.filter((m) => (params.productId === undefined || m.productId === params.productId) && (!params.reason || m.reason === params.reason)),
      params.page, params.pageSize ?? 25,
    )),
    adjust: (input) => respond(() => {
      const user = currentUser()
      const movement = adjustStock(input.productId, input.delta, input.reason, input.reason === 'restock' ? `Kirim №${Math.floor(2000 + Math.random() * 999)}` : 'Qo‘lda', user.name, input.note)
      log('stock.adjust', 'stock', String(input.productId), `${productById(input.productId).name.uz}: ${input.delta > 0 ? '+' : ''}${input.delta} (${input.reason})`)
      return movement
    }),
    forecast: () => respond(() => forecast()),
  },

  customers: {
    list: (params = {}) => respond(() => {
      const q = norm(params.q?.trim() ?? '')
      const digits = q.replace(/\D/g, '')
      let list = db.customers.filter((c) => {
        if (params.city && c.city !== params.city) return false
        if (params.tag && !c.tags.includes(params.tag)) return false
        if (q && !norm(c.name).includes(q) && !(digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits))) return false
        return true
      })
      const key = params.sort ?? 'lastOrderAt'
      list = [...list].sort((a, b) => key === 'lastOrderAt' ? b.lastOrderAt.localeCompare(a.lastOrderAt) : (b[key] as number) - (a[key] as number))
      return paginate(list, params.page, params.pageSize)
    }),
    get: (id) => respond(() => find(db.customers, id, 'customer')),
    orders: (id) => respond(() => db.orders.filter((o) => o.customerId === id)),
    update: (id, patch) => respond(() => {
      const customer = find(db.customers, id, 'customer')
      Object.assign(customer, patch)
      log('customer.update', 'customer', id, `${customer.name}: izoh/teglar`)
      return customer
    }),
  },

  promos: {
    list: () => respond(() => db.promos),
    create: (input) => respond(() => {
      if (db.promos.some((p) => p.code.toUpperCase() === input.code.toUpperCase())) throw new ApiError(409, 'duplicate_code')
      const promo = { ...input, code: input.code.toUpperCase(), id: `prm_${Date.now().toString(36)}`, used: 0 }
      db.promos.unshift(promo)
      log('promo.create', 'promo', promo.code, `Promokod ${promo.code} yaratildi`)
      return promo
    }),
    update: (id, patch) => respond(() => {
      const promo = find(db.promos, id, 'promo')
      Object.assign(promo, patch)
      log('promo.update', 'promo', promo.code, `Promokod ${promo.code} yangilandi`)
      return promo
    }),
    remove: (id) => respond(() => {
      const promo = find(db.promos, id, 'promo')
      db.promos = db.promos.filter((p) => p.id !== id)
      log('promo.delete', 'promo', promo.code, `Promokod ${promo.code} o'chirildi`)
    }),
  },

  consultations: {
    list: (params = {}) => respond(() => db.consultations.filter((c) => !params.status || params.status === 'all' || c.status === params.status)),
    update: (id, patch) => respond(() => {
      const item = find(db.consultations, id, 'consultation')
      Object.assign(item, patch)
      if (patch.status && patch.status !== 'new') item.handledBy = currentUser().name
      log('consultation.update', 'consultation', id, `${item.name || item.phone}: ${item.status}`)
      return item
    }),
  },

  reviews: {
    list: (params = {}) => respond(() => db.reviews.filter((r) => !params.status || params.status === 'all' || r.status === params.status)),
    setStatus: (id, status) => respond(() => {
      const review = find(db.reviews, id, 'review')
      if (status === 'approved' && !review.consent) throw new ApiError(422, 'no_consent')
      review.status = status
      log(`review.${status}`, 'review', id, `${review.name}: ${status}`)
      return review
    }),
  },

  content: {
    get: () => respond(() => db.content),
    update: (patch) => respond(() => {
      Object.assign(db.content, patch, { updatedAt: new Date().toISOString() })
      log('content.update', 'content', Object.keys(patch).join(','), `Sayt kontenti: ${Object.keys(patch).join(', ')}`)
      return db.content
    }),
    saveCertificate: (cert) => respond(() => {
      const index = db.content.certificates.findIndex((c) => c.id === cert.id)
      if (index >= 0) db.content.certificates[index] = cert
      else db.content.certificates.push(cert)
      log('content.certificate', 'content', cert.id, `Sertifikat: ${cert.title.uz}`)
      return cert
    }),
    removeCertificate: (id) => respond(() => {
      db.content.certificates = db.content.certificates.filter((c) => c.id !== id)
      log('content.certificate.delete', 'content', id, `Sertifikat o'chirildi`)
    }),
  },

  analytics: {
    get: (period) => respond<Analytics>(() => {
      const n = days(period)
      const from = startOfDay(Date.now()) - (n - 1) * DAY
      const list = ordersBetween(from, Date.now()).filter(counted)
      const units = new Map<number, number>(); const rev = new Map<number, number>(); const perDay = new Map<number, number[]>()
      for (const o of list) {
        const day = Math.floor((startOfDay(Date.parse(o.createdAt)) - from) / DAY)
        for (const it of o.items) {
          units.set(it.productId, (units.get(it.productId) ?? 0) + it.qty)
          rev.set(it.productId, (rev.get(it.productId) ?? 0) + it.qty * it.price)
          const arr = perDay.get(it.productId) ?? Array(n).fill(0)
          arr[day] += it.qty
          perDay.set(it.productId, arr)
        }
      }
      const cityMap = new Map<string, { orders: number; revenue: number }>()
      for (const o of list) {
        const c = cityMap.get(o.address.city) ?? { orders: 0, revenue: 0 }
        c.orders += 1; c.revenue += o.total
        cityMap.set(o.address.city, c)
      }
      const cityCoords: Record<string, [number, number]> = {
        Andijon: [40.7821, 72.3442], Namangan: [40.9983, 71.6726], "Farg'ona": [40.3864, 71.7864], Toshkent: [41.2995, 69.2401],
        Samarqand: [39.627, 66.975], Buxoro: [39.7747, 64.4286], Qarshi: [38.8606, 65.7847], Nukus: [42.4531, 59.6103],
        Navoiy: [40.0844, 65.3792], Jizzax: [40.125, 67.88], Guliston: [40.4897, 68.7842], Termiz: [37.2242, 67.2783],
        Urganch: [41.55, 60.6333], Xiva: [41.3783, 60.3639],
      }
      const lines: Record<ProductLine, number> = { supplement: 0, cosmetic: 0 }
      const cats = new Map<number, number>()
      for (const [pid, value] of rev) {
        const p = productById(pid)
        lines[p.line] += value
        cats.set(p.categoryId, (cats.get(p.categoryId) ?? 0) + value)
      }
      const newVsRepeat = Array.from({ length: n }, (_, i) => {
        const d = from + i * DAY
        const dayOrders = list.filter((o) => { const t = Date.parse(o.createdAt); return t >= d && t < d + DAY })
        const isNew = (o: Order) => (db.customers.find((c) => c.id === o.customerId)?.firstOrderAt ?? '') >= new Date(Date.parse(o.createdAt) - 60_000).toISOString()
        return { date: new Date(d).toISOString(), new: dayOrders.filter(isNew).length, repeat: dayOrders.filter((o) => !isNew(o)).length }
      })
      return {
        period,
        products: db.products.map((p) => ({ productId: p.id, units: units.get(p.id) ?? 0, revenue: rev.get(p.id) ?? 0, series: perDay.get(p.id) ?? Array(n).fill(0) }))
          .sort((a, b) => b.revenue - a.revenue),
        cities: [...cityMap.entries()].map(([city, v]) => ({ city, lat: cityCoords[city]?.[0] ?? 41, lon: cityCoords[city]?.[1] ?? 64, ...v })).sort((a, b) => b.revenue - a.revenue),
        categories: [...cats.entries()].map(([categoryId, revenue]) => ({ categoryId, revenue })).sort((a, b) => b.revenue - a.revenue),
        lines,
        newVsRepeat,
      }
    }),
  },

  pharmacies: {
    list: () => respond(() => db.pharmacies),
    save: (input) => respond(() => {
      if (input.id) {
        const pharmacy = find(db.pharmacies, input.id, 'pharmacy')
        Object.assign(pharmacy, input)
        log('pharmacy.update', 'pharmacy', pharmacy.id, `${pharmacy.name} yangilandi`)
        return pharmacy
      }
      const pharmacy: Pharmacy = { ...input, id: `phm_${Date.now().toString(36)}` }
      db.pharmacies.push(pharmacy)
      log('pharmacy.create', 'pharmacy', pharmacy.id, `${pharmacy.name} qo'shildi`)
      return pharmacy
    }),
    setStock: (id, productId, qty) => respond(() => {
      const pharmacy = find(db.pharmacies, id, 'pharmacy')
      const line = pharmacy.stock.find((s) => s.productId === productId)
      if (line) line.qty = qty
      else pharmacy.stock.push({ productId, qty })
      log('pharmacy.stock', 'pharmacy', id, `${pharmacy.name}: ${productById(productId).name.uz} = ${qty}`)
      return pharmacy
    }),
  },

  bonus: {
    reps: () => respond(() => db.reps),
    saveRep: (input) => respond(() => {
      if (input.id) {
        const rep = find(db.reps, input.id, 'rep')
        Object.assign(rep, input)
        log('rep.update', 'rep', rep.id, `${rep.name} yangilandi`)
        return rep
      }
      const rep = { ...input, id: `rep_${Date.now().toString(36)}`, joinedAt: new Date().toISOString() }
      db.reps.push(rep)
      log('rep.create', 'rep', rep.id, `${rep.name} qo'shildi`)
      return rep
    }),
    summaries: () => respond(() => repSummaries()),
    allocations: () => respond(() => db.allocations),
    allocate: (input) => respond(() => {
      const product = productById(input.productId)
      if (input.qty > product.stock) throw new ApiError(422, 'not_enough_stock')
      const user = currentUser()
      const allocation = { id: `alc_${Date.now().toString(36)}`, ...input, at: new Date().toISOString(), by: user.name }
      db.allocations.unshift(allocation)
      const rep = find(db.reps, input.repId, 'rep')
      adjustStock(input.productId, -input.qty, 'allocation', rep.name, user.name, 'Vakilga berildi')
      log('rep.allocate', 'rep', rep.id, `${rep.name}: ${product.name.uz} × ${input.qty}`)
      return allocation
    }),
    sales: (params = {}) => respond(() => db.repSales.filter((s) => !params.repId || s.repId === params.repId)),
    bonuses: (params = {}) => respond(() => db.bonuses.filter((b: Bonus) => (!params.status || params.status === 'all' || b.status === params.status) && (!params.repId || b.repId === params.repId))),
    payout: (repIds) => respond(() => {
      let paid = 0; let amount = 0
      const now = new Date().toISOString()
      for (const b of db.bonuses) {
        if (b.status === 'pending' && repIds.includes(b.repId)) { b.status = 'paid'; b.paidAt = now; paid += 1; amount += b.amount }
      }
      log('bonus.payout', 'bonus', repIds.join(','), `${repIds.length} vakilga ${amount} so'm bonus to'landi`)
      return { paid, amount }
    }),
  },

  couriers: {
    list: () => respond(() => db.couriers),
    save: (input) => respond(() => {
      if (input.id) {
        const courier = find(db.couriers, input.id, 'courier')
        Object.assign(courier, input)
        log('courier.update', 'courier', courier.id, `${courier.name} yangilandi`)
        return courier
      }
      const courier = { ...input, id: `cur_${Date.now().toString(36)}` }
      db.couriers.push(courier)
      log('courier.create', 'courier', courier.id, `${courier.name} qo'shildi`)
      return courier
    }),
  },

  staff: {
    list: () => respond(() => db.staff),
    save: (input) => respond(() => {
      if (input.id) {
        const member = find(db.staff, input.id, 'staff')
        Object.assign(member, input, { twoFactor: input.role === 'owner' ? true : input.twoFactor })
        log('staff.update', 'staff', member.id, `${member.name}: ${member.role}${member.active ? '' : ', faolsiz'}`)
        return member
      }
      if (db.staff.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) throw new ApiError(409, 'duplicate_email')
      const member: StaffMember = { ...input, id: `stf_${Date.now().toString(36)}`, twoFactor: input.role === 'owner' ? true : input.twoFactor, createdAt: new Date().toISOString(), lastSeenAt: null }
      db.staff.push(member)
      db.passwords[member.email] = 'FG-welcome-2026'
      log('staff.create', 'staff', member.id, `${member.name} (${member.role}) qo'shildi`)
      return member
    }),
    resetPassword: (id) => respond(() => {
      const member = find(db.staff, id, 'staff')
      log('staff.reset', 'staff', id, `${member.name}: parol tiklash havolasi yuborildi`)
      return { sent: true }
    }),
  },

  activity: {
    list: (params = {}) => respond(() => {
      const q = norm(params.q?.trim() ?? '')
      return paginate(db.activity.filter((a) =>
        (!params.entity || params.entity === 'all' || a.entity === params.entity) &&
        (!params.userId || a.userId === params.userId) &&
        (!q || norm(`${a.summary} ${a.userName} ${a.entityId}`).includes(q))), params.page, params.pageSize ?? 30)
    }),
  },

  settings: {
    get: () => respond(() => db.settings),
    update: (patch) => respond(() => {
      Object.assign(db.settings, patch)
      log('settings.update', 'settings', Object.keys(patch).join(','), `Sozlamalar: ${Object.keys(patch).join(', ')}`)
      return db.settings
    }),
    testTelegram: () => respond(() => ({ ok: db.settings.telegram.connected })),
  },

  search: (q) => respond(() => {
    const query = norm(q.trim())
    if (query.length < 2) return []
    const digits = query.replace(/\D/g, '')
    const hits: SearchHit[] = []
    for (const o of db.orders) {
      if (hits.length >= 6) break
      if (norm(`${o.number} ${o.customerName}`).includes(query) || (digits.length >= 4 && o.customerPhone.replace(/\D/g, '').includes(digits))) {
        hits.push({ kind: 'order', id: o.id, title: o.number, subtitle: `${o.customerName} · ${o.address.city}` })
      }
    }
    for (const p of db.products) {
      if (norm(`${p.name.uz} ${p.name.ru} ${p.sku}`).includes(query)) hits.push({ kind: 'product', id: String(p.id), title: p.name.uz, subtitle: p.sku })
    }
    let cust = 0
    for (const c of db.customers) {
      if (cust >= 5) break
      if (norm(c.name).includes(query) || (digits.length >= 4 && c.phone.replace(/\D/g, '').includes(digits))) { hits.push({ kind: 'customer', id: c.id, title: c.name, subtitle: `${c.phone} · ${c.city}` }); cust++ }
    }
    for (const ph of db.pharmacies) if (norm(`${ph.name} ${ph.city}`).includes(query)) hits.push({ kind: 'pharmacy', id: ph.id, title: ph.name, subtitle: ph.city })
    for (const rep of db.reps) if (norm(rep.name).includes(query)) hits.push({ kind: 'rep', id: rep.id, title: rep.name, subtitle: rep.city })
    return hits.slice(0, 18)
  }),

  exports: {
    orders: async (query) => {
      await wait()
      const rows: Cell[][] = filterOrders(query).map((o) => [
        o.number, new Date(o.createdAt).toLocaleString('uz-UZ'), o.status, o.customerName, o.customerPhone, o.address.city,
        `${o.address.street}${o.address.apt ? `, ${o.address.apt}` : ''}`, o.items.map((i) => `${i.name.uz} × ${i.qty}`).join('; '),
        o.subtotal, o.delivery, o.discount, o.total, o.paymentMethod, o.paymentStatus, o.promoCode ?? '',
      ])
      return buildXlsx('Buyurtmalar', ['Raqam', 'Sana', 'Holat', 'Mijoz', 'Telefon', 'Shahar', 'Manzil', 'Mahsulotlar', 'Summa', 'Yetkazish', 'Chegirma', 'Jami', "To'lov", "To'lov holati", 'Promokod'], rows)
    },
    sales: async (period) => {
      const data = await mockApi.analytics.get(period)
      const rows: Cell[][] = data.products.map((s) => {
        const p = productById(s.productId)
        return [p.sku, p.name.uz, p.line === 'supplement' ? 'Vitamin' : 'Kosmetika', s.units, s.revenue, p.stock]
      })
      return buildXlsx('Savdo', ['SKU', 'Mahsulot', "Yo'nalish", 'Sotildi (dona)', "Tushum (so'm)", 'Qoldiq'], rows)
    },
    stock: async () => {
      await wait()
      const f = new Map(forecast().map((x) => [x.productId, x]))
      return buildXlsx('Ombor', ['SKU', 'Mahsulot', 'Qoldiq', 'Kam qoldiq chegarasi', 'Kunlik sotuv', 'Yetadi (kun)', 'Narx'], db.products.map((p) => [
        p.sku, p.name.uz, p.stock, p.lowStockAt, f.get(p.id)?.dailyRate ?? 0, f.get(p.id)?.daysLeft ?? '', p.price,
      ]))
    },
    customers: async () => {
      await wait()
      return buildXlsx('Mijozlar', ['Ism', 'Telefon', 'Shahar', 'Buyurtmalar', "Jami xarid (so'm)", 'Birinchi buyurtma', 'Oxirgi buyurtma', 'Teglar'], db.customers.map((c: Customer) => [
        c.name, c.phone, c.city, c.ordersCount, c.totalSpent, c.firstOrderAt.slice(0, 10), c.lastOrderAt.slice(0, 10), c.tags.join(', '),
      ]))
    },
  },
}

function openSession(user: StaffMember): Session {
  const token = `demo_${user.id}_${Math.random().toString(36).slice(2)}`
  const map = sessions()
  map[token] = user.id
  saveSessions(map)
  user.lastSeenAt = new Date().toISOString()
  db.activity.unshift({ id: `act_${Date.now().toString(36)}`, at: new Date().toISOString(), userId: user.id, userName: user.name, role: user.role, action: 'auth.login', entity: 'auth', entityId: user.id, summary: user.twoFactor ? 'Kirish (2 bosqichli tasdiq)' : 'Kirish' })
  return { token, user }
}

function adjustStock(productId: number, delta: number, reason: StockMovement['reason'], ref: string, by: string, note: string): StockMovement {
  const product = productById(productId)
  const balance = Math.max(0, product.stock + delta)
  product.stock = balance
  product.updatedAt = new Date().toISOString()
  const movement: StockMovement = { id: `mov_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, productId, delta, balance, reason, ref, by, at: new Date().toISOString(), note }
  db.movements.unshift(movement)
  return movement
}
