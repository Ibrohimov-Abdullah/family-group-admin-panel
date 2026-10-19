/**
 * Demo database generator.
 *
 * Builds a believable 90 days of business around the REAL catalog (names,
 * prices, photos and certificates come from familygroup.store). Everything
 * else — customers, orders, pharmacies' partners, reps, staff — is invented
 * demo data, generated deterministically and labelled "Demo" in the UI.
 * Delete this folder once the backend is connected.
 */
import catalog from './seed/catalog.json'
import type {
  ActivityEntry, Allocation, Bonus, Category, Certificate, Consultation, Courier, Customer,
  Localized, Order, OrderEvent, OrderItem, OrderStatus, PaymentMethod, Pharmacy, Product, Promo,
  Rep, RepSale, Review, Role, Settings, SiteContent, StaffMember, StockMovement,
} from '../types'

export interface DB {
  version: number
  seededAt: string
  products: Product[]
  categories: Category[]
  orders: Order[]
  customers: Customer[]
  movements: StockMovement[]
  promos: Promo[]
  consultations: Consultation[]
  reviews: Review[]
  content: SiteContent
  pharmacies: Pharmacy[]
  reps: Rep[]
  allocations: Allocation[]
  repSales: RepSale[]
  bonuses: Bonus[]
  couriers: Courier[]
  staff: StaffMember[]
  passwords: Record<string, string>
  activity: ActivityEntry[]
  settings: Settings
}

export const DB_VERSION = 3

/* ----------------------------------------------------------- utilities */

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86_400_000

interface CatalogProduct {
  id: number; img: string; cat?: number; price: number; badge?: string; slug?: string; kind?: Localized
  name: Localized; dose?: Localized; desc: Localized; use: Localized; how: Localized
  actives?: { n: Localized; a: string }[]
}

const CITY_WEIGHTS: Record<string, number> = {
  "Andijon": 46, "Namangan": 11, "Farg'ona": 11, "Toshkent": 12, "Samarqand": 4, "Buxoro": 2,
  "Qarshi": 2, "Nukus": 1, "Navoiy": 2, "Jizzax": 2, "Guliston": 1, "Termiz": 2, "Urganch": 2, "Xiva": 1,
}

const STREETS = [
  "Navoiy shoh ko'chasi", "Bobur shoh ko'chasi", "Amir Temur ko'chasi", "Mashrab ko'chasi",
  "Cho'lpon ko'chasi", "Istiqlol ko'chasi", "Fitrat ko'chasi", "Bog'ishamol ko'chasi",
  "Jumabozor mahallasi", "Mustaqillik ko'chasi", "Yangi hayot ko'chasi", "Oltinko'l ko'chasi",
  "Bunyodkor ko'chasi", "Do'stlik ko'chasi", "Nurafshon ko'chasi", "Ipak yo'li ko'chasi",
]

const MALE = ['Aziz', 'Bobur', 'Doniyor', 'Eldor', 'Farrux', 'Jasur', 'Javlon', 'Sherzod', 'Otabek', 'Sardor',
  "Ulug'bek", 'Rustam', 'Nodir', 'Akmal', 'Islom', 'Temur', 'Behruz', 'Shohruh', 'Jahongir', 'Komil']
const FEMALE = ['Dilnoza', 'Gulnora', 'Madina', 'Nilufar', 'Shahnoza', 'Zarina', 'Malika', 'Sevara', 'Dilfuza',
  'Kamola', 'Mohira', 'Nigora', 'Feruza', 'Gulsanam', 'Munisa', 'Laylo', 'Hilola', 'Mavluda', 'Zuhra', 'Yulduz']
const SURNAMES = ['Karimov', 'Rahimov', 'Yusupov', 'Tursunov', 'Abdullayev', 'Ergashev', 'Xolmatov', 'Mirzayev',
  'Nazarov', 'Sobirov', 'Qodirov', 'Aliyev', 'Hasanov', 'Umarov', 'Islomov', 'Saidov', "Jo'rayev", 'Normatov',
  'Botirov', 'Usmonov']

/** Relative popularity of each product id (higher sells more). */
const POPULARITY: Record<number, number> = {
  1: 14, 2: 7, 3: 10, 4: 8, 5: 6, 6: 6, 7: 11, 8: 13, 9: 6, 10: 5, 11: 6, 12: 6, 13: 5, 14: 6,
  15: 5, 16: 4, 17: 7, 18: 12, 19: 4, 20: 4, 101: 5, 102: 5, 103: 6, 104: 5,
}

/** Products that the demo leaves low or out of stock, so alerts have something to show. */
const LOW_STOCK_IDS = [18, 103, 6]
const OUT_OF_STOCK_IDS = [16]

const REVIEW_TEXTS: string[] = [
  "Omega-3 ni ikki oydan beri ichyapman, kapsulasi kichik, hidi yo'q. Yetkazib berish ertasi kuni bo'ldi.",
  "Bolalar uchun multivitamin juda yoqdi, qizim o'zi so'rab ichadi.",
  "Kollagen kursini tugatdim, sochim va tirnoqlarim yaxshilandi deb o'ylayman.",
  "D3 + K2 ni shifokor tavsiyasi bilan oldim. Narxi mos, sifati yaxshi.",
  "Toner va serumni birga ishlatyapman, teri ancha yumshoq bo'lib qoldi.",
  "Operator tez qo'ng'iroq qilib, buyurtmani tasdiqladi. Rahmat!",
  "SPF kremi yengil, yog'li iz qoldirmaydi. Yozda ishlatish uchun zo'r.",
  "Artishokni jigar uchun oldim, qadoqlash juda chiroyli.",
  "Memory ni imtihon oldidan oldim, kapsulalar 60 ta, bir oyga yetadi.",
  "Yetkazib berish biroz kechikdi, lekin mahsulot yaxshi holatda keldi.",
  "Oziqlantiruvchi krem kechasi uchun juda mos ekan.",
  "Vision ni onam uchun oldim, ko'zlari kam charchayapti deydi.",
]

/* ---------------------------------------------------------------- build */

export function buildDatabase(now = Date.now()): DB {
  const r = rng(20261019)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(r() * list.length)]
  const int = (min: number, max: number) => min + Math.floor(r() * (max - min + 1))
  const chance = (p: number) => r() < p
  const weighted = <T,>(entries: [T, number][]) => {
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let x = r() * total
    for (const [v, w] of entries) { if ((x -= w) <= 0) return v }
    return entries[entries.length - 1][0]
  }
  const iso = (t: number) => new Date(t).toISOString()
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const today0 = startOfToday.getTime()
  let serial = 0
  const id = (prefix: string) => `${prefix}_${(++serial).toString(36).padStart(5, '0')}`
  const phone = () => `+998 ${pick(['90', '91', '93', '94', '95', '97', '98', '99', '88', '33'])} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`
  const personName = () => {
    const female = chance(0.62)
    const surname = pick(SURNAMES)
    return `${female ? pick(FEMALE) : pick(MALE)} ${female ? `${surname}a` : surname}`
  }

  /* --- catalog ------------------------------------------------------ */
  const tax = catalog.taxonomy
  const categories: Category[] = [
    ...tax.CATEGORIES.map((name: Localized, i: number) => ({ id: i, line: 'supplement' as const, name })),
    { id: 100, line: 'cosmetic', name: { uz: 'Kosmetologiya', ru: 'Косметология' } },
  ]
  const created = iso(today0 - 120 * DAY)
  const toProduct = (p: CatalogProduct, line: 'supplement' | 'cosmetic'): Product => ({
    id: p.id,
    line,
    sku: `FG-${line === 'supplement' ? 'S' : 'C'}${String(p.id).padStart(3, '0')}`,
    name: p.name,
    subtitle: line === 'supplement' ? (p.dose as Localized) : (p.kind as Localized),
    categoryId: line === 'supplement' ? (p.cat as number) : 100,
    price: p.price,
    salePrice: null,
    saleEndsAt: null,
    badge: (p.badge || null) as Product['badge'],
    image: `${line === 'supplement' ? '/img/products/' : '/img/cosmetics/'}${p.img}`,
    description: p.desc,
    usage: p.use,
    howToTake: p.how,
    ingredients: (p.actives ?? []).map((a) => ({ name: a.n, amount: a.a })),
    visible: true,
    stock: 0,
    lowStockAt: 15,
    bonusPerUnit: Math.max(2000, Math.round((p.price * 0.06) / 500) * 500),
    createdAt: created,
    updatedAt: created,
  })
  const products: Product[] = [
    ...(catalog.products as CatalogProduct[]).map((p) => toProduct(p, 'supplement')),
    ...(catalog.cosmetics as CatalogProduct[]).map((p) => toProduct(p, 'cosmetic')),
  ]
  // One sale running, so the promotions screen has a live example.
  const omega = products.find((p) => p.id === 1)!
  omega.salePrice = 79900
  omega.saleEndsAt = iso(today0 + 9 * DAY)
  const byId = new Map(products.map((p) => [p.id, p]))
  const cities = new Map((catalog.cities as { n: Localized; lat: number; lon: number }[]).map((c) => [c.n.uz, c]))

  /* --- staff -------------------------------------------------------- */
  const staffSeed: [string, string, Role, string, boolean][] = [
    ['Bahodir Saidov', 'owner@familygroup.store', 'owner', '+998 90 625 22 22', true],
    ['Malika Yusupova', 'manager@familygroup.store', 'manager', '+998 91 480 12 34', false],
    ['Dilnoza Rahimova', 'operator@familygroup.store', 'operator', '+998 93 211 45 67', false],
    ['Jasur Tursunov', 'jasur@familygroup.store', 'operator', '+998 94 776 10 20', false],
    ['Otabek Nazarov', 'bonus@familygroup.store', 'bonus', '+998 97 330 88 55', false],
  ]
  const staff: StaffMember[] = staffSeed.map(([name, email, role, ph, tf], i) => ({
    id: `stf_${i + 1}`, name, email, phone: ph, role, twoFactor: tf, active: true,
    lastSeenAt: iso(now - int(5, 400) * 60_000), createdAt: iso(today0 - (200 - i * 20) * DAY),
  }))
  staff.push({
    id: 'stf_6', name: 'Kamola Ergasheva', email: 'kamola@familygroup.store', phone: '+998 95 102 30 40',
    role: 'operator', twoFactor: false, active: false, lastSeenAt: iso(today0 - 34 * DAY), createdAt: iso(today0 - 160 * DAY),
  })
  const passwords: Record<string, string> = {
    'owner@familygroup.store': 'FG-owner-2026',
    'manager@familygroup.store': 'FG-manager-2026',
    'operator@familygroup.store': 'FG-operator-2026',
    'bonus@familygroup.store': 'FG-bonus-2026',
    'jasur@familygroup.store': 'FG-operator-2026',
  }
  const operators = staff.filter((s) => s.role === 'operator' && s.active)

  /* --- couriers ----------------------------------------------------- */
  const couriers: Courier[] = [
    { id: 'cur_1', name: 'Sardor Umarov', phone: '+998 90 511 22 33', city: 'Andijon', vehicle: 'Damas · 01 A 123 BC', active: true },
    { id: 'cur_2', name: 'Islom Hasanov', phone: '+998 93 622 44 55', city: 'Andijon', vehicle: 'Spark · 60 B 456 CD', active: true },
    { id: 'cur_3', name: 'Temur Aliyev', phone: '+998 97 733 66 77', city: 'Andijon', vehicle: 'Skuter', active: true },
    { id: 'cur_4', name: 'Nodir Sobirov', phone: '+998 91 844 88 99', city: 'Namangan', vehicle: 'Nexia · 50 C 789 DE', active: true },
    { id: 'cur_5', name: 'Viloyatlararo pochta', phone: '+998 71 200 10 10', city: 'Barcha viloyatlar', vehicle: 'Pochta xizmati', active: true },
  ]

  /* --- customers & orders ------------------------------------------- */
  const customers: Customer[] = []
  const customerFor = (city: string, t: number): Customer => {
    // ~38% of orders come from someone who has ordered before.
    const pool = customers.filter((c) => c.city === city)
    if (pool.length > 3 && chance(0.38)) return pick(pool)
    const c: Customer = {
      id: id('cus'), name: personName(), phone: phone(), city, ordersCount: 0, totalSpent: 0,
      firstOrderAt: iso(t), lastOrderAt: iso(t), tags: [], notes: '',
    }
    customers.push(c)
    return c
  }

  const stockLevel = new Map<number, number>(products.map((p) => [p.id, int(160, 320)]))
  const movements: StockMovement[] = []
  const move = (productId: number, delta: number, reason: StockMovement['reason'], ref: string, by: string, at: number, note = '') => {
    const balance = (stockLevel.get(productId) ?? 0) + delta
    stockLevel.set(productId, balance)
    movements.push({ id: id('mov'), productId, delta, balance, reason, ref, by, at: iso(at), note })
  }
  // opening balances
  for (const p of products) move(p.id, 0, 'adjustment', 'Inventarizatsiya', 'Malika Yusupova', today0 - 92 * DAY, "Boshlang'ich qoldiq")

  const popEntries = products.map((p) => [p.id, POPULARITY[p.id] ?? 4] as [number, number])
  const orders: Order[] = []
  const usedNumbers = new Set<string>()
  const promoCodes = ['YANGI10', 'OILA15', 'BEPUL']

  for (let d = 89; d >= 0; d--) {
    const dayStart = today0 - d * DAY
    const growth = 1 + (89 - d) / 140
    const weekday = new Date(dayStart).getDay()
    const base = (weekday === 0 ? 6 : 9) * growth
    const count = d === 0 ? Math.max(9, Math.round(base * Math.min(1, (now - today0) / (DAY * 0.85)))) : Math.max(3, Math.round(base + (r() - 0.5) * 6))

    // weekly restock for products running low (except those meant to stay low)
    if (d % 7 === 3) {
      for (const p of products) {
        const lvl = stockLevel.get(p.id) ?? 0
        const holdLow = (LOW_STOCK_IDS.includes(p.id) && d < 16) || (OUT_OF_STOCK_IDS.includes(p.id) && d < 22)
        if (lvl < 90 && !holdLow) move(p.id, int(150, 260), 'restock', `Kirim №${int(1100, 1999)}`, 'Malika Yusupova', dayStart + 10 * 3600_000, 'Ombordan kirim')
      }
    }

    for (let k = 0; k < count; k++) {
      const hour = d === 0
        ? 8 + ((now - today0) / 3600_000 - 8) * ((k + 0.5) / count)
        : weighted([[9, 1], [10, 2], [11, 3], [12, 3], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 3], [19, 3], [20, 3], [21, 2], [22, 1]]) + r()
      const t = Math.min(now - 60_000 * (count - k), dayStart + Math.max(0, hour) * 3600_000)
      const city = weighted(Object.entries(CITY_WEIGHTS) as [string, number][])
      const cust = customerFor(city, t)

      const lines = weighted([[1, 5], [2, 4], [3, 2], [4, 1]])
      const items: OrderItem[] = []
      for (let i = 0; i < lines; i++) {
        const pid = weighted(popEntries)
        if (items.some((it) => it.productId === pid)) continue
        if ((stockLevel.get(pid) ?? 0) < 3) continue
        const p = byId.get(pid)!
        const onSale = p.salePrice && d < 10
        items.push({ productId: pid, name: p.name, image: p.image, price: onSale ? (p.salePrice as number) : p.price, qty: weighted([[1, 6], [2, 3], [3, 1]]) })
      }
      if (!items.length) continue

      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0)
      const promo = chance(0.09) ? pick(promoCodes) : null
      let discount = 0
      let delivery = subtotal >= 100_000 ? 0 : 25_000
      if (promo === 'YANGI10') discount = Math.round((subtotal * 0.1) / 100) * 100
      if (promo === 'OILA15' && subtotal >= 200_000) discount = Math.round((subtotal * 0.15) / 100) * 100
      if (promo === 'BEPUL') delivery = 0
      const total = subtotal - discount + delivery
      const paymentMethod = weighted<PaymentMethod>([['payme', 40], ['click', 36], ['card', 24]])

      // status by age
      const ageH = (now - t) / 3600_000
      const home = city === 'Andijon'
      let status: OrderStatus
      if (chance(0.05) && ageH > 3) status = 'cancelled'
      else if (ageH > (home ? 30 : 96)) status = 'delivered'
      else if (ageH > (home ? 20 : 40)) status = weighted([['shipping', 2], ['delivered', 3]])
      else if (ageH > 6) status = weighted([['packed', 2], ['shipping', 3], ['confirmed', 1]])
      else if (ageH > 2) status = weighted([['confirmed', 3], ['packed', 2], ['new', 1]])
      else status = weighted([['new', 5], ['confirmed', 1]])

      let number = ''
      do { number = `FG-2026-${int(100000, 999999)}` } while (usedNumbers.has(number))
      usedNumbers.add(number)

      const op = pick(operators).name
      const history: OrderEvent[] = [{ at: iso(t), status: 'new', by: 'Sayt', note: '' }]
      const flow: OrderStatus[] = ['confirmed', 'packed', 'shipping', 'delivered']
      const steps = status === 'cancelled' ? int(0, 2) : Math.max(0, flow.indexOf(status) + 1)
      let stepT = t
      for (let i = 0; i < steps; i++) {
        stepT += (i === 0 ? int(5, 50) * 60_000 : int(2, home ? 10 : 30) * 3600_000)
        stepT = Math.min(stepT, now - 60_000)
        history.push({ at: iso(stepT), status: flow[i], by: i >= 2 ? 'Kuryer' : op, note: '' })
      }
      if (status === 'cancelled') {
        history.push({ at: iso(Math.min(now - 60_000, stepT + int(10, 300) * 60_000)), status: 'cancelled', by: op, note: pick(["Mijoz bekor qildi", "Telefonga javob bermadi", "Manzil topilmadi", "Takroriy buyurtma"]) })
      }

      const courierId = ['shipping', 'delivered'].includes(status)
        ? (home ? pick(['cur_1', 'cur_2', 'cur_3']) : city === 'Namangan' ? 'cur_4' : 'cur_5')
        : status === 'packed' && chance(0.4) ? (home ? pick(['cur_1', 'cur_2', 'cur_3']) : 'cur_5') : null

      const centre = cities.get(city)!
      const pin = chance(0.7)
      const order: Order = {
        id: id('ord'), number, createdAt: iso(t), status,
        source: weighted([['website', 86], ['phone', 9], ['telegram', 5]]),
        customerId: cust.id, customerName: cust.name, customerPhone: cust.phone,
        address: {
          city, street: `${pick(STREETS)}, ${int(1, 140)}-uy`, apt: chance(0.35) ? `${int(1, 90)}-xonadon` : '',
          zip: '', lat: pin ? +(centre.lat + (r() - 0.5) * 0.05).toFixed(6) : null, lon: pin ? +(centre.lon + (r() - 0.5) * 0.06).toFixed(6) : null,
          note: chance(0.2) ? pick(["Domofon 45", "Ish vaqtida qo'ng'iroq qiling", "Darvoza oldida kutaman", "Kechqurun 18:00 dan keyin"]) : '',
        },
        items, subtotal, delivery, discount, total, promoCode: promo,
        paymentMethod,
        paymentStatus: status === 'cancelled' ? (chance(0.5) ? 'refunded' : 'pending') : status === 'new' && chance(0.4) ? 'pending' : 'paid',
        slot: weighted([[0, 6], [1, 2], [2, 1], [3, 1]]),
        courierId, history, notes: '',
        seenAt: status === 'new' && ageH < 3 ? null : iso(t + 6 * 60_000),
      }
      orders.push(order)
      cust.ordersCount += 1
      cust.totalSpent += status === 'cancelled' ? 0 : total
      cust.lastOrderAt = iso(t)
      if (status !== 'cancelled') for (const it of items) move(it.productId, -it.qty, 'order', number, op, t + 20 * 60_000)
    }
  }
  for (const c of customers) {
    if (c.ordersCount >= 3) c.tags.push('doimiy')
    if (c.totalSpent >= 600_000) c.tags.push('VIP')
  }
  // writeoff + return examples
  move(102, -2, 'writeoff', 'Akt №17', 'Malika Yusupova', today0 - 12 * DAY, "Qadoq shikastlangan")
  move(8, 1, 'return', orders[orders.length - 40]?.number ?? 'FG', 'Dilnoza Rahimova', today0 - 6 * DAY, 'Mijoz qaytardi, qadoq butun')
  for (const p of products) p.stock = Math.max(0, stockLevel.get(p.id) ?? 0)
  for (const pid of OUT_OF_STOCK_IDS) {
    const p = byId.get(pid)!
    if (p.stock > 0) move(pid, -p.stock, 'adjustment', 'Inventarizatsiya', 'Malika Yusupova', today0 - 2 * DAY, 'Qoldiq tuzatildi')
    p.stock = 0
  }
  for (const pid of LOW_STOCK_IDS) {
    const p = byId.get(pid)!
    const target = [6, 9, 12][LOW_STOCK_IDS.indexOf(pid)]
    if (p.stock > target) move(pid, target - p.stock, 'allocation', 'Vakillarga berildi', 'Otabek Nazarov', today0 - 1 * DAY, 'Bonus dasturi vakillariga')
    p.stock = Math.min(p.stock, target)
  }
  movements.sort((a, b) => b.at.localeCompare(a.at))
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  /* --- promotions --------------------------------------------------- */
  const promos: Promo[] = [
    { id: 'prm_1', code: 'YANGI10', type: 'percent', value: 10, minOrder: 0, startsAt: iso(today0 - 60 * DAY), endsAt: null, usageLimit: null, used: orders.filter((o) => o.promoCode === 'YANGI10').length, active: true },
    { id: 'prm_2', code: 'OILA15', type: 'percent', value: 15, minOrder: 200_000, startsAt: iso(today0 - 30 * DAY), endsAt: iso(today0 + 20 * DAY), usageLimit: 300, used: orders.filter((o) => o.promoCode === 'OILA15').length, active: true },
    { id: 'prm_3', code: 'BEPUL', type: 'free_delivery', value: 0, minOrder: 50_000, startsAt: iso(today0 - 45 * DAY), endsAt: iso(today0 + 5 * DAY), usageLimit: 150, used: orders.filter((o) => o.promoCode === 'BEPUL').length, active: true },
    { id: 'prm_4', code: 'NAVRUZ', type: 'fixed', value: 20_000, minOrder: 150_000, startsAt: iso(today0 - 210 * DAY), endsAt: iso(today0 - 190 * DAY), usageLimit: 200, used: 164, active: false },
  ]

  /* --- consultations ------------------------------------------------ */
  const consultations: Consultation[] = []
  for (let d = 29; d >= 0; d--) {
    const n = d === 0 ? 5 : int(1, 5)
    for (let k = 0; k < n; k++) {
      const t = d === 0 ? now - (k + 1) * int(18, 70) * 60_000 : today0 - d * DAY + int(9, 21) * 3600_000
      const fresh = d === 0 && k < 3
      const product = chance(0.55) ? weighted(popEntries) : null
      consultations.push({
        id: id('con'), createdAt: iso(t), name: chance(0.7) ? personName() : '', phone: phone(),
        channel: weighted([['call', 5], ['whatsapp', 3], ['telegram', 3]]), productId: product,
        page: product ? `/mahsulot/${product}` : pick(['/', '/kosmetologiya', '/mahsulotlar', '/kontaktlar']),
        status: fresh ? 'new' : weighted([['done', 6], ['called', 2], ['no_answer', 1]]),
        note: fresh ? '' : pick(['', "Omega-3 dozasini so'radi", 'Kosmetika tartibini tushuntirdim', "Qayta qo'ng'iroq qilish kerak", 'Buyurtma berdi']),
        handledBy: fresh ? null : pick(operators).name,
      })
    }
  }
  consultations.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  /* --- reviews ------------------------------------------------------ */
  const reviews: Review[] = REVIEW_TEXTS.map((text, i) => {
    const status: Review['status'] = i < 4 ? 'pending' : i === 9 ? 'rejected' : 'approved'
    const consent = !(i === 2 || i === 9)
    return {
      id: id('rev'), createdAt: iso(today0 - (i < 4 ? i : i * 3) * DAY - int(1, 10) * 3600_000),
      name: personName(), city: weighted(Object.entries(CITY_WEIGHTS) as [string, number][]),
      productId: [1, 7, 4, 3, 101, 8, 103, 18, 9, 2, 104, 6][i], rating: i === 9 ? 3 : pick([4, 5, 5, 5]),
      text, consent, consentRef: consent ? `Telegram, ${new Date(today0 - i * DAY).toLocaleDateString('uz-UZ')}` : '', status,
    }
  })

  /* --- content (real, from the website) ----------------------------- */
  const cert = (idv: string, title: Localized, number: string, issuedBy: string, validUntil: string | null, pdf: string | null, pages: string[]): Certificate =>
    ({ id: idv, title, number, issuedBy, validUntil, pdf, pages })
  const content: SiteContent = {
    heroProductIds: [1, 3, 2, 4, 5, 6, 7, 8],
    quote: { uz: "Sog'lom hayot — kuchli tanlovlardan boshlanadi.", ru: 'Здоровая жизнь начинается с сильных решений.' },
    aboutTitle: { uz: 'Sog‘liq uchun tanlov. Oila uchun ishonch.', ru: 'Выбор для здоровья. Доверие для семьи.' },
    aboutText: {
      uz: 'Family Group — Andijonda boshlangan nutrisevtika brendi. Biz vitaminlarni shunchaki sotish uchun emas, odamlar har kuni ishonch bilan iste’mol qilishi mumkin bo‘lgan mahsulotlar yaratish uchun ishlab chiqamiz.',
      ru: 'Family Group — нутрицевтический бренд, начавшийся в Андижане. Мы создаём витамины не просто для продажи, а чтобы люди могли принимать их каждый день с уверенностью.',
    },
    videoId: 'uPxTUHY2KRg',
    contacts: {
      phone: '+998 (90) 625-22-22', telegram: 'https://t.me/+998906252222', whatsapp: 'https://wa.me/998906252222',
      instagram: 'https://www.instagram.com/makrofarmuz/', youtube: 'https://www.youtube.com/@makrofarmandijan2395',
      email: 'info@familygroup.uz',
      address: { uz: 'Jumabozor mahallasi, Andijon shahri', ru: 'махалля Жумабозор, г. Андижан' },
      landmark: { uz: "Mo'ljal: Soy MFY (mahalla fuqarolar yig'ini)", ru: 'Ориентир: сход граждан махалли «Сой»' },
      hours: { uz: 'Har kuni 09:00 – 20:00', ru: 'Ежедневно 09:00 – 20:00' },
      lat: 40.802044, lon: 72.35213,
    },
    certificates: [
      cert('gpp-8087', { uz: 'GPP sertifikati — asosiy dorixona', ru: 'Сертификат GPP — основная аптека' }, '№ID 8087:2025', 'Zarur amaliyotlar markazi DM', '2028-11-25', '/certificates/gpp-8087-2025.pdf', ['/certificates/gpp-8087-2025-1.webp', '/certificates/gpp-8087-2025-2.webp']),
      cert('gpp-4260', { uz: 'GPP sertifikati — 1-filial', ru: 'Сертификат GPP — филиал № 1' }, '№ID 4260:2026', 'Zarur amaliyotlar markazi DM', '2029-08-24', '/certificates/gpp-4260-2026.pdf', ['/certificates/gpp-4260-2026-1.webp', '/certificates/gpp-4260-2026-2.webp']),
      cert('license-0506', { uz: 'Dori vositalarini chakana sotish litsenziyasi', ru: 'Лицензия на розничную реализацию лекарств' }, '№0506', 'Andijon viloyati farmatsevtika boshqarmasi', '2027-09-06', null, ['/certificates/license-0506.webp']),
      cert('registration', { uz: "Davlat ro'yxatidan o'tkazilganlik guvohnomasi", ru: 'Свидетельство о государственной регистрации' }, 'STIR 309718142', 'Andijon sh. Davlat xizmatlari markazi', null, null, ['/certificates/registration-2022.webp']),
    ],
    updatedAt: iso(today0 - 2 * DAY),
  }

  /* --- pharmacy network --------------------------------------------- */
  const partner: [string, string, number, number][] = [
    ['Dorixona №3 — Asaka', 'Asaka', 40.6415, 72.2387],
    ['Dorixona №4 — Xonobod', 'Xonobod', 40.8030, 73.0040],
    ['Dorixona №5 — Shahrixon', 'Shahrixon', 40.7130, 72.0570],
    ['Dorixona №6 — Qo‘rg‘ontepa', 'Qo‘rg‘ontepa', 40.7330, 72.7590],
    ['Dorixona №7 — Namangan markaz', 'Namangan', 41.0010, 71.6680],
    ['Dorixona №8 — Farg‘ona', "Farg'ona", 40.3890, 71.7830],
    ['Dorixona №9 — Marg‘ilon', "Marg'ilon", 40.4710, 71.7250],
    ['Dorixona №10 — Toshkent, Chilonzor', 'Toshkent', 41.2850, 69.2040],
  ]
  const stockFor = () => products.filter(() => chance(0.7)).map((p) => ({ productId: p.id, qty: int(0, 40) }))
  const pharmacies: Pharmacy[] = [
    { id: 'phm_1', name: 'MAKRO-CITY-PHARM — asosiy dorixona', city: 'Andijon', address: "Mirpustin MFY, Toshkent ko'chasi, 50-uy", lat: 40.7512, lon: 72.3705, phone: '+998 90 625 22 22', manager: 'Bahodir Saidov', active: true, own: true, stock: products.map((p) => ({ productId: p.id, qty: int(8, 60) })) },
    { id: 'phm_2', name: 'MAKRO-CITY-PHARM — 1-filial', city: 'Andijon', address: "Navbaxor MFY, Toshkent ko'chasi, 49-uy", lat: 40.7506, lon: 72.3716, phone: '+998 90 625 22 22', manager: 'Malika Yusupova', active: true, own: true, stock: products.map((p) => ({ productId: p.id, qty: int(5, 45) })) },
    ...partner.map(([name, city, lat, lon], i) => ({
      id: `phm_${i + 3}`, name, city, address: `${pick(STREETS)}, ${int(1, 90)}-uy`, lat, lon, phone: phone(),
      manager: personName(), active: i !== 6, own: false, stock: stockFor(),
    })),
  ]

  /* --- bonus program ------------------------------------------------ */
  const reps: Rep[] = Array.from({ length: 14 }, (_, i) => {
    const ph = pharmacies[2 + (i % 8)]
    return { id: `rep_${i + 1}`, name: personName(), phone: phone(), city: ph.city, pharmacyId: ph.id, active: i !== 11, joinedAt: iso(today0 - int(20, 200) * DAY) }
  })
  const allocations: Allocation[] = []
  const repSales: RepSale[] = []
  const bonuses: Bonus[] = []
  for (const rep of reps) {
    const lines = products.filter((p) => p.line === 'supplement' && chance(0.35))
    for (const p of lines) {
      const at = today0 - int(25, 70) * DAY
      const qty = int(10, 40)
      allocations.push({ id: id('alc'), repId: rep.id, productId: p.id, qty, at: iso(at), by: 'Otabek Nazarov' })
      let sold = 0
      const target = rep.active ? int(Math.floor(qty * 0.3), Math.floor(qty * 0.9)) : int(0, 4)
      while (sold < target) {
        const q = Math.min(target - sold, int(1, 3))
        sold += q
        const t = at + r() * int(1, 60) * DAY + int(9, 19) * 3600_000
        const saleAt = Math.min(t, now - int(1, 600) * 60_000)
        const sale: RepSale = { id: id('rsl'), repId: rep.id, productId: p.id, qty: q, bonus: q * p.bonusPerUnit, pharmacyId: rep.pharmacyId, customerName: chance(0.5) ? personName() : '', at: iso(saleAt) }
        repSales.push(sale)
        const paid = saleAt < today0 - 14 * DAY && chance(0.85)
        bonuses.push({ id: id('bon'), repId: rep.id, saleId: sale.id, amount: sale.bonus, status: paid ? 'paid' : 'pending', at: sale.at, paidAt: paid ? iso(saleAt + int(7, 14) * DAY) : null })
      }
    }
  }
  repSales.sort((a, b) => b.at.localeCompare(a.at))
  allocations.sort((a, b) => b.at.localeCompare(a.at))
  bonuses.sort((a, b) => b.at.localeCompare(a.at))

  /* --- activity log ------------------------------------------------- */
  const activity: ActivityEntry[] = []
  const log = (who: StaffMember, at: string, action: string, entity: ActivityEntry['entity'], entityId: string, summary: string) =>
    activity.push({ id: id('act'), at, userId: who.id, userName: who.name, role: who.role, action, entity, entityId, summary })
  const staffByName = new Map(staff.map((s) => [s.name, s]))
  for (const o of orders.slice(0, 220)) {
    for (const ev of o.history.slice(1)) {
      const who = staffByName.get(ev.by)
      if (who) log(who, ev.at, `order.${ev.status}`, 'order', o.number, `${o.number} → ${ev.status}${ev.note ? ` (${ev.note})` : ''}`)
    }
  }
  const mgr = staff[1]; const own = staff[0]; const bon = staff[4]
  log(mgr, iso(today0 - 9 * DAY + 11 * 3600_000), 'product.sale', 'product', '1', "Omega-3: aksiya narxi 79 900 so'm")
  log(mgr, iso(today0 - 3 * DAY + 15 * 3600_000), 'content.update', 'content', 'about', '“Biz kimmiz?” matni yangilandi')
  log(own, iso(today0 - 12 * DAY + 10 * 3600_000), 'product.price', 'product', '18', "Artishok: narx 28 800 so'm")
  log(own, iso(today0 - 1 * DAY + 9 * 3600_000), 'auth.login', 'auth', own.id, 'Kirish (2 bosqichli tasdiq)')
  log(bon, iso(today0 - 1 * DAY + 12 * 3600_000), 'bonus.payout', 'bonus', 'batch', "4 vakilga bonus to'landi")
  log(own, iso(today0 - 20 * DAY + 16 * 3600_000), 'staff.deactivate', 'staff', 'stf_6', 'Kamola Ergasheva — faolsizlantirildi')
  activity.sort((a, b) => b.at.localeCompare(a.at))

  const settings: Settings = {
    shopName: 'Family Group',
    legalName: '"MAKRO-CITY-PHARM" MChJ',
    inn: '309718142',
    supportPhone: '+998 (90) 625-22-22',
    telegram: { connected: false, groupName: 'Family Group buyurtmalar', events: { newOrder: true, consultation: true, lowStock: true, review: false } },
    delivery: { freeFrom: 100_000, fee: 25_000, homeCity: 'Andijon', homeCityDays: '24 soat', otherCitiesDays: '2–4 kun' },
    lowStockDefault: 15,
    certificateWarnDays: 365,
  }

  return {
    version: DB_VERSION, seededAt: iso(now), products, categories, orders, customers, movements, promos,
    consultations, reviews, content, pharmacies, reps, allocations, repSales, bonuses, couriers, staff,
    passwords, activity, settings,
  }
}
