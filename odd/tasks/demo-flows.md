# Demo flows

Complete the UX/UI flow for the visitor and for the administrator, as a demo that can be shown. Demo depth is fixtures: nothing persists, no Better Auth, no payment gateway. This document is the specification the workers read; read it whole, including the log.

## Specs

S1 — Goal (owner, verbatim): "mi idea es completar el flujo de UX/UI tanto para el usuario como para el administrador asi se puede presentar una demo visual que impacte".

S2 — Depth (owner's choice, verbatim option label): "Demo con fixtures (rápido, visual)". Typed fixture data and in-memory mutations behind repository modules with the same shape the real implementations will need. No session, no writes to Postgres, no gateway, no `.env` secrets. Nothing the demo does may reach production data.

S3 — Order (owner's choice, verbatim option label): "Cerrar primero el flujo público". The visitor flow closes first — `/finalizar-compra/datos`, the simulated payment step, and `/pedido/[codigo]` — and the administrator flow comes after.

S4 — Admin scope (owner's choice, verbatim option label): "Admin completo (7 pantallas)": `/login`, `/admin` dashboard, `/admin/productos`, `/admin/productos/nuevo`, `/admin/productos/[slug]`, `/admin/pedidos`, and `/admin/ajustes` with its media library.

S5 — Design gate. Every new surface starts as artboards under `design/<slug>/`, three clearly different directions, following `design/system.md` tokens and the Galería direction already implemented. The owner picks one; only then is it implemented. The artboards join the canvas.

S6 — The simulated payment says it is a simulation, in the flow's own copy, and accepts no real card data. A demo that looks like it charges a card is a lie the visitor cannot check.

S7 — The demo is honest about what is real. Surfaces backed by fixtures render the same fixture data the catalogue uses (product names, families, prices in integer ARS cents, photography from `public/products`) and never invent a channel, a phone number or an email: `CONTACT` stays `null` and `docs/contact-channels.md` keeps governing what `/contacto` may say.

S8 — Every new private surface is `noindex`, like the checkout placeholder.

S9 — Copy is Argentine Spanish with voseo, quoted verbatim in the specs below when it is fixed. Product names are never translated.

## Tasks

- T1 — Artboards for the visitor checkout: `design/checkout/`, three directions for the flow datos → pago → confirmación. Specs: S3, S5, S6, S7, S9.
- T2 — Implement the chosen direction: the three public routes, fixture orders, the confirmation receipt. Specs: S2, S3, S6, S7, S8, S9.
- T3 — Artboards for the administrator: the seven screens and the shell that holds them. Specs: S4, S5, S7, S9.
- T4 — Implement the administrator flow on the chosen direction. Specs: S2, S4, S7, S8, S9.

## Verification

Per task: `pnpm exec next typegen && pnpm exec tsc --noEmit`, `pnpm test`, `pnpm lint`, and `pnpm build` for the routes a task adds. The owner reviews each design on the canvas before its implementation task starts.

## Delivery

Branch per task, chained PRs merged in order, same convention as the cart and catalog work.

## Log

- L1 (owner, verbatim): "mi idea es completar el flujo de UX/UI tanto para el usuario como para el administrador asi se puede presentar una demo visual que impacte"
- L2 (owner, choices, verbatim option labels): "Demo con fixtures (rápido, visual)"; "Cerrar primero el flujo público"; "Admin completo (7 pantallas)".
- L3 (architect decision): the checkout becomes three screens rather than one — `datos`, `pago`, `confirmación` — because the existing placeholder has nothing to show behind it and a demo needs a visible order number at the end.
- L4 (design, T1): `design/checkout/` holds three directions for the visitor flow, one 1440×2600 artboard each, all written from `design/system.md` tokens with no new hex values: `01-single-page.html` (one page, sticky summary), `02-wizard.html` (three numbered steps, progress bar) and `03-receipt-first.html` (the order as a receipt from the first screen). The owner picks one and the others stay as the alternative record. The simulated payment says so in its own copy and has no card field.
