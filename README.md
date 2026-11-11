# iTech Store

Apple products e-commerce for Argentina. The UI is in Spanish (`es-AR`) and every price is in
ARS, stored as integer cents.

**Implemented today:** the public catalogue — landing page, listing with URL pagination and
family filter, product detail with a capacity selector, and a contact page — backed by seeded
Prisma Postgres data.

**Not implemented yet:** the cart, MercadoPago Checkout Pro, authentication and the admin panel.
No route in this repository lets a visitor add a product to a cart or pay for it.

> ## Warning: sample prices and stock
>
> Every price and stock value in the database is **sample data** produced by fixed, arbitrary
> rules in `prisma/seed.ts`: price is a per-category base multiplied by a storage multiplier, and
> stock is derived from a hash of the SKU. No real price was ever fetched. All of it must be
> replaced with real values **before the store takes real traffic**.

## Stack

| Layer | Version | Notes |
| --- | --- | --- |
| Next.js | `16.4.6` | App Router; `cacheComponents` + `partialPrefetching` in `next.config.ts` |
| React / React DOM | `19.3.0` / `19.3.0` | Server components for pages, one client component for the variant selector |
| Prisma | `7.10.0` | `prisma` CLI + `@prisma/client`, generated into `src/generated/prisma` |
| Prisma driver adapter | `@prisma/adapter-pg` `7.10.1` | Prisma 7 requires an adapter; the app connects directly with `DATABASE_URL` |
| Database | Prisma Postgres | consumed through `DATABASE_URL` (`postgresql` provider) |
| TypeScript | `5.9.3` | `pnpm typecheck` runs `tsc --noEmit` |
| Tailwind CSS | `4.3.3` | via `@tailwindcss/postcss` `4.3.3` in `postcss.config.mjs` — no Turbopack loader rule |
| Vitest | `3.2.7` | unit tests over pure logic (`vitest.config.ts`) |
| ESLint | `9.39.2` | with `eslint-config-next` `16.4.6` |
| pnpm | `12.18.0` | `packageManager` field |

**Dependencies are pinned exactly** — no `^`, no `~`. This is enforced by `saveExact: true` in
`pnpm-workspace.yaml`, together with the committed `pnpm-lock.yaml`. The same setting in `.npmrc`
does not work: pnpm 12 ignores `save-exact` there (verified — `pnpm config get save-exact` returns
`undefined`). `.npmrc` is kept only for npm.

## Setup

```bash
pnpm install                # postinstall runs `prisma generate` into src/generated/prisma
```

Create a `.env` file yourself (it is gitignored and there is no `.env.example` in this repository —
the table below is the inventory), then:

```bash
pnpm exec prisma migrate deploy   # apply prisma/migrations to the database in DATABASE_URL
pnpm exec prisma db seed          # runs prisma/seed.ts, which loads prisma/seed/products.json
pnpm dev                          # http://localhost:3000
```

Node.js is required and no `engines` field is declared yet.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma Postgres connection string. Read by `prisma.config.ts` (migrations), `prisma/seed.ts`, and `src/lib/prisma.ts` at runtime through `@prisma/adapter-pg`. |
| `CATALOG_SOURCE_URL` | Only for `pnpm catalog:extract` | Base URL the catalog extraction reads from. Never committed; the script exits with an error when it is missing. |

`.env` is loaded with `dotenv/config` in `prisma.config.ts`, the seed and the scripts. `next`
loads it on its own.

## Routes

### Public (implemented)

| Route | Behaviour |
| --- | --- |
| `/` | Landing: hero, family entry points with real counts, featured products (one per family) |
| `/catalogo` | Full catalogue, 12 products per page, family filter |
| `/catalogo/[slug]` | Product detail with gallery and capacity selector; the price follows the selected variant. Unknown slug → 404 |
| `/contacto` | Contact page. It publishes no phone number and no email, because the store has not confirmed either yet |

`/catalogo` accepts two query parameters, and they compose:

- `?page=N` — 1-based page number. An out-of-range value clamps to the last page instead of 404ing.
- `?familia=mac` — one of `mac`, `ipad`, `watch`, `airpods`, `accessory`, `iphone`. An unknown
  value renders the whole catalogue instead of erroring. The seeded catalog has no iPhone products
  yet, so that filter shows an honest empty state.

Example: `/catalogo?familia=mac&page=2`. Page 1 omits `?page`, so `/catalogo` is the canonical
first page.

Pages are dynamic by design (`connection()` in each route), so the build does not prerender them
and `pnpm build` is not meant to need the database. That matters here because the cloud database
has been intermittently unreachable (Prisma `P1001`), and a build failure caused by network
weather would be indistinguishable from a code failure.

### Reserved private routes (not implemented)

`/login`, `/admin` and `/dashboard` are planned — authentication with email + password, then an
admin panel — and **do not exist in this repository**. Requesting them returns 404.

## Product images

Product photography lives in `public/products`, which is **gitignored**: the files exist only on
the machine that ran the extraction and are never committed. The seed therefore keeps only image
paths whose file is present on the current machine, so a fresh clone seeds the database with **no
image references at all** and every product renders `/placeholder.webp`. That is intended, not a
bug.

To regenerate the catalog data and photos:

```bash
CATALOG_SOURCE_URL=... pnpm catalog:extract   # or set it in .env
pnpm exec prisma db seed
```

The extraction writes `public/products/*.webp` and `prisma/seed/products.json` (local
`/products/...` paths only, no source URLs and no provenance). Production will need an external
image host; Cloudinary is the plan for a later phase.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Next.js development server |
| `pnpm build` | Production build (`next build`, Turbopack) |
| `pnpm start` | Serve a production build |
| `pnpm lint` | ESLint over the repository |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest, single run |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm postinstall` | `prisma generate` — writes the client to `src/generated/prisma`; runs automatically after `pnpm install` |
| `pnpm catalog:extract` | Extract catalog data and webp photos into `prisma/seed/products.json` and `public/products`; needs `CATALOG_SOURCE_URL` |
| `pnpm design:photos` | Write `design/storefront-photos/` with product photos embedded as data URIs |

## Design

The design system lives in `design/system.md`: tokens, type scale, motion rules and one signature
detail per direction. The artboards are self-contained HTML in `design/storefront/`
(`01-galeria` … `06-detalle-vitrina`), described by `design.json`.

The implemented direction is **Galería**: `01-galeria.html` for the landing and
`04-detalle-galeria.html` for the product page. **Índice** and **Vitrina** are kept in `design/` as
the alternative record and are not implemented.

`pnpm design:photos` writes a parallel, gitignored copy at `design/storefront-photos/` with the
photography embedded. Two copies exist because artboards must be self-contained (the canvas
injects them through JavaScript, so relative image paths 404), while product photos must never be
committed.

## Current state

- **Done:** seeded Prisma Postgres schema (`Product` + `Variant`), landing, catalogue with URL
  pagination and family filter, product detail with variant selection, contact page, ARS price
  formatting, and the Galería direction implemented in the real stack.
- **Blocked:** `/contacto` publishes no channel — the store's WhatsApp number and email address are
  not confirmed. `CONTACT` in `src/app/contacto/page.tsx` holds `null` for both, and the page says
  so instead of inventing a number or an address.
- **Next:** cart, MercadoPago Checkout Pro, authentication (Better Auth), admin panel, and an
  external image host for product photography. Real prices and stock replace the sample rules in
  `prisma/seed.ts`.

The decisions behind this milestone are recorded in `odd/tasks/public-catalog-mvp.md`.
