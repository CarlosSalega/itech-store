# iTech Store

Apple products e-commerce for Argentina. The UI is in Spanish (`es-AR`) and every price is in
ARS, stored as integer cents.

**Implemented today:** the public catalogue — landing page, listing with URL pagination and
family filter, and product detail with a capacity selector — backed by seeded Prisma Postgres
data, plus the shopping cart (a 480px side drawer; a guest cart lives in `localStorage` and a
signed-in cart reads and writes the database), a real checkout that writes orders to the
database with a proof-gated receipt, the admin panel reading and writing Postgres behind a
Better Auth session, signed image uploads to Cloudinary, sign-in by magic link (Resend), and
`/mis-pedidos` for the signed-in customer.

**Not implemented yet:** MercadoPago Checkout Pro — online payment does not exist and nothing in
this repository charges a card.

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
| Better Auth | `1.7.27` | sessions in the database (`Session`, `Account`, `Verification`); magic-link plugin for the customer |
| TypeScript | `5.9.3` | `pnpm typecheck` runs `tsc --noEmit` |
| Vitest | `3.2.7` | unit tests over pure logic (`vitest.config.ts`) |
| ESLint | `9.39.2` | with `eslint-config-next` `16.4.6` |
| pnpm | `12.18.0` | `packageManager` field |

`.gitattributes` marks `design/**` as `linguist-documentation`. The self-contained HTML artboards
there outweigh the TypeScript sources in raw bytes, so without that override GitHub reported the
repository as an HTML project instead of a TypeScript one. The artboards are design sources, not
application code, and GitHub only recomputes language statistics on a push to the default branch.

**Dependencies are pinned exactly** — no `^`, no `~`. This is enforced by `saveExact: true` in
`pnpm-workspace.yaml`, together with the committed `pnpm-lock.yaml`. The same setting in `.npmrc`
does not work: pnpm 12 ignores `save-exact` there (verified — `pnpm config get save-exact` returns
`undefined`). `.npmrc` is kept only for npm.

### Styling: tokens as custom properties, rules in CSS Modules

Three layers, each doing one job. Worth reading before touching a stylesheet, because no utility
framework is involved: **the tokens are plain CSS custom properties on `:root`**, and the only class in
`src/` that is not a scoped module is `sr-only` — this project's own primitive, 31 uses, for text a
screen reader must read and a sighted reader must not see.

| Layer | What it owns | Where |
| --- | --- | --- |
| Tokens | Colour, type, spacing, radii, elevation and motion, as CSS custom properties on `:root` | `src/app/globals.css` |
| Element reset | `box-sizing`, zeroed margins and borders, inherited form typography, `img { display: block }`, `[hidden]` | `src/app/preflight.css`, Tailwind's preflight `4.3.3` vendored and imported at the top of `globals.css` |
| Component rules | Every layout and visual decision, one scoped module per component | 30 `*.module.css`, read through `styles.*` |

Nothing generates the token layer, so a token on this page is the same declaration the browser reads:
each one in the `:root` block is the only definition of its value, and there is no build step between
the two. The reset is the only third-party CSS in the repository. `sr-only` is not a Tailwind utility
but a primitive declared in `globals.css`, because 31 components need it and one shared class beats 31
copies.

The rules are hand-written rather than utility classes because of where the design came from. The
implemented direction arrived as an artboard, and the design tool's format requires every artboard
to be one self-contained HTML file with inline CSS — the canvas injects artboards through
JavaScript, so nothing there can be built. Porting that block into the real stack makes one scoped
module per component the direct translation. Rewriting it as utilities would have re-made decisions
that the artboard had already settled and the owner had already approved.

So the mismatch is apparent, not real. Converting the modules to utilities is a redesign, not a
cleanup, and needs its own decision.

## Setup

```bash
pnpm install                # postinstall runs `prisma generate`; prepare installs the git hooks
```

`prepare` runs `husky`, which points `core.hooksPath` at `.husky/_` and activates the committed
hook. That means a fresh clone is gated after one install, with nothing to remember.

### Git hooks

`.husky/pre-commit` runs `pnpm lint` and `pnpm typecheck` and aborts the commit when either fails.
Husky executes the file through `sh -e`, so the first failure stops it.

The test suite is deliberately **not** in the hook. It costs three seconds today, but a gate that
grows with the suite is how a team ends up committing with `--no-verify` on every change, which
leaves the hook worthless. `pnpm test` runs on demand and in review.

Two consequences worth knowing: ESLint warnings do **not** block a commit — `pnpm lint` only exits
non-zero on errors, so a warning passes the gate. And the hook is local: commits created on GitHub,
such as a merge from a pull request, never pass through it.

To skip it on purpose: `git commit --no-verify`.

Create a `.env` file yourself (it is gitignored and there is no `.env.example` in this repository —
the table below is the inventory), then:

```bash
pnpm exec prisma migrate deploy   # apply prisma/migrations to the database in DATABASE_URL
pnpm exec prisma db seed          # runs prisma/seed.ts, which loads every json file in prisma/seed
pnpm dev                          # http://localhost:3000
```

`src/lib/prisma.ts` builds one client and keeps it in a `globalThis` slot outside production: Next
reloads modules on every hot update, and a fresh client per reload would open a new connection pool
each time. The client is constructed through `@prisma/adapter-pg`, which Prisma 7 requires.

Node.js is required and no `engines` field is declared yet.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma Postgres connection string. Read by `prisma.config.ts` (migrations), `prisma/seed.ts`, and `src/lib/prisma.ts` at runtime through `@prisma/adapter-pg`. |
| `CATALOG_SOURCE_URL` | Only for `pnpm catalog:extract` | Base URL the catalog extraction reads from. Never committed; the script exits with an error when it is missing. |
| `APPLE_SOURCE_URL` | Only for `pnpm catalog:extract:apple` | Base URL the Apple catalogue extension reads from. Never committed, never defaulted; the script exits with an error when it is missing. |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Yes | The session secret and the origin Better Auth builds its URLs (and the magic links) from. See `docs/auth.md`. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | No | Comma-separated extra origins allowed to call `/api/auth/*`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Yes | The admin account the seed creates. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Yes | Signed uploads from the server. See `docs/image-uploads.md`. The unsigned preset and the two `NEXT_PUBLIC_IMAGE_*` placeholders in `.env` are unused. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Yes | The transactional email channel for magic links; the sender must belong to a verified domain in Resend. |

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
| `/finalizar-compra` | Real checkout: the server recomputes prices from the catalogue, refuses an empty cart or an invalid buyer, and writes an `Order` with its lines. Payment is transfer or cash — no card is charged. `noindex` |
| `/pedido/[codigo]` | The receipt of one order, resolved only with proof: an httpOnly cookie listing the orders this browser created, or the buyer's email. Anything else answers the same nothing |
| `/mis-pedidos` | The signed-in customer's orders — by user id or buyer email, so orders placed as a guest are claimed by claiming the email. Without a session it offers sign-in by magic link. `noindex` |
| `/admin` | The panel: dashboard, products (with ordered gallery, publish state and variants), orders inbox with status changes, uploads. Requires an `ADMIN` session; an anonymous request is redirected to `/login`. `noindex` |

`/catalogo` accepts two query parameters, and they compose:

- `?page=N` — 1-based page number. An out-of-range value clamps to the last page instead of 404ing.
- `?familia=mac` — one of `mac`, `ipad`, `watch`, `airpods`, `accessory`, `iphone`. An unknown
  value renders the whole catalogue instead of erroring. Every family holds products today, so
  each filter renders a real wall.

Example: `/catalogo?familia=mac&page=2`. Page 1 omits `?page`, so `/catalogo` is the canonical
first page.

Pages read the database at request time (`connection()` in each data access), so the build does
not need the database — it renders the static shells and the data streams into the dynamic holes
(Partial Prerender). That matters here because the cloud database has been intermittently
unreachable (Prisma `P1001`), and a build failure caused by network weather would be
indistinguishable from a code failure.

### Private routes

`/login` guards the admin panel behind a real Better Auth session (email + password, role
`ADMIN`). Requesting `/admin` without a session redirects to `/login`. A guest still buys
without an account.

### Demo data in the panel (not real)

The dashboard's comparison deltas (sold last month, orders to fulfil yesterday, published
last month, low stock last week) are measured against `DASHBOARD_BASELINE` in
`src/features/admin/fixtures/baseline.ts`, which is **mocked data kept for the demo** —
the database stores no history to compare against, so those deltas are not real numbers.
The metric values themselves (sold, orders, published, low stock) are read from the
database and are real.

`src/features/admin/fixtures/products.ts` and `src/features/checkout/fixtures/orders.ts`
are test data only: no route reads them, every screen reads Postgres.

## Product images

Product photography lives in `public/products`, one folder per family (`iphone`, `ipad`, `mac`,
`watch`, `airpods`, `accessory`), which is **gitignored**: the files exist only on the machine that
ran the extraction and are never committed. Every reference points at the family folder that holds
it, `/products/<family>/<file>`, and the seed keeps only the references whose file is present on the
current machine, so a fresh clone seeds the database with **no image references at all** — no gallery rows either — and every
product renders `/placeholder.webp`. That is intended, not a bug.

To regenerate the catalog data and photos:

```bash
CATALOG_SOURCE_URL=... pnpm catalog:extract   # or set it in .env
pnpm exec prisma db seed
```

The extraction writes `public/products/<family>/*.webp` and `prisma/seed/products.json` (local
`/products/...` paths only, no source URLs and no provenance).

### Uploading to the cloud

Since P3 the panel uploads product photography to Cloudinary, **signed from the server**: the
browser asks a server handler for the signature, the asset goes to a per-product namespace, and
every accepted upload records an `ImageUpload` row and, for an existing product, its
`ProductImage` row. The full contract — limits, error codes, ownership, delete authorisation —
lives in `docs/image-uploads.md`.

The Apple catalogue extension is a second run with the same shape. Its list of products is fixed
in `scripts/extract-apple-catalogue.ts`: it imports only the models this store does not already
sell, so a model that another extraction brought in is never offered twice.

```bash
APPLE_SOURCE_URL=... pnpm catalog:extract:apple --dry-run   # report what would be imported
APPLE_SOURCE_URL=... pnpm catalog:extract:apple             # then write it
```

It writes `public/products/<family>/*.webp` and `prisma/seed/products-apple.json`, and prints a
requested product it could not find instead of dropping it in silence.

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
| `pnpm catalog:extract` | Extract catalog data and webp photos into `prisma/seed/products.json` and `public/products/<family>`; needs `CATALOG_SOURCE_URL` |
| `pnpm catalog:extract:apple` | Extract the Apple models the store lacks into `prisma/seed/products-apple.json` and `public/products/<family>`; needs `APPLE_SOURCE_URL`; supports `--dry-run` and `--limit=N` |
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
committed. The inliner rewrites `src` attributes only — the one place an artboard points at an image
file — with a deliberately linear pattern, because a path-shaped regex backtracks for minutes once a
data URI is in the document. Data URIs never match it, since base64 has no dot-suffix; a local
reference is resolved under the repository root and then under `public/`; and a board that still
references a file is never written, so this class of silent breakage fails loudly.

## Current state

- **Done:** the whole real-data plan (`odd/tasks/real-data.md`, P0-P8): a Prisma Postgres schema
  with the product's ordered gallery and publish state, Better Auth sessions with the admin guard,
  the panel reading and writing Postgres (products, gallery, variants, orders inbox, dashboard),
  a server-side checkout that recomputes prices and writes orders with a proof-gated receipt,
  signed Cloudinary uploads, the cart of a signed-in user on the server with the guest cart
  merging on sign-in (summed, clamped by stock and `MAX_LINE_QUANTITY`), sign-in by magic link
  through Resend, and `/mis-pedidos`.
- **Blocked:** `/contacto` publishes no channel — the store's WhatsApp number and email address are
  not confirmed. `WHATSAPP_NUMBER` and `CONTACT_EMAIL` in
  `src/features/contact/contact-channels.ts` hold `null` for both, the page says so instead of
  inventing a number or an address, and `docs/contact-channels.md` records the rule and the one
  change that turns both on.
- **Sample prices and stock:** every price and stock value is still the seed's deterministic
  sample data — see the warning above. Accounts created by magic link have no password yet.
- **Next:** MercadoPago Checkout Pro, real prices and stock, passwords for magic-link accounts,
  and deployment documentation.

The decisions behind the real-data plan are recorded in `odd/tasks/real-data.md`; the ones behind
the first milestone, in `odd/tasks/public-catalog-mvp.md`.
