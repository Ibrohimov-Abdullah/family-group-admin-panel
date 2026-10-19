# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Delegated: React + TypeScript + Vite (same stack as the earlier `admin_panel` prototype). Static build (`dist/`) deployed to Netlify for the owner demo. All data goes through one typed API layer (`src/api`) backed by an in-browser mock today; the backend developer replaces the mock with HTTP calls. The owner did not choose the stack and said the backend team decides how to connect.

## Users
- **Owner** of Family Group (Andijan nutraceutical brand run by "MAKRO-CITY-PHARM" MChJ): reviews revenue, top products, stock and the network; approves staff and prices.
- **Managers**: run the catalog, prices, promotions, stock, content, reviews.
- **Operators**: process incoming website orders and consultation requests by phone/Telegram all day.
- **Bonus-program staff**: allocate stock to pharmacy representatives and pay out bonuses.
Working on office desktops mostly; operators also on phones.

## Product Purpose
One back office for the whole business: the familygroup.store shop (orders, products, stock, customers, promotions, consultations, reviews, site content, delivery) and the pharmacy bonus program (pharmacies, representatives, stock allocations, sales, payouts), with statistics on top. Success: no order or request is missed, stock never runs out unnoticed, the owner sees the business at a glance.

## Positioning
Built for this business specifically: the real 24-product catalog (20 supplements + 4 cosmetics, separate lines), Andijan-first delivery, Uzbek/Russian staff, Payme/Click/card payments, pharmacy network and rep bonuses in the same tool.

## Operating Context
- Orders come from the website checkout (name, phone, address, map pin, payment method) and should also be posted to a staff Telegram group.
- Statuses: New → Confirmed → Packed → Out for delivery → Delivered, or Cancelled.
- Delivery: free from 100 000 so'm, otherwise 25 000 so'm; Andijan next day, other cities 2–4 days.
- Currency UZS ("so'm"), phone format +998 XX XXX XX XX.
- Bonus program: office allocates stock to reps, reps record sales in the Flutter app, bonus per unit accrues, office pays out manually.

## Capabilities and Constraints
The owner asked for all of these (2026-10-19):
1. Staff login with roles (Owner / Manager / Operator) and 2-step verification for the owner
2. Orders  3. Products  4. Stock  5. Customers  6. Prices & promotions  7. Consultation requests
8. Content (texts, hero, video, certificates, contacts)  9. Reviews / customer results (consent required)
10. Dashboard  11. Top sellers  12. Sales by location  13. Stock forecast  14. Excel export
15. Pharmacy network  16. Bonus program  17. Delivery / couriers  19. Activity log; plus Settings.
Home checkup visits (18) are explicitly NOT built now — shown only as "coming soon".
No backend yet: demo data is generated and clearly labelled as demo. Demo login only; real auth comes from the backend.

## Brand Commitments
Name "Family Group". Classic apothecary identity shared with familygroup.store: espresso, warm gold, ivory; Cormorant Garamond (display) + Manrope (UI); leaf mark logo. Interface language Uzbek (Latin, default) with Russian toggle.

## Evidence on Hand
- Real catalog, prices and product images: `../family-group-project/src/js/data/products.js`, `cosmetics.js`, `assets/products/`, `assets/cosmetics/`.
- Real certificates: `../family-group-project/assets/certificates/` (GPP ID 8087:2025, ID 4260:2026, licence №0506, state registration).
- Real contacts: +998 90 625-22-22, office Jumabozor mahallasi, Andijan (40.802044, 72.352130).
- No real orders, customers, reps or pharmacy data exist yet — everything else is demo data and must be labelled so.

## Product Principles
1. Nothing gets missed: new orders, requests, low stock and expiring certificates surface on their own.
2. The common job in one step: change an order's status, call a customer, adjust stock — without hunting.
3. Honest data: demo data is labelled; no invented claims in content the site will show.
4. Roles limit what people see and change; every change is logged.
5. Backend-ready: every screen talks to the API layer only, so connecting the real server changes no UI.
