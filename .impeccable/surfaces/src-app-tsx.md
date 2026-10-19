---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: Family Group admin (all screens)

Mode: Operate. Audience: owner, managers, operators, bonus staff (PRODUCT.md). Task: process orders and requests without missing any; run catalog, stock, promotions, content, network and bonus program; read the business at a glance.
Constraints: established Family Group world (espresso, gold, ivory; Cormorant Garamond for the brand mark and page titles only; Manrope for all UI and data). Uzbek default, Russian toggle. Demo data labelled. Code-led (no image generation).

## Direction contract

THESIS: One back office whose home is an action inbox: everything that needs a person (new orders, call-back requests, low stock, pending reviews, expiring certificates) flows into one queue that stays lit until someone opens it. Refuses the category default of a KPI-tile wall as the landing screen.

OWN-WORLD: Espresso (#2B2118) side rail with gold (#C9A867) active marks and ivory labels; warm ivory work ground (#F7F3EC) with white panels and hairline warm borders (#E7DED0); real bottle cutouts as product thumbnails; tabular Manrope figures; muted state colours (sage delivered, amber waiting, slate shipping, terracotta cancelled/alert). Lit = gold left bar + warm tint + bold title until opened.

STORY: Staff land on the queue, open the top lit item, act (confirm, call, pack, assign courier) in one step, and the item goes quiet; the owner reads today's money and alerts in the strip above the queue and drills into Statistics.

FIRST VIEWPORT: Left: espresso rail (brand mark, grouped sections with live counts). Top: search (Ctrl+K), language UZ/RU, demo badge, user. Main: a slim today strip (revenue, orders, average order, alerts) above a two-pane inbox — queue list (filters: All / Orders / Requests / Stock / Reviews / Documents) on the left, the opened item on the right with its primary action as the first button.

FORM: Action inbox (seed 265df737, dealt lead, candidate 3 of 6), fused with the gate-board challenger's rule that a changed row stays lit until noticed; side rail widened with labels so all sections stay one click away.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
