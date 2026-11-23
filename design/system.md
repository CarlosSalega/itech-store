# iTech Store — design system

Status: **in force**. Approved by the owner, implemented in the Galería direction (T7/T8 of
`odd/tasks/public-catalog-mvp.md`) and carried by the live site. The project began with no token file,
no component library and no theme beyond the Next.js scaffold, so only four neutral values and the two
font families were inherited; everything else below was proposed here, adopted by the artboards in
`design/storefront/`, and then ported.

Direction: faithful to Apple's visual language — large type, generous whitespace, the product as
protagonist, restrained motion. The language is borrowed, the layout is not.

Revision 2 (bolder pass): the owner approved the palette, the Apple fidelity and the three directions,
and asked for conviction rather than new ideas. Nothing is re-hued and no direction is replaced. What
changed: the display scale is bigger and the steps between levels are real jumps instead of 1.2x
creeps, a numeral scale carries counts and figures, each page is allowed one monument, a full-bleed
rule became the shared structural device, and motion became authored (one moment per page) with
scroll-driven counting where the browser supports it. Every artboard keeps one signature detail that
no other direction uses; those are listed under "Signatures".

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

## How the system reaches the code

The values on this page reach the product through Tailwind's theme layer, and the rules that use them
are hand-written CSS Modules. The split is deliberate, and this is the only place that records it.

| Layer | Owns | Lives in |
| --- | --- | --- |
| Tokens | Every value specified on this page | `src/app/globals.css`, inside `@theme static` |
| Rules | Layout, type, motion, states | one `*.module.css` per component |

`@theme static` rather than plain `@theme` is a requirement, not a preference: the modules read tokens
through `var()`, so a pruned theme variable would break a module silently. The only Tailwind utility
used in `src/` is `sr-only`, for text that must be read by a screen reader and not shown.

Four primitives stay global in `src/app/globals.css` — `.wrap` (the content column), `.rule` (the
full-bleed hairline), `.skip` (the skip link) and `.sr-only` — because every surface uses them.
Everything else is a module that only its own component reads.

**Why the rules are hand-written.** Each artboard is a single self-contained HTML file with inline
CSS, because the canvas injects artboards through JavaScript and nothing there can be built. The
implemented direction was ported from that block, and one scoped module per component is the direct
translation of it. Expressing the same pages as utility classes would have re-decided values this
document and the artboards had already agreed on, after the owner had approved them.

**For whoever reads this next:** the absence of utility classes is the decision, not an unfinished
migration. Converting the modules to utilities redesigns the whole presentation layer and needs its
own approval; it is not a consistency fix.

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
| `--success` | `#1d7a3f` | proposed | A good state: a published product, a delta that went up, a delivered order (5.4:1 on white, 4.9:1 on `--surface`) |
| `--success-soft` | `#e8f5ec` | proposed | Ground behind a `--success` label or icon (4.8:1 with `--success`) |
| `--warning` | `#95650a` | proposed | Attention, not error: low stock, a variant at its last units (5.1:1 on white, 4.7:1 on `--surface`) |
| `--warning-soft` | `#fdf1dc` | proposed | Ground behind a `--warning` label or icon (4.5:1 with `--warning`, the tightest pair in the system) |
| `--danger` | `#b3261e` | proposed | Something is wrong or irreversible: a rejected field, a cancelled order, a destructive action (6.5:1 on white) |
| `--danger-soft` | `#fdecea` | proposed | Ground behind a `--danger` label or icon (5.7:1 with `--danger`) |
| `--accent-press` | `#0062c4` | proposed | Primary button pressed state |

Product photography in this catalog is white-background webp with no alpha. Light grounds put the
photo straight on white or on `--surface` with `mix-blend-mode: multiply`, so the white ground
dissolves into the tile. On `--canvas-dark` the photo does not dissolve: it sits in a lit case
(white tile, `--r-lg`, `radial-gradient(120% 100% at 50% 0%, #ffffff 0%, var(--surface) 100%)` and
no ring) on the black floor. Never crop a product photo to fill a frame: they are 640px wide and
contain their own margins.

The store is a light gallery end to end, so `:root` declares `color-scheme: light` and
`scrollbar-color: var(--hairline) var(--white)`: form controls and scrollbars stay light even when
the operating system asks for dark. The dark surfaces in the table above are latent — no route
renders one yet.

Rules: never put `--link` on a dark ground. On dark, text links are `--ink-dark` with a 1px
underline (`text-decoration-color: --hairline-strong`, `currentColor` on hover) and `--accent` is
reserved for fills, focus rings and the selected control — `--accent` on `--canvas-dark` measures
4.2:1, which is enough for a 3:1 focus ring and for white-on-accent button labels (4.7:1) but not for
body-size text. Never `--muted` on `--canvas-dark` (use `--muted-dark`, 7.7:1). Body text is always
`--ink` or `--ink-dark`, never a mid grey. Colour never carries meaning alone: an unavailable family
also changes wording, not only contrast.

Rules for the semantic layer:

- `--success`, `--warning` and `--danger` describe a **state**, never a decoration. Green means a
  good state, amber means attention, red means something is wrong or cannot be undone. There is no
  fourth colour: a neutral fact is `--muted`, and a neutral ground is `--surface`.
- Red is not a warning. A product about to run out is amber; a product the catalogue no longer sells,
  a cancelled order and a rejected field are red. If a chip could be both, it is amber until the
  state is terminal.
- Colour never carries the meaning alone. Every coloured icon keeps its shape and its word, or a
  visually hidden one: the delta arrow keeps its sign and its base, the published check keeps
  "Publicado", the low-stock mark keeps "sin capacidad" or the unit count.
- The semantic colours belong to the private panel and to form validation. The public catalogue stays
  monochrome over `--ink` and `--accent`: a shop window does not blink.

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
open. Never one fixed `letter-spacing`. The jump between levels is deliberate: display runs 3–5x body and
headline 1.25x body. Do not invent a level between display and display-s to soften a jump.

| Token | Size | Leading | Tracking | Weight | Usage |
| --- | --- | --- | --- | --- | --- |
| `--t-display` | `clamp(2.75rem, 7vw, 6rem)` | `0.92–0.95` | `-0.035em` | 600 | Hero statement: the one monument per page. 6rem is the ceiling |
| `--t-display-s` | `clamp(2rem, 4.6vw, 3.75rem)` | `1.02` | `-0.03em` | 600 | Section headline, variant price on a product page |
| `--t-numeral` | `clamp(2rem, 3.4vw, 3.25rem)` | `0.9–1` | `-0.04em` | 500 | Counts, index numerals, the monumental product's price; `tabular-nums` |
| `--t-title` | `clamp(1.375rem, 2.2vw, 1.875rem)` | `1.08` | `-0.022em` | 500/600 | Section headline (default), PDP name, family name |
| `--t-headline` | `1.3125rem` | `1.2` | `-0.012em` | 600 | Product name in a card, a row, a wall label |
| `--t-body` | `1.0625rem` | `1.47` | `0` | 400 | Body copy |
| `--t-body-s` | `0.9375rem` | `1.5` | `0` | 400 | Supporting copy, navigation |
| `--t-label` | `0.8125rem` | `1.3` | `0.01em` | 500 | Family counts, category labels |
| `--t-caption` | `0.75rem` | `1.35` | `0.015em` | 400 | Sample-data notice, metadata |

No text below 12px. `font-optical-sizing: auto` on headings. Numerals in prices use
`font-variant-numeric: tabular-nums`. Tracking never goes below `-0.04em` and display type never
exceeds 6rem: past those two marks the page stops being Apple's and starts being a poster.

Rules that keep the enlarged scale honest:

- One monument per page: one display statement, one large numeral, or one product moment. Everything
  else steps down immediately. Two monuments cancel each other out.
- Small text directly under display type is the jump. Do not fill the gap with a halfway size.
- A category, family or city label never sits above a heading as an eyebrow. The heading carries
  itself; if a label is needed it becomes the first line under the heading, or a caption line.

## Spacing

4px base; the steps above `--s-8` grow non-linearly so a page can go quiet. Layout is spacing,
not borders: gaps carry the grouping.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--s-1` | `4px` | `--s-6` | `32px` |
| `--s-2` | `8px` | `--s-7` | `48px` |
| `--s-3` | `12px` | `--s-8` | `64px` |
| `--s-4` | `16px` | `--s-9` | `88px` |
| `--s-5` | `24px` | `--s-10` | `120px` |
| | | `--s-11` | `160px` |

- Content column: `max-width: 1200px`, side padding `--s-5` (mobile) → `--s-8` (≥900px), and one
  step down to `--s-4` below 480px. At 320px the header has to fit the brand, its mark, two icon
  buttons and the menu trigger; the gutter gives way, never the touch targets.
- `--float-clearance: 96px` is the footer's reserve for the floating WhatsApp action (its height,
  its offset and a little air), added to the footer's own bottom padding. Without it the end of every
  page lives permanently under the button.
- Section rhythm is three values, and they alternate on purpose:
  `--section-tall: clamp(88px, 12vw, 176px)` for monumental and empty passages;
  `--section: clamp(64px, 9vw, 112px)` as the default;
  `--section-tight: clamp(40px, 5vw, 64px)` to pull a heading against what it introduces.
  Two adjacent sections never use the same rhythm.
- Density alternates: a tall section is followed by a tight one, a three-column wall by one line of
  text. Uniform stacked sections were removed in the bolder pass.
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

Authored, not scattered: each page has **one** moment of motion worth remembering, and everything
else is pointer feedback. Motion never carries meaning on its own — the final state is the default
state, so a reduced-motion user loses the animation and nothing else.

| Token | Value | Usage |
| --- | --- | --- |
| `--dur-1` | `120ms` | Press, hover colour |
| `--dur-2` | `220ms` | Card lift, image zoom, underline draw |
| `--dur-3` | `420ms` | Caption rules, wall-label ticks |
| `--dur-4` | `720ms` | The one authored moment: hero entrance, a case switching on |
| `--ease-std` | `cubic-bezier(.28,.11,.32,1)` | Apple's standard curve, in and out |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Small transitions that end at rest |
| `--ease-out-expo` | `cubic-bezier(.16,1,.3,1)` | Entrances and authored moments only |

- Feedback starts on pointer-down: `:active { transform: scale(.97) }`, `--dur-1`.
- Hover: linked card lifts `translateY(-2px)` and its photo zooms to `1.02` inside the frame;
  buttons step and press; nav underlines draw from the left; a wall label's hairline tick extends
  from `scaleX(.16)` to `scaleX(1)`.
- Entrance: the hero block enters once on load from `opacity:0`, `translateY(24px)` and `blur(6px)`,
  `--dur-4`, staggered 90ms per line (`--i` custom property). It is the only load animation on a page.
- Reveals past the fold use CSS scroll-driven animation only inside
  `@supports (animation-timeline: view())`: a count that runs from 0 to its real value
  (`@property` integer + `counter-reset`, so no script), and a hairline rule that draws down its
  column. Outside that support block the element is already in its finished state.
- The case / monument may switch on with `clip-path: inset(0 0 100% 0)` → `inset(0)`, once.
- No parallax, no tilt, no loop, no carousel, no full-screen scroll hijacking, no motion that
  requires a scroll to reveal meaning.
- `@media (prefers-reduced-motion: reduce)`: every animation is off and every transition is 0ms. The
  entrance block is fully visible, the wall-label tick is already drawn, the counted figure is set to
  its final integer, and nothing is left hidden or animating.

## Composition and layout

The bolder pass made composition part of the system, not an accident of the grid:

- **Full-bleed rule.** A 1px `--hairline` that ignores the content column
  (`margin-inline: calc(50% - 50vw)`) is the shared structural device; section boundaries and page
  divisions use it instead of a background change. Because it is measured in viewport units, which
  include the vertical scrollbar, the root declares `overflow-x: clip`; without it the document
  grows wider than the viewport the moment the vertical scrollbar appears. `clip` rather than
  `hidden` on purpose: it does not create a scroll container, so the sticky header keeps sticking
  to the viewport.
- **The rule carries no spacing of its own.** A page that puts the divider next to text owns the air
  around it, with a module modifier on its own stylesheet, never by changing the global `.rule`.
- **One monument per page.** Either one product hung at its largest possible size inside the column,
  one display-scale number, or one case that leaves the column. Never two.
- **Grid break, deliberately.** At most one element per page may leave the column: a photograph that
  crosses a rule, a case cropped by the viewport edge, or a tile that spans a different rhythm than
  its neighbours. It must be the same element on every screen size, and it must not be a product
  photograph cropped to fill a frame — the 640px source is a hard ceiling, the composition is not.
- **Asymmetric hanging.** A wall of product tiles is hung at two or three heights, not one; the
  largest item is placed by scale, not by position in the data.
- **Empty space is a material.** Every page keeps one passage with nothing in it. Silence costs
  nothing and buys the monument its weight.
- **Density contrast.** Dense rows or a tight wall sit directly against an empty band; the eye needs
  both to read either.

## Signatures

One memorable detail per direction. They are not interchangeable: a direction that borrows another
one's signature has stopped being a separate bet.

| Direction | Signature |
| --- | --- |
| Galería | **The wall label.** Every product hangs on the page with no tile, under a caption whose 1px tick is short until you hover it and then draws to the full caption width. |
| Índice | **The counted figure.** The real product count is set inside the sentence at numeral scale and counts up from 0 as it scrolls into view, above a numeral spine (01–06) that draws itself. |
| Vitrina | **The case that leaves the page.** The hero's lit case runs off the right edge of the window and is cropped by it, so the product sits in light that keeps going. |


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

**Header** — 48px (mobile) / 64px, sticky, `rgb(255 255 255 / 82%)` (dark: `rgb(10 10 10 / 82%)`)
+ `backdrop-filter: blur(20px) saturate(180%)`, never closed by a hard divider. Content scrolls
under it.
`<nav aria-label="Principal">`; a skip link is the first tab stop; below 900px the links live in a
`<details>` menu whose summary button states its own state ("Menú") and swaps its `menu` icon for
`close` when `[open]`, in CSS only. Search and cart are icon buttons at 44×44, each named by visually
hidden text rather than by a label on the glyph.

**Header pill, as implemented.** The live header is a floating bar, not a full-width strip: inset
`--s-3` from the top, width `min(1200px, calc(100% - 2 * var(--header-inset)))`, `--r-lg`, edged by
`--e-hairline` plus `--e-float` instead of a bottom border, sitting over the content instead of
dividing it. Its ground is `rgb(255 255 255 / 82%)`, because a bar that floats over a product
photograph does not hold 4.5:1 at 72%. Behind the blur it is the same
`blur(20px) saturate(180%)`; where `backdrop-filter` is unsupported the fallback is opaque
`--white`, since translucent-but-unreadable is worse than plain. The pill declares no
`overflow: hidden`: the mobile menu panel hangs below it and would be clipped.

The alignment is arithmetic, and it is the reason the bar stopped using the global `.wrap`. The pill's
side inset is a custom property (`--header-inset`: `--s-4` normally, `--s-2` below 480px) and the bar's
`padding-inline` is the page gutter **minus** that inset — `8 + 8 = 16` below 480px,
`16 + 8 = 24` below 900px, `16 + 48 = 64` from 900px up. Content sits at inset plus padding, which
is exactly the page gutter, so the brand stays on the same axis as the hero text at every width
instead of drifting by the inset. The pill inset is what keeps real inner padding at 320px: adding
padding instead of halving the inset would push the brand off the page axis.

Two optical corrections belong to the same family. `.tools` is outdented by the residual inset
between the pill edge and the glyph — a 44px icon button centres a 20px glyph, leaving 12px — capped
below by the bar's padding so the touch target never spills outside the pill: `--s-2` below 900px,
`--s-3` from 900px up. And `.logo` is nudged by `translateY(-0.12em)`, in `em` on purpose: the offset
is a fraction of the font size, so one value holds at the 17px brand and at the 15px mobile one,
where a px-per-breakpoint pair is correct at exactly one size. Geometry symmetric, perception not.

Below 480px the brand name takes one step down to `--t-body-s` and the menu trigger drops its
label, keeping its accessible name through `aria-label` in the markup; the icon alone stays. The
bag, the search glyph and the menu trigger are 44px targets, and a disabled icon button reads as
inert at `opacity: 0.45`, the same value the pager uses. Search is a link to `/catalogo`: there is no
search box, and the icon says so by going where an item would be found.

The store mark is a committed 809-byte SVG rendered with a plain `<img>` (`alt=""`, decorative), not
through `next/image`: the framework does not optimise an SVG, and because the file is committed,
nothing here couples the build to the gitignored `public/products`.

**Icons** — one set, drawn in this repository: `search`, `bag`, `menu`, `close`, `chevron-right`. A
24×24 viewBox, `stroke-width` 1.6, `stroke-linecap="round"`, `stroke-linejoin="round"`,
`fill="none"` and `stroke="currentColor"`, so an icon inherits the palette of its ground. Size comes
from CSS only — 16 in a text button, 20 in the header — never from a `width`
or `height` inside the SVG. Every SVG is `aria-hidden="true"` and `focusable="false"`; the accessible
name belongs to the button or link that contains it. `chevron-right` replaces the `›` glyph wherever
it was decorative. Inline SVG only: no icon font, no sprite file, no downloaded asset.

**Icon grid in code** — the convention is written at the top of the icon module
(`src/features/catalog/icons.tsx`, hoisted to `src/components/icons.tsx` by
`odd/tasks/catalog-layout.md` S2), and every glyph spreads one shared `iconProps` object, so a new
glyph cannot drift from the grid: twenty-four unit viewBox, 1.6 stroke, round caps and joins,
`currentColor`, `fill="none"`, `aria-hidden="true"`, `focusable="false"`. Size comes from the
class the caller passes, never from a `width` or `height` inside the SVG, and every glyph is
decorative: the accessible name belongs to the button or link that contains it. The set has grown
since this section was written; it now carries ten glyphs — `search`, `bag`, `menu`, `close`,
`chevron-left`, `chevron-right`, `check`, `minus`, `plus`, `trash`.

**Field + message slot** — every field a schema can reject is one stack of three parts: the label, the
control, and a message lane. The lane is **always rendered**, before any message exists, and it is never
revealed, animated, collapsed or removed: `min-height: calc(var(--t-caption) * 1.35 + var(--s-1))`
plus `padding-top: var(--s-1)` reserves exactly one `--t-caption` line and the gap above it, so the
button under it does not move when a message arrives (`src/app/login/login.module.css`,
`src/features/admin/ui/product-form.module.css`, `src/features/checkout/ui/wizard.module.css`). The
form-level message owns the same lane in the same place in the form's stack; a standing help note is
its own line above the lane, never inside it.

The lane is `aria-live="polite"` and its control points at it with `aria-describedby` — the help id
first, the lane id second, when both exist. `aria-invalid="true"` is present only while the field is
rejected and is absent otherwise, never `false`: the red ring and the message appear together.
Validation runs on submit; after the first failed submit it revalidates as the visitor corrects the
field, and it never runs on the first keystroke of a pristine field. On submit, focus moves to the
first rejected field. A form-level failure is one line in its lane and carries `role="alert"`: the
screen reader announces it and the layout does not move.

**One line is the contract, and the ceiling is 44 characters.** `MESSAGE_MAX_LENGTH = 44`, exported by
`src/lib/validation/copy.ts`, is the longest message the system allows: 44 characters, counted the way
JavaScript counts a string (`message.length`), not graphemes or bytes. Every shipped message is
asserted against that same constant (`message.length <= MESSAGE_MAX_LENGTH`) by the schema tests, so
the document and the code cannot drift apart. On the login at 320px the lane is 288px wide, and the
longest shipped message — `El email o la contraseña no son correctos.`, 42 characters — renders 231px
of it in `--t-caption`. A longer sentence grows the lane and brings the shift back, so it is never the
fix: a message that cannot be said in 44 characters is not a message.

**A static note never lives inside a lane.** A sentence that is always true cannot fit a one-line
reservation, and placing it there is exactly what turned the login's credential note into three lines
of a one-line lane at 320px. It belongs in its own place on the page with its own room: the login's
standing notes are their own block under the form (`src/app/login/login-notes.tsx`), and the admin
form's help note is its own line above the lane. The lane only ever holds a message that exists
because a value was rejected.

**Button** — two styles only. Primary: pill, `--accent` fill, white label, min-height 44px,
`padding: 0 24px`, press `scale(.97)`. Secondary: text link, `--link`, with a `chevron-right` that
moves 2px on hover. A text button is never styled as a bordered box. An action that cannot be used
is disabled, reads as inert and says why: `--surface` ground with an inset `--hairline`, `--muted`
label, `cursor: not-allowed`, and a `--t-caption` `--muted` note under it linked by
`aria-describedby` (`src/features/catalog/ui/variant-selector.module.css`, `ui/variant-selector.tsx`).

**Product card** — `<article>`: image tile (`--surface`, `--r-lg`, 4:3, `object-fit: contain`,
`padding: --s-5`), then name (`--t-headline`), then price block, then optional capacity note. The
whole card is not a link: the name is, and the tile is inside it. Card lift + photo `1.02` on hover,
and hovering anywhere on the card turns the name `--link` (`:focus-within` on the card keeps the
keyboard path the same), so the card announces its link before you reach the name.
A direction may change the container: Galería hangs the photo on the page with no tile and captions
it (wall label), and Vitrina puts the dominant product in a case at 2×2 while its neighbours stay
1×1. The name / price / capacity order and the link rules never change. Photography is rendered with
a plain `<img>`, never `next/image`: `/products` is gitignored and absent on a fresh clone, so the
build must never depend on those files existing, and the local `no-img-element` rule is silenced for
exactly that reason (`src/features/catalog/ui/product-card.tsx`).

The **wall label** is the light-ground caption form: 1px `--hairline` on top (short tick that extends
on hover), name at `--t-headline`, then one caption line of family and price at `--t-label`; on the
monumental work the price steps up to `--t-numeral`.

**Fallback tile** — when a product has no image (fresh clone, S13), the tile keeps its size and
ground, shows `/placeholder.webp` as a decorative `<img alt="">` and a `--t-label` `--muted` line
"Imagen no disponible" as the accessible state. Name and price still render; the card keeps its
place in the grid.

**Family rows** — the families are hung as rows, one hairline under each, never as tiles
(`src/features/catalog/ui/family-list.module.css`).

**Empty family** — a family with zero products keeps its entry, drops its count to "0 productos",
uses a dashed `--hairline` edge, the sentence `¿Buscás algo que no está?` and a `Consultanos` link
to `/contacto` with the same chevron the filled rows use. It is never hidden and never faked with a
stock photo.

**Capacity selector** — fieldset + radio group ("Capacidad"), one label per `Variant`, pill
`--r-pill`, min-height 44px, unselected: `1px solid --hairline` on the page ground; selected:
`--ink` fill with `--white` label (on dark: `--ink-dark` fill with `--canvas-dark` label); each label
shows its own price underneath in `--t-label`, at `rgba(255,255,255,.74)` on the light selection and
`rgba(10,10,10,.62)` on the dark one. Focus ring is always visible on the label. Keyboard: arrows
move between options, as native radios do.

**Pager** — plain links on a hairline under the wall, and every control is a 44×44 target: the two
steps, each number, the current marker and the narrow-screen position label all keep that size. The
steps are chevrons whose words live in `aria-label` ("Página anterior" / "Página siguiente"), so the
arrow alone carries the meaning and takes no width from the numbered strip. The strip never wraps;
it scrolls sideways instead, with ring-room padding and an equal negative margin so a focus ring
painted outside a number is not clipped. The step that does not exist on this page is never a dead
link: it keeps its place, reads as unavailable with the header's disabled `0.45`, and does not react
to the pointer. Below 600px the strip is replaced by the current position, because seven 44px
targets need 332px and 320px leaves the pager 272px: the pager stays one row and every target keeps
its size, so only the presentation changes, never the target. Every rule in this paragraph was
carried by a comment in `src/features/catalog/ui/catalog-pagination.module.css` until
`odd/tasks/catalog-layout.md` T2 (spec S5) deleted every prose comment in the feature; this section
is now its only record.

**Sample-data notice** — one per page, in the footer, `--t-caption` `--muted`:
"Los precios de este catálogo son de ejemplo y no son precios de venta." Never a banner, never a
toast, never repeated per card.

**Footer** — the notice above, then a column grid that auto-fits at 200px from 700px up, because the
editorial picks column is conditional: three columns on the landing, two on the catalogue and the
contact page. Family entries link into the catalogue with the filter applied. The bottom padding
carries `--float-clearance` (see Spacing).

**Family filter** — the same pill language as the capacity selector, and every chip keeps its 44px
target. Below 600px the chips stop wrapping and become one horizontal strip (`flex-wrap: nowrap`,
`overflow-x: auto`, hidden scrollbar, children `flex: none`, scroll snapping): six chips wrapped into
three ragged rows and ate half a 320px screen, so the presentation changes and the information does
not. The strip reserves ring room with `--s-1` of padding plus an equal negative margin, so a focus
ring painted outside a chip is not clipped, and `--s-6` of right padding so the last chip can scroll
clear of the edge fade. The fade is a `mask-image` on the scroller, which needs no extra element and
no script; the cost is that it cannot switch itself off at the end of the scroll, which is why the
chips may wear one and a pager of two pages may not.

**Product page** — the main photograph hangs with no tile under it (`mix-blend-mode: multiply`), and
the wall label under it is the page's `<h1>`; its tick is short until hover or focus. Every photo of
the product is rendered: a four-column numbered strip of small works, each on its own hairline, with
the index in `--t-caption` and `tabular-nums`. The facts of the product are a sheet of ruled rows
(two columns from 760px up, `dd` right-aligned in `tabular-nums`), and the related works use the
same two-height wall as the catalogue. Photography is a plain `<img>` here for the same reason as
the product card: `public/products` is gitignored and absent on a fresh clone.

**WhatsApp action** — fixed to the bottom-right (`position: fixed`, `z-index: 30`,
`env(safe-area-inset-bottom)`), so it never takes part in layout and cannot contribute a horizontal
scrollbar. The mark is the owner's `public/whatsapp.svg` at 56px with 8px of padding around it, which
is a 72px touch target; 48px is the ceiling for a glyph-only button because a standard FAB is 56px of
surface around a 24–28px glyph, and 56px is large-FAB territory that deliberately overlays more
product photography. The mark carries its own brand gradient and needs no palette colour. Its label
("Escribinos") is an ink pill of exactly 26px height — a fixed height rather than vertical padding,
so it does not drift with the line box — `--t-label`, `aria-hidden` because the accessible name comes
from `aria-label`, and it appears on hover and keyboard focus while sliding 4px. Below 600px it is
hidden: a label gated on hover is never seen on touch and would still take space from the icon. While
the store's number is unconfirmed the button links to `/contacto` instead of opening a chat that
cannot exist (see `docs/contact-channels.md`).

## Self-check for artboards

Allowed colours: the ramp above plus `currentColor` and transparent shadows. Allowed faces: the
system stack defined here. Any artboard that introduces a fifth neutral, a second accent or a new
section rhythm is wrong and must be corrected here first.

Static checks that must pass before an artboard is handed over:

1. One `<h1>`, `lang="es-AR"`, landmarks (`header`, `main`, `footer`, `nav` with a label), sections in
   the documented order, at least six real products, the sample-data notice exactly once.
2. Every `img` carries `alt`; every `/products/...` and `/placeholder.webp` reference exists on disk;
   `/placeholder.webp` appears on every page; the 640px ceiling is never exceeded.
3. Every product name and price exists in `prisma/seed/products.json` and follows the price rules
   above.
4. No external URL except one Google Fonts link, and no note about where the catalog came from.
5. One monument, one grid break, three section rhythms, one signature.
6. `prefers-reduced-motion: reduce` in every file that has motion, and it must end in the finished
   state (drawn tick, final count, visible case).
7. Visible focus on every control, 44px minimum target, 4.5:1 body text, readable at 375px. Icon
   buttons keep the 44px target and their name in text, never only in the drawing.
8. Every field a schema can reject carries its always-present message lane, with `aria-live="polite"`
   and `aria-describedby`; every message drawn in a lane is one `--t-caption` line inside the
   44-character ceiling; and no static note is drawn inside a lane.
