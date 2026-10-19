# Family Group — admin panel

Back office for familygroup.store and the pharmacy bonus program: orders,
consultation requests, delivery, statistics, products, stock, prices and
promotions, customers, reviews, site content, pharmacy network, bonus program,
staff and roles, activity log, settings. Uzbek by default, Russian with one click.

React + TypeScript + Vite. No UI library: the components, charts and maps are
built in, so the bundle stays small.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

## Demo logins

With `VITE_API_URL` empty the panel runs on a demo database in the browser
(clearly labelled **Demo** in the top bar; it regenerates every day and can be
reset in Settings). Demo data uses the real catalog, prices, photos and
certificates; customers, orders, pharmacies' partners, reps and staff are invented.

| Role | Login | Password | Sees |
|---|---|---|---|
| Owner (rahbar) | `owner@familygroup.store` | `FG-owner-2026` | everything; 2-step code **123456** |
| Manager | `manager@familygroup.store` | `FG-manager-2026` | catalog, stock, promotions, content, reviews, orders, statistics |
| Operator | `operator@familygroup.store` | `FG-operator-2026` | queue, orders, consultations, delivery, customers |
| Bonus program | `bonus@familygroup.store` | `FG-bonus-2026` | bonus program, pharmacies, stock |

These passwords live in the frontend code, so they protect nothing — they exist
only for the demo. Real logins come from the backend.

## Connecting the backend

1. Copy `.env.example` to `.env` and set `VITE_API_URL=https://your-api/v1`.
2. Implement the endpoints in [`docs/API.md`](docs/API.md) — or edit the paths in
   [`src/api/http.ts`](src/api/http.ts) to match an existing API. Types are in
   [`src/api/types.ts`](src/api/types.ts).
3. Rebuild. Screens never call `fetch` themselves; everything goes through `src/api`.
4. When the real server is live, delete `src/api/mock` and the demo switch in
   `src/api/index.ts`.

## Structure

```
src/
  api/          types.ts (contract), http.ts (endpoints), client.ts (fetch + token), mock/ (demo database)
  components/   Shell (menu, top bar, Ctrl+K), ui.tsx (buttons, fields, tables, drawers…),
                charts.tsx, TileMap.tsx, Bottle.tsx (stock gauge), OrderDetail.tsx
  pages/        one file per section
  lib/          dict.ts (all UI text, uz + ru), i18n, format, query (data hooks), permissions, xlsx
  styles/       tokens.css (colours, type), app.css
```

## Deploy to Netlify

`netlify.toml` builds with `npm run build` and serves `dist/`, with page URLs
falling back to `index.html`. Either link the repository in Netlify, or run
`npm run build` and drag the `dist/` folder onto the site's **Deploys** page.
The site sends `noindex`, so search engines will not list it.
