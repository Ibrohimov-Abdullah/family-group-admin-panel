# Family Group admin — API contract

This is everything the admin panel calls. The frontend is finished and talks to
the server through one file, [`src/api/http.ts`](../src/api/http.ts); the JSON
shapes are defined in [`src/api/types.ts`](../src/api/types.ts). Implement these
endpoints (or change the paths in `http.ts` to match yours) and set
`VITE_API_URL` — no screen needs to change.

Until then the panel runs on a demo database in the browser
([`src/api/mock`](../src/api/mock)) that implements the same contract, so you can
click through every flow to see exactly what each endpoint must return.

## Conventions

| | |
|---|---|
| Base URL | `VITE_API_URL`, e.g. `https://api.familygroup.store/v1` |
| Auth | `Authorization: Bearer <token>` on every request after login |
| Format | JSON, camelCase field names |
| Money | integer so'm (UZS), no decimals |
| Dates | ISO-8601 strings in UTC (`2026-10-19T09:30:00.000Z`) |
| Localised text | `{ "uz": "...", "ru": "..." }` (type `Localized`) |
| Lists | paginated lists return `Page<T>` = `{ items, total, page, pageSize }` |
| Errors | non-2xx with `{ "message": "code_or_text" }`. The UI reads the status: `400` bad input, `401` → sign out, `403` → "not allowed for your role", `404`, `409` duplicate, `422` rule violation (e.g. `no_consent`, `not_enough_stock`) |
| Roles | `owner`, `manager`, `operator`, `bonus` — the server must enforce them; the matrix the UI uses is in [`src/lib/permissions.ts`](../src/lib/permissions.ts) |

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/login` | `{ login, password }` — login is email or phone | `LoginResult`: `{ status: "ok", session }` or, for 2FA accounts, `{ status: "2fa", ticket, phoneHint }` |
| POST | `/auth/2fa` | `{ ticket, code }` — 6-digit code sent by SMS/Telegram | `Session` = `{ token, user: StaffMember }` |
| GET | `/auth/me` | — | `StaffMember` (used on page reload) |
| POST | `/auth/logout` | — | 204 |

Owners must always have 2FA on (`twoFactor: true`).

## Home queue and badges

| Method | Path | Returns |
|---|---|---|
| GET | `/inbox` | `InboxItem[]` — everything waiting for a person: open orders (`new`/`confirmed`/`packed`), consultation requests (`new`/`no_answer`), low-stock products, pending reviews, certificates expiring within `settings.certificateWarnDays`. `lit: true` = not yet opened/handled. Sort lit first. |
| GET | `/inbox/badges` | `Badges` = `{ orders, consultations, reviews, stock }` counts for the side menu (polled every 30 s) |

## Dashboard and statistics

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/dashboard` | `period=7d\|30d\|90d` | `Dashboard` — KPIs with previous-period values and daily series, queue counts, revenue by day, status counts, payment split |
| GET | `/analytics` | `period` | `Analytics` — sales per product (units, revenue, daily series), per city (with lat/lon), per category, per line, new vs repeat customers by day |

Revenue counts orders that are not `cancelled`.

## Orders

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/orders` | `q` (number, name or phone digits), `status` (`all`, `open` = not delivered/cancelled, or a status), `city`, `payment`, `from`, `to`, `courierId`, `page`, `pageSize`, `sort=createdAt\|total`, `dir=asc\|desc` | `Page<Order>` |
| GET | `/orders/counts` | — | `OrderCounts` = `{ byStatus, unseen }` |
| GET | `/orders/:id` | — | `Order` |
| POST | `/orders/:id/status` | `{ status, note }` | `Order`. Append to `history` with the staff name. On `cancelled`, return items to stock and mark paid orders `refunded`. On `delivered`, a pending payment becomes `paid`. |
| POST | `/orders/:id/seen` | — | `Order` with `seenAt` set (first open turns the "lit" state off for everyone) |
| PUT | `/orders/:id/courier` | `{ courierId \| null }` | `Order` |
| PATCH | `/orders/:id` | `{ notes?, address? }` | `Order` |

Status flow: `new → confirmed → packed → shipping → delivered`, or `cancelled`. The
website checkout creates orders (`source: "website"`) and should also post them to the
staff Telegram group (see Settings).

## Products and stock

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/products` | `line=supplement\|cosmetic`, `q` | `Product[]` |
| GET | `/products/:id` | — | `Product` |
| POST | `/products` | `ProductInput` (may include initial `stock`) | `Product` |
| PATCH | `/products/:id` | `Partial<ProductInput>` — price, sale price/end, visibility, texts… | `Product` |
| GET | `/categories` | — | `Category[]` |
| POST | `/uploads` | multipart `file` | `{ url }` — product photos, certificate pages, PDFs |
| GET | `/stock/movements` | `productId`, `reason`, `page`, `pageSize` | `Page<StockMovement>` (newest first, each with the balance after it) |
| POST | `/stock/adjustments` | `{ productId, delta, reason, note }` — reason `restock`, `return`, `writeoff`, `adjustment` | `StockMovement` |
| GET | `/stock/forecast` | — | `StockForecast[]` — `dailyRate` = units sold per day over 30 days, `daysLeft = floor(stock / dailyRate)` |

## Customers

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/customers` | `q`, `city`, `tag`, `sort=lastOrderAt\|totalSpent\|ordersCount`, `page`, `pageSize` | `Page<Customer>` |
| GET | `/customers/:id` | — | `Customer` |
| GET | `/customers/:id/orders` | — | `Order[]` |
| PATCH | `/customers/:id` | `{ notes?, tags? }` | `Customer` |

## Prices, promotions, delivery

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/promos` | — | `Promo[]` |
| POST | `/promos` | `Promo` without `id`, `used` | `Promo` (`409` on duplicate code) |
| PATCH | `/promos/:id` | partial | `Promo` |
| DELETE | `/promos/:id` | — | 204 |

Sale prices and bulk price changes use `PATCH /products/:id`. Delivery rules
(`freeFrom`, `fee`, delivery times) live in `Settings.delivery`; the shop's cart must
read the same values.

## Consultations and reviews

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/consultations` | `status=all\|new\|called\|no_answer\|done` | `Consultation[]` |
| PATCH | `/consultations/:id` | `{ status?, note? }` — set `handledBy` to the staff name | `Consultation` |
| GET | `/reviews` | `status=all\|pending\|approved\|rejected` | `Review[]` |
| PATCH | `/reviews/:id` | `{ status }` — approving without `consent: true` must return `422 no_consent` | `Review` |

## Site content

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/content` | — | `SiteContent` (hero product order, quote, about texts, video id, contacts, certificates) |
| PUT | `/content` | partial `SiteContent` (not certificates) | `SiteContent` |
| PUT | `/content/certificates/:id` | `Certificate` (create or replace) | `Certificate` |
| DELETE | `/content/certificates/:id` | — | 204 |

The website (familygroup.store) should read these values instead of its hard-coded copies.

## Pharmacy network and bonus program

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/pharmacies` | — | `Pharmacy[]` (with per-product stock) |
| POST / PUT | `/pharmacies`, `/pharmacies/:id` | `Pharmacy` | `Pharmacy` |
| PUT | `/pharmacies/:id/stock/:productId` | `{ qty }` | `Pharmacy` |
| GET | `/reps` | — | `Rep[]` |
| POST / PUT | `/reps`, `/reps/:id` | `Rep` | `Rep` |
| GET | `/reps/summary` | — | `RepSummary[]` — allocated, sold, on hand, pending and paid bonus per rep |
| GET | `/allocations` | — | `Allocation[]` |
| POST | `/allocations` | `{ repId, productId, qty }` — deducts warehouse stock; `422 not_enough_stock` | `Allocation` |
| GET | `/rep-sales` | `repId` | `RepSale[]` (recorded by reps in the mobile app) |
| GET | `/bonuses` | `status`, `repId` | `Bonus[]` |
| POST | `/bonuses/payout` | `{ repIds }` — marks all their pending bonuses paid | `{ paid, amount }` |

Bonus per sale = `qty × product.bonusPerUnit`.

## Delivery, staff, activity, settings, search, exports

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/couriers` | — | `Courier[]` |
| POST / PUT | `/couriers`, `/couriers/:id` | `Courier` | `Courier` |
| GET | `/staff` | — | `StaffMember[]` (owner only) |
| POST / PUT | `/staff`, `/staff/:id` | `StaffMember` fields | `StaffMember` (`409` duplicate email; send the new person a set-password link) |
| POST | `/staff/:id/reset-password` | — | `{ sent }` |
| GET | `/activity` | `q`, `entity`, `userId`, `page`, `pageSize` | `Page<ActivityEntry>` — write one entry for every change made through the API |
| GET | `/settings` | — | `Settings` |
| PUT | `/settings` | partial `Settings` | `Settings` |
| POST | `/settings/telegram/test` | — | `{ ok }` — sends a test message to the staff group |
| GET | `/search` | `q` | `SearchHit[]` — orders, products, customers, pharmacies, reps (Ctrl+K palette) |
| GET | `/exports/orders.xlsx` | same filters as `/orders` | Excel file |
| GET | `/exports/sales.xlsx` | `period` | Excel file |
| GET | `/exports/stock.xlsx` | — | Excel file |
| GET | `/exports/customers.xlsx` | — | Excel file |

## Notes for the server

- **Telegram**: keep the bot token and group id in server environment variables, never in the frontend. Post new orders, consultation requests, low stock and new reviews according to `Settings.telegram.events`.
- **Card payments**: never store card numbers. Payme / Click confirm payments through their own merchant callbacks to your server, which then sets `paymentStatus: "paid"`.
- **Personal data**: customer names, phones and addresses are personal data under Uzbekistan's law; check where the database must be hosted before launch.
