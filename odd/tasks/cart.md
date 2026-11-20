# Shopping cart — side drawer

Feature branch `feat/cart`. Visual source: `design/cart/02-cart-drawer.html` (direction chosen by the owner). Token source: `design/system.md`. This document is the specification the worker reads; read it whole, including the log.

## Specs

S1 — Direction. The cart is the **480px side drawer** (`02 · Panel lateral`), chosen by the owner over the full page (`01`) and the fixed-bottom counter (`03`). It opens over whatever the visitor is looking at and does not take a route of its own.

S2 — Panel anatomy, in this order: header with the title `Tu carrito`, the count in the form `4 productos · 5 unidades`, and a close button labelled `Cerrar el carrito`; the `Recién agregado` block; the list of lines; the empty state (mutually exclusive with the list); the footer with the total, `Finalizar compra`, `Seguir comprando` and the caption below.

S3 — Semantics and behaviour. The panel is a modal dialog: `role="dialog"`, `aria-modal="true"`, labelled by its title. Escape closes it, a click on the scrim closes it, the close and `Seguir comprando` buttons close it. Focus moves into the panel when it opens, is trapped inside while open, and returns to the control that opened it when it closes. The page behind does not scroll while the panel is open. Opening it must not lose the scroll position of the page behind.

S4 — Each line renders the product image, the product name as a link to its product page, the variant label (`Capacidad 256 GB` when the variant has a capacity, otherwise the product's family label), a quantity stepper, a remove button and the line total. The stepper is a labelled group; its `−` and `+` buttons carry accessible names naming the product, and its current quantity is an `aria-live="polite"` output. The remove button is labelled `Quitar <producto> del carrito`. Quantity never goes below 1 through the stepper; removing a line is the remove button's job.

S5 — `Recién agregado`. Right after a product is added, the panel shows that line once in a block above the list, with the label `Recién agregado`, the line total and `Accesorios · cantidad 2`-style context (family · quantity). The block disappears when the cart is closed, so reopening the cart does not claim something was just added.

S6 — Empty state: the bag mark, the heading `Tu carrito está vacío`, the copy `Agregá un producto y va a aparecer acá con su capacidad, la cantidad y el total.` and a link `Ver el catálogo` to `/catalogo`. The footer keeps the total (`$ 0`) and hides `Finalizar compra`, because there is nothing to check out.

S7 — Footer: the total of the cart, formatted by the existing `formatArsPrice`; `Finalizar compra` primary, **enabled**, leading to `/finalizar-compra`; `Seguir comprando` secondary, which closes the panel; and the caption `El envío se coordina al finalizar. Los precios son de ejemplo y no son precios de venta.` Shipping has no computed cost, by the owner's decision ("Mantener \"se coordina al finalizar\"").

S8 — Persistence. The cart lives in `localStorage` under a versioned key, read and written only on the client, behind a small repository module so that a database-backed cart can replace that module without touching any component. A corrupt, foreign or partially invalid stored value degrades to an empty cart; it never throws and never takes the page down. Storage errors (quota, private mode) are swallowed the same way.

S9 — Prices are never trusted from storage. The cart stores a snapshot only to render something immediately; opening the panel revalidates every line against the database through a server action and replaces name, variant label, image, unit price and availability with the authoritative values. A line whose variant no longer exists or is unpurchasable is flagged and cannot be purchased; the total covers only purchasable lines. If the revalidation itself fails, the cart renders the snapshot and says the prices could not be verified — it does not silently pretend they are current.

S10 — Entry points. The header's bag button is live: it opens the panel and shows the units count as a badge when it is above zero. The product page's `Agregar al carrito` is enabled for a variant with stock, and adding opens the panel with that line marked `Recién agregado`. A variant with no stock keeps the action disabled and says so.

S11 — `/finalizar-compra` is an honest placeholder, not a dead end: it states that online payment is not available yet and offers the real contact channel from `/contacto`. It is reachable from the panel and returns to the catalogue. It reads the cart and lists what was being purchased, or explains the cart is empty.

S12 — Money is integer ARS cents everywhere, except where `formatArsPrice` renders it. Quantities are integers. No floating-point arithmetic on prices in any path.

S13 — Copy is Argentine Spanish with voseo, quoted here verbatim where it is fixed above; product names are never translated. All artboard copy above is the exact string to render.

## Tasks

- T1 — Cart domain and storage: types, pure reducers, totals, summary label, versioned `localStorage` repository with defensive parsing. Route: inline. Tests first. Commit: `0f29bea feat(cart): add the cart domain and a defensive local repository` — done. Specs: S4, S5, S6, S8, S12.
- T2 — Panel component: dialog semantics, focus trap, scroll lock, lines, stepper, remove, `Recién agregado`, empty state, footer, tokens from `design/system.md`. Route: inline. Commit: `6b60dbf feat(cart): build the side drawer over the cart domain` — done. Specs: S1–S7, S13.
- T3 — Wiring: cart provider in the layout, live header trigger with badge, `Agregar al carrito` in the variant selector. Route: inline. Commit: `f1861aa feat(cart): open the drawer from the header and the product page` — done. Specs: S10, S13.
- T4 — Price revalidation server action and its UI states. Route: inline. Commit: `54f327b feat(cart): revalidate stored prices against the catalogue` — done. Specs: S9, S12.
- T5 — `/finalizar-compra` placeholder page. Route: inline. Commit: `1a3c22a feat(cart): add the checkout placeholder route` — done. Specs: S11, S13.
- T6 — Verification and evidence. Route: inline. Commits: `6a7423a feat(cart): keep the newest line editable inside its confirmation block`, `adf00ba docs(cart): record the feature verification and link it from the design`, `b06ee90 fix(cart): lock the document scroller so the sticky header keeps its place`, `c84089b feat(cart): mark the drawer title with the bag`. Specs: S1–S13.

## Verification

Run on `feat/cart`:

- `pnpm test` — 15 files, 144 tests, all green. The cart's own: `cart.test.ts` (15), `cart-storage.test.ts` (10), `cart-store.test.ts` (6), `cart-revalidation.test.ts` (7).
- `pnpm typecheck` — clean.
- `pnpm lint` — clean. The first provider draft hydrated through a `useEffect` and the React 19 compiler rule `react-hooks/set-state-in-effect` rejected it; the cart became an external store read through `useSyncExternalStore` (`cart-store.ts`), which is also why the server renders the empty cart and the browser the stored one with no hydration mismatch.
- `pnpm build` — clean; `/finalizar-compra` appears as a static route.
- Structural readback of the panel against the artboard: 16/16 required strings and attributes present (dialog role and `aria-modal`, the close label, the count, `Recién agregado`, the empty-state copy, the total label, both CTAs, the shipping caption); the drawer carries no `h1` because the page owns it, and it uses one `h2` and one `h3`.
- **Not verified**: the browser pass. The owner runs every dev server and none was running for this session, so there is no screenshot comparison between the drawer and `02-cart-drawer.html` yet, and stored-cart behaviour was proven against a fake `localStorage`, not a real browser profile.

## Delivery

Merged to `main` as a chain of nine stacked pull requests (#2–#10), each one targeting the slice before it so every diff was exactly one work unit: the design (#2), the domain and its repository (#3), the panel (#4), the wiring (#5), the price revalidation (#6), the checkout placeholder (#7), the polish (#8), the skills lock (#9) and the drawer title mark (#10). The feature is about 5.7k authored changed lines in total, far past the ~400-line review slice; the chain was the alternative to a `size:exception`. Slices #2, #3 and #4 still exceed the budget on their own, because each is one artifact that cannot be cut further without leaving an intermediate state nobody can review: the three artboards are one document each, the domain plus its defensive repository plus their tests are one unit, and the panel is one component with its stylesheet.

Every slice was verified before it was pushed: `pnpm exec next typegen && pnpm exec tsc --noEmit` clean, `vitest run` green (106 tests at the design slice, 144 from the revalidation slice on). On the final tree `pnpm lint` and `pnpm build` are clean, and `/finalizar-compra` builds as a static route.

Still open: the browser comparison between the panel and `02-cart-drawer.html`, and the new title mark, in a real browser — the owner runs every dev server and none was running for this session.

## Log

- L1 (owner, verbatim): "ahora pasemos al carrito de compras, utiliza los skills y hagamos el artboard previo del diseño"
- L2 (owner, verbatim): "utiliza las imagenes de los productos en el artboard, recuerda que estan en /public/products, tambien utiliza el icono del header"
- L3 (owner, verbatim): "guarda todo hasta aca, luego continuamos con el artboard desde este punto"
- L4 (owner, verbatim): "sigamos con el artboard del carrito donde nos quedamos" — resume point: three artboards existed, direction undecided.
- L5 (owner, decisions, verbatim option labels): direction `02 · Panel lateral 480px`; shipping `Mantener "se coordina al finalizar"`; checkout CTA `Activo, apunta hacia adelante`.
- L6 (owner, verbatim, on persistence): "lee la memoria, en engram esta la info del proyecto". Evidence read: `prisma/schema.prisma` has only `Product` and `Variant`, no cart table and no user model, and Better Auth is not implemented; Engram records persistence as an open decision, never taken. Derived and recorded as S8: `localStorage` behind a repository module, database later without touching components.
- L7 (implementation decision): the artboard's `Recién agregado` card carries no controls, so a cart holding a single product would have had no stepper and no remove button until the panel was closed. The card now owns that line's controls while the marker is set (`6a7423a`). This is the one deliberate deviation from the artboard's pixels, and it exists so the newest line is never a dead card.
- L8 (verification finding): the storage envelope required a `version` field the tests did not write. The key already carries the version, so a missing field is accepted and a different one is rejected; the rule lives in `parseCart` with a comment.
- L9 (owner report, verbatim): "revisa como al abrir el carrito el header flotante sube, como si recortara el espacio superior". Measuring both screenshots: the page content is pixel-identical before and after (title rows 298–328, chips 453–496) and only the pill moves, up 10px (top edge 124 → 114). Cause: `S3`'s scroll lock set `overflow: hidden` on `body`, but `globals.css` declares `overflow-x: clip` on `html`, so body's overflow never propagates to the viewport — the body instead became a scroll container, the sticky header stopped sticking to the viewport and dropped to its static position, moving up by exactly the document scroll offset (10px in that session; measured −488px at a 500px scroll, i.e. the header leaving the screen on any longer page). The lock now goes on `html` (`overflow-y: hidden`), the scrollbar width is handed back as `html` padding so nothing shifts sideways, and focus uses `preventScroll`. Verified on the running app through CDP at scroll 0 and 600: header top stays 12 before, during and after; content top/left unchanged; scroll preserved; `overflow-y` and padding restored on close.
- L10 (owner, verbatim): "al parecer la funcionalidad del cart esta bien, solo faltaria agregar el icono de carrito al lado del titulo del carrito del drawer". The panel title now carries the bag glyph at the empty state's size and stroke (`c84089b`).
- L11 (owner, verbatim, on delivery): "primero resolvamos la rama feat cart, hagamos commits encadenados para hacer el pull request asi mergeamos a main. Luego vemos la mejora de codigo y estructura de carpetas, la idea es que no hayan comentarios y que el codigo se explique solo". Delivered as the stacked chain recorded above. Follow-up, not part of this feature: the cart folder is flat and its modules carry 191 comment lines that restate the specs, so the next unit of work regroups `src/features/cart/` by layer and removes the comments that a reader can get from the code.
