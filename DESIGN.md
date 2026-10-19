---
name: Family Group Admin
description: The back office for the Family Group apothecary brand. An espresso rail, an ivory work ground, and gold that marks what still needs a person.
colors:
  espresso: "#2B2118"
  espresso-2: "#3A2D21"
  espresso-3: "#1E1711"
  rail-text: "#E9DFCF"
  rail-muted: "#A79883"
  cream-on-dark: "#FBF6EC"
  gold: "#C9A867"
  gold-deep: "#9A7638"
  gold-ink: "#7A5C26"
  gold-soft: "#F1E6CF"
  gold-tint: "#FBF5E8"
  ground: "#F6F1E9"
  panel: "#FFFFFF"
  panel-2: "#FBF8F3"
  line: "#E9E0D2"
  line-2: "#D8CBB7"
  ink: "#241C15"
  ink-2: "#5A4F43"
  ink-3: "#75695B"
  state-new: "#A86A12"
  state-new-bg: "#FBEFD9"
  state-confirmed: "#3E5C76"
  state-confirmed-bg: "#E7EDF3"
  state-packed: "#5C5A8C"
  state-packed-bg: "#ECEBF5"
  state-shipping: "#2F6C7A"
  state-shipping-bg: "#E2EFF1"
  state-delivered: "#3D7651"
  state-delivered-bg: "#E3F0E7"
  state-cancelled: "#A9432D"
  state-cancelled-bg: "#F7E5E0"
typography:
  display:
    fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "'tnum', 'lnum'"
  title:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14.5px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "'lnum'"
  body-data:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "'tnum', 'lnum'"
  label:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
  rail-group:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.13em"
rounded:
  sm: "6px"
  control-sm: "8px"
  md: "10px"
  lg: "14px"
  pill: "99px"
spacing:
  xs: "6px"
  sm: "10px"
  gap: "16px"
  panel: "18px"
  pad: "24px"
  rail: "248px"
  rail-collapsed: "72px"
  topbar: "60px"
components:
  button-primary:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.cream-on-dark}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.espresso-2}"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.espresso-3}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-2}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  button-danger:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.state-cancelled}"
    rounded: "{rounded.md}"
    padding: "0 15px"
    height: "38px"
  button-danger-hover:
    backgroundColor: "{colors.state-cancelled-bg}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "{spacing.panel}"
  rail:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.rail-text}"
    width: "{spacing.rail}"
  rail-link-active:
    backgroundColor: "rgba(201, 168, 103, .14)"
    textColor: "#FFF8EA"
    rounded: "{rounded.md}"
    height: "38px"
  rail-count:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.espresso-3}"
    rounded: "{rounded.pill}"
    height: "20px"
  pill-status:
    backgroundColor: "{colors.state-new-bg}"
    textColor: "{colors.state-new}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "24px"
  queue-item-open:
    backgroundColor: "{colors.gold-tint}"
    padding: "13px 14px"
  segmented-active:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "7px"
    height: "30px"
---

# Design System: Family Group Admin

## Overview

**Creative North Star: "The Apothecary Back Room"**

This is the room behind the Family Group shop counter: the same espresso, gold and ivory as familygroup.store, put to work. A dark espresso rail holds the whole business in labelled groups. The work happens on a warm ivory ground where white panels sit on hairline warm borders. Gold is not decoration. It marks what is live, what is selected, and what still needs a person. The home screen is a queue, not a wall of KPI tiles. An unhandled item stays lit with a warm gold wash, a gold dot and a bold title until someone opens it.

Density suits office work: 14px Manrope body, 38px controls, 16px gaps, tabular figures in every column that holds money or counts. Cormorant Garamond appears only on the brand mark, page titles and the login art panel, so the apothecary voice shows at the edges and never in the data. Product thumbnails are real bottle cutouts on a soft ivory radial. The signature component draws stock as an apothecary bottle filling with gold.

State colour is muted and earthy (amber, slate, violet-grey, teal, sage, terracotta), always as dark text on a pale tint of the same hue. Nothing in the system is saturated or loud.

**Key Characteristics:**
- Espresso rail plus ivory ground plus white hairline panels; three planes only.
- Gold means live, active or unseen. It never fills large areas.
- The serif is for brand and page titles only. All UI and data use Manrope.
- Tabular lining numerals wherever figures are compared.
- Muted state pairs: hue-dark text on a hue-pale tint, with a 6px dot.
- Soft, warm-tinted shadows. Hairline borders carry most of the separation.

## Colors

A warm apothecary palette: espresso browns and ivory neutrals with one gold accent family and six muted state hues.

### Primary
- **Espresso** (espresso): the rail, primary buttons, the language switch's selected half, toasts, chart tooltips, completed order-progress steps. It is the brand's darkest voice and the default "do it" colour.
- **Espresso Raised / Espresso Deep** (espresso-2, espresso-3): espresso-2 for rail hover and primary-button hover; espresso-3 as text on gold surfaces (rail counts, gold buttons).

### Secondary
- **Apothecary Gold** (gold): rail active icon, rail live counts, the gold button, toast icons. Used on dark grounds or as a small fill.
- **Deep Gold** (gold-deep): gold that has to read on ivory. Used for focus rings, caret, the active tab underline, the lit dot, timeline dots, bar-chart fills, the input focus border, and series-1 in charts.
- **Gold Ink** (gold-ink): gold as text. Used for links, the lit item's timestamp, avatar initials, gold pills and tags.
- **Gold Soft / Gold Tint** (gold-soft, gold-tint): gold-soft for avatar, tag and gold-pill backgrounds and text selection; gold-tint for the opened queue item, selected table row, selected palette item and empty-state icon wells.

### Tertiary (state)
- **Amber Waiting** (state-new / state-new-bg): new orders, warnings, low stock, the demo badge.
- **Slate Confirmed** (state-confirmed): confirmed orders and info callouts.
- **Violet-Grey Packed** (state-packed): packed orders.
- **Teal Shipping** (state-shipping): out for delivery.
- **Sage Delivered** (state-delivered): delivered, success, positive deltas, the switch's on state.
- **Terracotta Cancelled** (state-cancelled): cancelled, danger, errors, negative deltas, out of stock.

Chart series reuse the same hues in a fixed order: deep gold, teal, terracotta, violet-grey, sage.

### Neutral
- **Ivory Ground** (ground): the work surface behind panels, and the drawer body.
- **Panel White / Panel Warm** (panel, panel-2): panel-2 for table headers, row hover, neutral pills, and inset wells such as the demo-accounts box.
- **Hairline / Hairline Strong** (line, line-2): line for panel borders, row and section dividers; line-2 for input strokes, secondary-button borders and scrollbar thumbs.
- **Ink / Ink Soft / Ink Faint** (ink, ink-2, ink-3): primary text, secondary text and labels, and meta, placeholders and axis text.
- **Rail Ivory / Rail Muted** (rail-text, rail-muted): labels and muted icons or group labels on espresso.
- **Cream on Dark** (cream-on-dark): text on espresso buttons, toasts and the login art.

### Named Rules
**The Lit-Until-Opened Rule.** An unseen item carries a gold wash (gold at 16% fading to 5% across 70%), a 7px deep-gold dot with a 3px gold halo before a bold (800) title, and a gold-ink timestamp. Opening it moves it to gold-tint and the marker goes away. Nothing else in the UI uses this combination.

**The Gold Means Live Rule.** Gold surfaces are small: counts, dots, underlines, a 3px rail bar, focus rings. Gold-tint is the largest gold area allowed, and only for the selected or opened row.

**The State Pair Rule.** Every status uses its hue-dark text on its hue-pale tint, with no border. Never put a state hue on white as a solid fill.

## Typography

**Display Font:** Cormorant Garamond (with Georgia, Times New Roman)
**Body Font:** Manrope (with system-ui, Segoe UI, Roboto)
**Label/Mono Font:** Manrope; ui-monospace only for SKUs and codes

**Character:** A classical apothecary serif paired with a sturdy, slightly rounded grotesque. The serif signs the page and the grotesque does the work.

### Hierarchy
- **Display** (Cormorant 600, 30px, 1.05; 26px under 860px): page titles. Login art headline 44px, login card title 30px, rail wordmark 21px.
- **Headline** (Manrope 800, 24px, 1, -0.01em, tabular): KPI values only, with the unit in 13px 700 ink-3.
- **Title** (Manrope 700, 14.5px panel titles; 16px drawer titles; 17px dialog titles; 15px empty-state titles): section and container headings.
- **Body** (Manrope 500, 14px, 1.5): default. Tables and dense lists use 13.5px; meta and sub-lines 12–12.5px in ink-3.
- **Label** (Manrope 700, 12px, ink-2): field labels, KPI labels, section titles (13px). Table headers use 11.5px 700 with 0.03em tracking in ink-3, in sentence case.
- **Rail group** (Manrope 700, 10.5px, 0.13em, uppercase, rail-muted): navigation group names in the rail and the command palette only.

### Named Rules
**The Serif Stays at the Door Rule.** Cormorant appears on the brand mark, page titles and login headings. Never on numbers, buttons, table cells, panel titles or KPIs.

**The Tabular Figures Rule.** Money, counts, quantities, deltas, chart labels and rail counts set `tabular-nums lining-nums`. The body defaults to lining numerals.

## Layout

A two-column app shell: a sticky 248px espresso rail (collapsible to 72px icons) and a main column with a sticky 60px top bar (92% ivory with a 10px backdrop blur and a hairline bottom). Content pads 24px (16px under 860px). Page heads align the serif title and a 13.5px sub-line on the left with actions pushed right, 20px above content.

The rhythm is 16px between panels and grid cells, 18px inside panels, 14px table cell gutters, and 10px between inline controls. The common grids are two equal columns, three columns, and main plus a 360px side column (320px under 1280px). Home is a four-cell KPI strip in one bordered panel above a two-pane inbox (a 340–424px queue and the opened detail).

Responsive steps:
- **1100px:** the rail locks to icons, with counts as corner badges; the side column stacks; three columns become two.
- **860px:** the rail becomes an off-canvas 272px drawer behind a scrim, opened by a top-bar menu button. The inbox shows either queue or detail. KPIs go 2×2. Grids go single-column. The login art panel is replaced by a compact espresso brand header with bottles.
- **640px:** tables marked as stackable become cards: the first cell is the title and the rest pair up under 10.5px uppercase data labels.

## Elevation & Depth

Hybrid and quiet. Planes separate mostly by colour (espresso, ivory, white) and hairline borders. Shadows are warm (espresso-tinted, never neutral black) and come in three steps. Resting panels get the faintest one. Overlays get the deep one.

### Shadow Vocabulary
- **Rest** (`0 1px 2px rgba(43,33,24,.06)`): panels, the KPI strip, board cards, the selected segment, search-button hover.
- **Lift** (`0 4px 14px -4px rgba(43,33,24,.12), 0 1px 3px rgba(43,33,24,.06)`): primary-button hover and chart tooltips.
- **Overlay** (`0 24px 60px -18px rgba(30,23,17,.35), 0 4px 12px rgba(30,23,17,.08)`): drawers, dialogs, the command palette, toasts, the mobile rail.

Rings stand in for shadows on focus and current state: a 3px gold halo at 25% on focused inputs and on the lit dot, and 4px at 20% on the current order step.

### Named Rules
**The Warm Shadow Rule.** Every shadow is tinted with espresso, never grey or black. Overlay scrims use espresso-3 at 40–42%.

## Shapes

Softly rounded and consistent. Small controls and tags use 6–8px corners, standard controls and inner cards 10px, and panels, dialogs, the palette and board columns 14px. Pills, counts, the language switch, avatars and switches are fully round. Borders are 1px hairlines everywhere. Dashed lines are kept for subordinate dividers (order lines, the demo-accounts box) and the empty bottle outline. The one recurring silhouette is the bottle: a capped supplement bottle or a squat cosmetic jar.

## Components

### Buttons
Solid, compact and confident. The primary action is always the first button.
- **Shape:** gently rounded (10px; 8px at the 32px small size), height 38px (32 small, 44 large), Manrope 700 13px, 16px icons with an 8px gap.
- **Primary:** espresso with cream text. Hover raises to espresso-2 with the Lift shadow.
- **Gold:** gold with espresso-3 text, for brand-forward confirmations. Hover lightens slightly.
- **Secondary:** white with a line-2 border. Hover darkens the border to ink-3 and fills panel-2.
- **Ghost:** ink-2 text with no fill. Hover adds a 5% espresso wash.
- **Danger:** white with a terracotta-tint border and terracotta text. Hover fills with the danger tint.
- **States:** pressed moves down 1px; disabled is 50% opacity; loading replaces the label with a 16px spinner ring.

### Chips (pills and tags)
- **Status pill:** 24px, fully round, 700 11.5px, with a 6px currentColor dot leading. It follows the State Pair Rule. The neutral pill uses panel-2 with a hairline border.
- **Tag:** 22px, 6px corners, gold-soft and gold-ink, 700 11px. Used for categories.
- **Rail count:** a 20px gold pill with espresso-3 800 11px tabular numbers.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** white on the ivory ground.
- **Shadow Strategy:** Rest (see Elevation).
- **Border:** 1px line.
- **Internal Padding:** a 14×18px head with a hairline bottom, an 18px body, and a 12×18px foot. Flush panels drop the body padding for tables and lists.

### Inputs / Fields
- **Style:** 38px, white, 1px line-2 stroke, 10px corners, 12px horizontal padding, 500 weight. The label sits 6px above in 700 12px ink-2.
- **Hover / Focus:** hover darkens the stroke to ink-3. Focus turns the stroke deep gold and adds a 3px gold halo at 25%.
- **Error:** a terracotta stroke and 600 12px terracotta message. Hints use 12px ink-3.
- **Segmented control:** a 5% espresso trough with a 3px inset. The active segment is white with the Rest shadow. Counts are 11px ink-3 tabular.
- **Tabs:** 700 13px ink-2. The selected tab is ink with a 2px deep-gold underline over the hairline.
- **Switch:** a 36×20 track in line-2, sage when on.

### Navigation
- **Rail:** espresso. A 68px brand block (gold leaf mark, 21px Cormorant wordmark, 10.5px uppercase subtitle). Labelled groups use the rail-group style. Links are 38px, 600 13.5px rail-text, 18px rail-muted icons, 10px corners. Hover is espresso-2. Active is a 14% gold wash, near-white text, a gold icon and a 3px gold bar at the rail's left edge. Live counts sit right-aligned. "Coming soon" items are 50% opacity with an outlined 9.5px tag.
- **Top bar:** a search trigger (white, hairline, max 440px, with a Ctrl K keycap), the demo badge (amber pair with a dot), the UZ/RU pill switch (espresso when selected), and a user chip with a gold-soft avatar.
- **Command palette:** 620px, 14px corners, Overlay shadow, a 54px input, uppercase group headers, and gold-tint for the selected item.

### Action Queue (signature)
A list of 36px icon wells (neutral, amber warning, terracotta critical), a 600 13.5px title, a 12px ink-3 sub-line with inline pills, and a right-aligned time with a tabular amount. It follows the Lit-Until-Opened Rule. The opened item is gold-tint. Filters are a segmented control above the list.

### Bottle Stock Gauge (signature)
Each SKU is drawn as an SVG bottle (capped supplement) or jar (gold-lidded cosmetic) on panel-2 glass. The fill rises to the stock level: deep gold for supplements, espresso-2 for cosmetics, amber when low. Out of stock is an empty body with a dashed terracotta outline. A diagonal white sheen gives the glass. The name is 700 12px and the quantity 11.5px tabular, turning amber or terracotta at 800 when low or out. Laid out in an auto-fill grid of 104px minimum cells.

### Order Progress
Five 26px circles joined by 2px lines. Done steps are espresso with gold icons. The current step has a deep-gold stroke and a 4px gold halo. Upcoming steps are hairline. Labels are 700 11px below.

### Data Display
Tables use sticky panel-2 headers, 11×14px cells, hairline rows, panel-2 row hover and gold-tint selection. Product cells lead with a 40px bottle thumbnail on an ivory radial with a soft drop shadow. KPI strip cells are separated by hairlines and carry a small sparkline at the top right. Charts use dashed hairline grids, 10.5px ink-3 tabular axis text and espresso tooltips. Bar lists use 7px round tracks with deep-gold fills.

## Do's and Don'ts

### Do:
- **Do** land staff on the action queue. Make unseen items lit (gold wash, deep-gold dot, 800 title) and drop the mark once the item is opened.
- **Do** keep gold small and meaningful: counts, dots, the 3px rail bar, focus rings, underlines. Use gold-tint for at most the selected or opened row.
- **Do** set every status as its hue-dark on hue-pale pair with a 6px dot.
- **Do** use tabular lining numerals for every money, count and quantity column.
- **Do** separate planes with 1px warm hairlines and the Rest shadow. Save the Overlay shadow for drawers, dialogs, the palette and toasts.
- **Do** show products as real bottle cutouts on the ivory radial thumbnail, and stock as the bottle gauge.
- **Do** label demo data with the amber demo badge.

### Don't:
- **Don't** set Cormorant Garamond on numbers, buttons, table cells, panel titles or KPI values.
- **Don't** use neutral grey or black shadows or scrims. Tint them with espresso.
- **Don't** fill large areas with gold or a saturated state hue. Use state hues as text on their pale tint.
- **Don't** make a KPI-tile wall the landing screen. Today's numbers live in one slim strip above the queue.
- **Don't** add uppercase tracked labels above headings. Uppercase tracking is reserved for rail and palette group names and the stacked-table data labels.
- **Don't** mark unseen state with a typed glyph. Use the CSS dot from the lit treatment.
