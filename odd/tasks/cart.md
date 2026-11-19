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

- T1 — Cart domain and storage: types, pure reducers, totals, summary label, versioned `localStorage` repository with defensive parsing. Route: inline. Tests first. Commit: `feat(cart): add the cart domain and a defensive local repository`. Specs: S4, S5, S6, S8, S12.
- T2 — Panel component: dialog semantics, focus trap, scroll lock, lines, stepper, remove, `Recién agregado`, empty state, footer, tokens from `design/system.md`. Route: inline. Commit: `feat(cart): build the side drawer over the cart domain`. Specs: S1–S7, S13.
- T3 — Wiring: cart provider in the layout, live header trigger with badge, `Agregar al carrito` in the variant selector. Route: inline. Commit: `feat(cart): open the drawer from the header and the product page`. Specs: S10, S13.
- T4 — Price revalidation server action and its UI states. Route: inline. Commit: `feat(cart): revalidate stored prices against the catalogue`. Specs: S9, S12.
- T5 — `/finalizar-compra` placeholder page. Route: inline. Commit: `feat(cart): add the checkout placeholder route`. Specs: S11, S13.
- T6 — Verification: unit tests for the domain, storage and revalidation rules, `pnpm lint`, `pnpm typecheck`, `pnpm build`, structural readback of the panel against the artboard, and `design.json` updated with the chosen artboard and this feature.

## Log

- L1 (owner, verbatim): "ahora pasemos al carrito de compras, utiliza los skills y hagamos el artboard previo del diseño"
- L2 (owner, verbatim): "utiliza las imagenes de los productos en el artboard, recuerda que estan en /public/products, tambien utiliza el icono del header"
- L3 (owner, verbatim): "guarda todo hasta aca, luego continuamos con el artboard desde este punto"
- L4 (owner, verbatim): "sigamos con el artboard del carrito donde nos quedamos" — resume point: three artboards existed, direction undecided.
- L5 (owner, decisions, verbatim option labels): direction `02 · Panel lateral 480px`; shipping `Mantener "se coordina al finalizar"`; checkout CTA `Activo, apunta hacia adelante`.
- L6 (owner, verbatim, on persistence): "lee la memoria, en engram esta la info del proyecto". Evidence read: `prisma/schema.prisma` has only `Product` and `Variant`, no cart table and no user model, and Better Auth is not implemented; Engram records persistence as an open decision, never taken. Derived and recorded as S8: `localStorage` behind a repository module, database later without touching components.
