# iTech Store — design system

Status: **proposed starter system**. The project has no token file, no component library and no
theme beyond the Next.js scaffold, so only four neutral values and the two font families are
inherited; everything else is proposed here and adopted by the artboards in
`design/storefront/`. Accept or change it before implementation (`odd/tasks/public-catalog-mvp.md`,
T6 → T7/T8).

Direction: faithful to Apple's visual language — large type, generous whitespace, the product as
protagonist, restrained motion. The language is borrowed, the layout is not.

## Sources read

| Source | Taken |
| --- | --- |
| `src/app/globals.css` | `--background: #ffffff`, `--foreground: #171717`; dark `#0a0a0a` / `#ededed`; body font `Arial, Helvetica, sans-serif` |
| `src/app/layout.tsx` | `Geist` → `--font-geist-sans`, `Geist_Mono` → `--font-geist-mono`, `lang="en"` (must become `es-AR`), `antialiased` |
| `src/app/page.tsx` | Store name `iTech Store` |
| `prisma/seed/products.json`, `prisma/seed.ts` | Product names, slugs, image paths, capacity variants, sample price rule (integer cents ARS) |
| `odd/tasks/public-catalog-mvp.md` | S4 (no source-site reference), S7 (sample prices marked), S11 (routes), S13 (`/placeholder.webp`) |

Two scaffold defects to fix at implementation, not in the artboards: `globals.css` sets
`font-family: Arial…` on `body`, which discards the Geist faces loaded in `layout.tsx`; and
`layout.tsx` declares `lang="en"` for a Spanish store.

## Colour

Neutral ramp only. No hue is spent on decoration; the single blue is interaction.

| Token | Value | Source | Usage |
| --- | --- | --- | --- |
| `--white` | `#ffffff` | globals.css | Page ground (light), text on dark surfaces |
| `--ink` | `#171717` | globals.css | Body and heading text on light |
| `--muted` | `#6e6e73` | proposed | Secondary text, counts, "Desde", sample notice (4.6:1 on `--surface`, 5.1:1 on white) |
| `--hairline` | `#d2d2d7` | proposed | 1px rules, tile borders, unselected control borders |
| `--surface` | `#f5f5f7` | proposed | Product tiles, banded sections, image panels |
| `--canvas-dark` | `#0a0a0a` | globals.css | Dark page ground |
| `--surface-dark` | `#101010` | proposed | Dark tiles and panels |
| `--surface-raised` | `#161618` | proposed | Hover fill of a dark control or menu panel |
| `--hairline-strong` | `#3a3a3d` | proposed | Edge of a dark control on hover |
| `--ink-dark` | `#ededed` | globals.css | Text on dark |
| `--muted-dark` | `#a1a1a6` | proposed | Secondary text on dark (8.2:1 on `#0a0a0a`) |
| `--hairline-dark` | `#262628` | proposed | 1px rules and tile edges on dark |
| `--link` | `#0066cc` | proposed | Text links on white and `--surface` (5.0:1) |
| `--accent` | `#0071e3` | proposed | Primary button fill, focus ring, selected control (white text 4.7:1) |
| `--accent-press` | `#0062c4` | proposed | Primary button pressed state |

Product photography in this catalog is white-background webp with no alpha. Light grounds put the
photo straight on white or on `--surface` with `mix-blend-mode: multiply`, so the white ground
dissolves into the tile. On `--canvas-dark` the photo does not dissolve: it sits in a lit case
(white tile, `--r-lg`, `radial-gradient(120% 100% at 50% 0%, #ffffff 0%, var(--surface) 100%)` and
no ring) on the black floor. Never crop a product photo to fill a frame: they are 640px wide and
contain their own margins.

Rules: never put `--link` on a dark ground (use `--accent`) and never `--muted` on `--canvas-dark`
(use `--muted-dark`). Body text is always `--ink` or `--ink-dark`, never a mid grey. Colour never
carries meaning alone: an unavailable family also changes wording, not only contrast.

## Typography

Faces: **Geist Sans** (declared, `src/app/layout.tsx`) in production. Artboards are static files, so
they use the system stack, which is also the correct fallback and the closest match to the platform
face Apple ships:

```
font-family: -apple-system, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue",
  Arial, sans-serif;
```

Geist Mono / `ui-monospace` only for capacity and SKU strings if ever shown alone.

Tracking is size-specific and leading is inverse to size: large type tightens, small type drifts
open. Never one fixed `letter-spacing`.

| Token | Size | Leading | Tracking | Weight | Usage |
| --- | --- | --- | --- | --- | --- |
| `--t-display` | `clamp(2.5rem, 6.4vw, 5.5rem)` | `1.02` | `-0.03em` | 600 | Hero headline |
| `--t-display-s` | `clamp(2rem, 4.4vw, 3.5rem)` | `1.05` | `-0.022em` | 600 | Section headline (large) |
| `--t-title` | `clamp(1.5rem, 2.6vw, 2.25rem)` | `1.1` | `-0.016em` | 600 | Section headline (default), PDP name |
| `--t-headline` | `1.3125rem` | `1.2` | `-0.01em` | 600 | Card name, index row |
| `--t-body` | `1.0625rem` | `1.47` | `0` | 400 | Body copy |
| `--t-body-s` | `0.9375rem` | `1.5` | `0` | 400 | Supporting copy, navigation |
| `--t-label` | `0.8125rem` | `1.3` | `0.01em` | 500 | Family counts, category labels |
| `--t-caption` | `0.75rem` | `1.35` | `0.015em` | 400 | Sample-data notice, metadata |

No text below 12px. `font-optical-sizing: auto` on headings. Numerals in prices use
`font-variant-numeric: tabular-nums`.

## Spacing

4px base, 8-step rhythm. Layout is spacing, not borders: gaps carry the grouping.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--s-1` | `4px` | `--s-6` | `32px` |
| `--s-2` | `8px` | `--s-7` | `48px` |
| `--s-3` | `12px` | `--s-8` | `64px` |
| `--s-4` | `16px` | `--s-9` | `88px` |
| `--s-5` | `24px` | `--s-10` | `120px` |

- Content column: `max-width: 1200px`, side padding `--s-5` (mobile) → `--s-8` (≥900px).
- Section rhythm: `clamp(64px, 9vw, 120px)` block padding. Sections breathe; they do not stack tight.
- Grid gutters: `--s-4` mobile, `--s-5` desktop. Card internal padding: `--s-5`.
- One section per screen at 1440×900 is the target, not a rule: on a phone every section grows and
  nothing may overlap.

## Radii

| Token | Value | Usage |
| --- | --- | --- |
| `--r-sm` | `8px` | Capacity option, small tile |
| `--r-md` | `12px` | Image inside a card |
| `--r-lg` | `18px` | Product card, panel, image tile |
| `--r-xl` | `28px` | Large image panel |
| `--r-pill` | `980px` | Buttons, chips, segmented control |

One scale, one shape per role: cards are never pills, buttons are never rectangles.

## Elevation

Apple leans on hairlines and grounds, not shadows. Shadows are reserved for surfaces that float.

| Token | Value | Usage |
| --- | --- | --- |
| `--e-hairline` | `inset 0 0 0 1px var(--hairline)` | Tile edge on a light ground |
| `--e-float` | `0 1px 0 rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.06)` | Sticky header, mobile menu |
| `--e-lift` | `0 12px 32px rgba(0,0,0,.10)` | Card hover lift (light ground) |
| `--e-lift-dark` | `0 12px 32px rgba(0,0,0,.55)` | Card hover lift (dark ground) |

Depth never exceeds one level inside another panel (no card in a card in a card).

## Motion

Restrained: motion confirms a pointer, never performs.

| Token | Value | Usage |
| --- | --- | --- |
| `--dur-1` | `120ms` | Press, hover colour |
| `--dur-2` | `220ms` | Card lift, image zoom, underline draw |
| `--dur-3` | `420ms` | Hero entrance, section reveal |
| `--ease-std` | `cubic-bezier(.28,.11,.32,1)` | Apple's standard curve, in and out |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Entrances only |

- Feedback starts on pointer-down: `:active { transform: scale(.97) }`, `--dur-1`.
- Hover: linked card lifts `translateY(-2px)` and its photo zooms to `1.02` inside the frame;
  buttons step and press; nav underlines draw from the left.
- Hero enters once on load (opacity 0→1, `translateY(8px)`→0, `--dur-3`, staggered ≤120ms).
- Nothing animates because the page scrolled. No parallax, no tilt, no loop, no carousel.
- `@media (prefers-reduced-motion: reduce)`: all transitions become 0ms opacity only; the entrance
  is static; nothing is left hidden.

## Price and price variants

Money is integer cents in the database (ARS, `Product`/`Variant.price`) and never leaves the
formatter as cents. Display rule: **`$` + regular space + grouped integer, no decimals**, es-AR
thousands separator (`Intl.NumberFormat("es-AR")`), e.g. `$ 1.500.000`.

| State | Markup | Rule |
| --- | --- | --- |
| Single price | `$ 900.000` | `--t-body`/`--t-headline`, 500 weight, `tabular-nums`; the `$` is `--muted` at `0.85em` |
| Range start | `Desde $ 900.000` | Only when the product has two or more `Variant` capacities. "Desde" is `--t-label` `--muted` on its own line above the amount |
| Variant prices | `128 GB · $ 900.000` | Each capacity option carries its own price; the amount is what changes |
| Selected variant | — | The price block is the live variant price, always directly under the selector |
| No price | — | Product without a variant is not renderable; the seed always prices every SKU |

`Product` is the umbrella, `Variant` is what you buy. Every surface says which one it shows:
a card is a `Product` (so it shows "Desde" when capacities differ), the detail is a `Variant` (so it
shows exactly one price and one SKU). Never average, never show the max, never hide the capacity.

## Components

**Header** — 48px (mobile) / 64px, sticky, `rgba(255,255,255,.72)` (dark: `rgba(10,10,10,.72)`)
+ `backdrop-filter: blur(20px) saturate(180%)`, closed by a hairline bottom edge, never a hard
divider. Content scrolls under it.
`<nav aria-label="Principal">`; a skip link is the first tab stop; below 900px the links live in a
`<details>` menu whose summary button states its own state ("Menú").

**Button** — two styles only. Primary: pill, `--accent` fill, white label, min-height 44px,
`padding: 0 24px`, press `scale(.97)`. Secondary: text link, `--link`, with a `›` that moves 2px on
hover. A text button is never styled as a bordered box.

**Product card** — `<article>`: image tile (`--surface`, `--r-lg`, 4:3, `object-fit: contain`,
`padding: --s-5`), then name (`--t-headline`), then price block, then optional capacity note. The
whole card is not a link: the name is, and the tile is inside it. Card lift + photo `1.02` on hover.

**Fallback tile** — when a product has no image (fresh clone, S13), the tile keeps its size and
ground, shows `/placeholder.webp` as a decorative `<img alt="">` and a `--t-label` `--muted` line
"Imagen no disponible" as the accessible state. Name and price still render; the card keeps its
place in the grid.

**Empty family** — a family with zero products keeps its entry, drops its count to "0 productos",
uses a dashed `--hairline` edge and one sentence of plain copy plus a link to `/contacto`. It is
never hidden and never faked with a stock photo.

**Capacity selector** — fieldset + radio group ("Capacidad"), one label per `Variant`, pill
`--r-pill`, min-height 44px, unselected: `1px solid --hairline` on the page ground; selected:
`--ink` fill with `--white` label (on dark: `--ink-dark` fill with `--canvas-dark` label); each label
shows its own price underneath in `--t-label`, at `rgba(255,255,255,.74)` on the light selection and
`rgba(10,10,10,.62)` on the dark one. Focus ring is always visible on the label. Keyboard: arrows
move between options, as native radios do.

**Sample-data notice** — one per page, in the footer, `--t-caption` `--muted`:
"Los precios de este catálogo son de ejemplo y no son precios de venta." Never a banner, never a
toast, never repeated per card.

## Self-check for artboards

Allowed colours: the ramp above plus `currentColor` and transparent shadows. Allowed faces: the
system stack defined here. Any artboard that introduces a fifth neutral, a second accent or a new
section rhythm is wrong and must be corrected here first.
