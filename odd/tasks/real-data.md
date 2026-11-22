# Real data — schema, database and image upload

Replace the three fixture stores with Postgres through Prisma, add authentication with an admin role, and replicate the image-upload module from `car-agency-app`. Branch `docs/real-data-plan` carries this plan only; the work itself lands in the phases below, one branch and one PR each.

## Specs

S1 — Goal (owner, verbatim): "ahora hagamos una plan en otra rama para modificar el schema y db para utilizar datos reales".

S2 — Image upload (owner, verbatim): "luego tambien revisa este path donde esta el modulo de image-upload que vamos a replicar /home/charly06arg/Desktop/Dev/work/car-agency-app". The module is replicated as a module of this project, not vendored as a dependency and not copied with its client data.

S3 — What "real data" means: the three stores that hold the demo — cart (`itech-store.cart.v1`), orders (`itech-store.orders.v1`) and admin products (`itech-store.admin-products.v1`) — are replaced by Postgres through Prisma. The screens keep their contracts: same routes, same copy, same tokens, same component boundaries. A user of the app must not notice the change except that data now survives a different browser.

S4 — Identity: Better Auth with email and password, plus a role (`CUSTOMER`, `ADMIN`) on the user. `/login` authenticates for real, `/admin` and its children are unreachable without an admin session, and the guard lives on the server (session read in the layout) with `src/proxy.ts` keeping the `X-Robots-Tag` rule. The admin surfaces still declare no metadata.

S4a — A guest can buy (owner's choice by delegation, see L3): no session is required to complete a purchase, `Order.userId` is nullable, and the buyer's email is stored on the order as a snapshot. A session is required only for `/admin`. "Mis pedidos" resolves with the order number plus the buyer's email, never by guessable lookup, and passwordless access (magic link) is deferred to a later phase because the store has no confirmed email channel yet.

S5 — Photography: Cloudinary behind the replicated module, with its `ImageUpload` table recording every key that the app owns. A product holds an ordered gallery (`ProductImage` with `position` and `alt`), not a `String[]`. The seed keeps writing local paths until the upload flow replaces them.

S6 — The seeded catalogue stays the source of the first products. After this work the admin is the writer; the seed remains the way to rebuild a database from scratch.

S7 — No destructive step. Every migration is additive or backfills before it drops anything, comes with its rollback written next to it, and is verified against a scratch database — never against the cloud database the demo uses.

S8 — Every phase ships green on its own: `pnpm exec next typegen && pnpm exec tsc --noEmit`, `pnpm test`, `pnpm lint`, `pnpm build`, and, for a phase that touches the schema, a migration run and rollback against a scratch database.

S9 — The rules already earned stay: no metadata under `/admin` or `/login`, `X-Robots-Tag` on the response, semantic colours for states only, 44px targets, visible focus, `prefers-reduced-motion`, money as integer ARS cents.

S10 — Honesty over convenience: no screen may claim a capability the code does not have. If a demo limitation survives the change, it stays written on the screen.

## What the reference module is, and what we take from it

Read at `/home/charly06arg/Desktop/Dev/work/car-agency-app`:

| Part | What it does | What we take |
|---|---|---|
| `src/modules/image-uploads/core/` | `ImageProvider` port, `ImageError` codes, validation, URL building, concurrency, message resolution | The port and the failure vocabulary, unchanged |
| `src/modules/image-uploads/guards/` | Pure policies: authenticate → validate file → authorize delete | The order and the fail-closed delete |
| `src/modules/image-uploads/next/` | Thin HTTP adapters: upload handler and image proxy, Web standards only | The adapter shape; no `next/server` import inside the module |
| `src/components/image-upload.tsx` | Client gallery with drag ordering (`@dnd-kit`), `lucide-react` icons and `sonner` toasts | The behaviour, not the dependencies |
| `ImageUpload` table | `id`, unique `key`, `userId`, `createdAt`, index on `userId`, FK cascade | The same table, so orphaned assets stay findable |
| 153 tests | Policies, codes, adapter statuses, size and type precedence | The same coverage, in our test runner |

The module's own invariants travel with it, and they are the reason it is worth replicating rather than rewriting: no configuration read at import time (everything arrives as a factory parameter); no client or tenant data inside; `core/` and `guards/` never touch transport; delete fails closed when no authorizer is supplied; size is checked twice, before and after parsing, and type before size; a rejected request never reaches the provider; `delete` reports instead of throwing; failures carry a code, never a sentence; the provider is built once per process in the composition root.

Three deliberate adaptations: the client gallery is rebuilt with our own primitives and no new dependencies (move up/down and remove buttons instead of `@dnd-kit`, inline messages instead of `sonner`, our tokens instead of `lucide-react`); `cloudinary` is the only new runtime dependency; and the module lives at `src/modules/image-uploads/` with the same internal layout, so the reference's own documentation still applies.

## Schema

```
User            Better Auth's tables (user, session, account, verification) plus role: Role
Role            CUSTOMER | ADMIN
Product         + published Boolean @default(true), + images: ProductImage[]
ProductImage    id, productId, key, url, alt, position, createdAt   @@unique([productId, position])
Variant         unchanged (sku, storage, color, price cents, stock)
Order           id, number @unique (IT-2026-000X), userId?, status OrderStatus,
                payment OrderPayment, subtotalCents, totalCents, buyer snapshot,
                delivery snapshot, createdAt, updatedAt
OrderLine       orderId, productId?, variantId?, sku, name, unitPriceCents, quantity
ImageUpload     id, key @unique, userId, createdAt   @@index([userId])
CartItem        userId, variantId, quantity, createdAt   @@unique([userId, variantId])
OrderStatus     nuevo | en preparación | enviado | entregado | cancelado  (the vocabulary that exists today)
OrderPayment    transferencia | efectivo
```

Two things the schema must not lose, because the code already depends on them: money is an integer number of ARS cents everywhere, and an order keeps a snapshot of the names and prices it was bought at, so a later price change cannot rewrite history.

`Product.images` moves from `String[]` to `ProductImage[]`. That is the one shape change that touches the public site, the seed and the admin uploader, so it gets its own phase and its own migration with a backfill.

## Phases

Each phase is a branch, a chain of work-unit commits and one PR. The order is a dependency order: nothing later works without the earlier.

| # | Phase | Content | Why here |
|---|---|---|---|
| P0 | Migration discipline | `src/lib/db/scratch.ts` with its guard and tests, `scripts/db-scratch.ts`, the `db:scratch*` scripts, and `docs/database.md` with the authoring, rehearsal and rollback rules — **shipped**; a scratch database still has to be provisioned, since the machine has no docker and no local PostgreSQL | A migration without a rehearsed rollback is a data risk, and this project has a cloud database |
| P1 | Identity | Better Auth tables and role, `/login` real, admin guard on the server, an admin user in the seed | Every write below needs an actor |
| P2 | Catalogue write model | `Product.published`, `ProductImage`, the `String[]` → gallery migration with backfill from the seed's paths | The uploader needs a place to write an ordered gallery |
| P3 | Image uploads | The module at `src/modules/image-uploads/`, the Cloudinary provider in the composition root, the API route, the client gallery, `ImageUpload` table | Independent of P4/P5, and the riskiest to get wrong, so it lands alone |
| P4 | Admin products on Postgres | Server actions replacing `storage/product-store.ts`, reads through `server/`, the same screens | The first real writer; its patterns are reused by P5 |
| P5 | Orders | `Order`/`OrderLine`, checkout writes server-side, `/pedido/[codigo]` reads by number, inbox reads and changes status with a permission check | Needs P1's actor and P4's action patterns |
| P6 | Cart | `CartItem` for signed-in users, guest cart stays local and merges on login | The merge rule is its own decision and its own tests |
| P7 | Cleanup | The three fixture stores and their tests go; fixtures survive only as seed input; documents updated | Deleting them earlier would leave the demo unwalkable between phases |
| P8 | Passwordless access | Magic link through a transactional provider, plus "mis pedidos" for a signed-in customer | Needs an email channel the store does not have yet; it must not block P5 |

## Verification per phase

- P0: create, mutate and roll back on the scratch database, twice, and show both runs.
- P1: an anonymous request to `/admin` is refused and an admin session is not; a password reset path is out of scope and says so.
- P2: the migration backfills the seeded catalogue with zero lost products, and the public catalogue renders the same pages after it.
- P3: the module's own suite ported green, plus the invariants: a rejected file never reaches the provider, a delete without an authorizer denies, an oversized non-image is a type error.
- P4/P5: the same tests the fixtures had now run against Postgres, with the differences that matter (unique order number, order totals recomputed from lines).
- P6: a guest cart merges into an existing one without duplicating a line, and stock is not decremented twice.
- P7: `pnpm test`, `pnpm lint`, `pnpm build` and no route left without a store.

## Risks and decisions to confirm before P1

1. **Data (item 1 of the risk line).** A cloud database is in play. P0 exists to make every migration rehearsable, but the owner decides when the cloud database is migrated, and with which backup. Nothing in these phases touches it unattended.
2. **Permissions (item 2).** The admin guard is the whole security boundary of the panel. It is read in the layout on the server, not in the client, and tested with an anonymous and a non-admin session.
3. **Contracts (item 3).** `Product.images` changes type, the order shape gains server ownership, and the cart gains a server table. Downstream code is ours, but the seed, the public pages, the admin and the checkout all read those shapes.
4. **Decisions taken** (L3): guest checkout, no fixtures mode, signed uploads from the server. **Still needed:** the Cloudinary account and its credentials before P3, and the transactional email provider before P8.

## Log

- L1 (owner, verbatim): "perfecto, cerremos esta parte de la demo, ahora hagamos una plan en otra rama para modificar el schema y db para utilizar datos reales, luego tambien revisa este path donde esta el modulo de image-upload que vamos a replicar /home/charly06arg/Desktop/Dev/work/car-agency-app"
- L2 (architect decision): the plan lives on its own branch and ships nothing but this document; the work is split into eight phases because the schema change is the one area where a single PR could not be reviewed or rolled back.
- L3 (owner decisions, with one delegated to the architect): the demo keeps **no fixtures mode** — one path, and a missing `DATABASE_URL` means the site does not start; image uploads are **signed from the server**; and for checkout the owner asked for a recommendation between magic links and a session. Recommendation adopted: **guest checkout, account optional after the purchase**. Reasons: magic links need a transactional email provider the store does not have (`CONTACT` is still null and no domain is verified), and a mandatory password immediately after the buyer has already typed name, email, phone and address is where a small store loses the sale. The admin keeps email and password behind `role: ADMIN`, verified on the server. Consequences: `Order.userId` is nullable and the buyer email is a required snapshot; the session is required only under `/admin`; the cart merge in P6 applies to signed-in users only; and passwordless access plus "mis pedidos" become P8, once email exists.
- L4 (P0, first slice): the rehearsal path exists before any schema change does. `resolveScratchUrl` refuses to run when `SCRATCH_DATABASE_URL` is missing, is not a postgres URL, or matches the app's database by value or by host-and-database, so a typo cannot migrate real data; nine tests pin those refusals. `scripts/db-scratch.ts` maps `deploy`, `status` and `reset` onto Prisma with the scratch URL exported as `DATABASE_URL` for the child process only. `docs/database.md` records the workflow and the rollback contract: every migration that adds or reshapes data carries a `rollback.sql` beside it, and a `DROP`, a bare `NOT NULL` or a rename is a review blocker without one. Remaining for P0: the scratch database itself.
- L5 (P0 reviewed, nine findings, all fixed): the native review of P0 ran twice and found nine real defects in the first draft, all of them mine, all corrected in `1ded4e8` and `56e4331`. First round: `pnpm db:scratch` passed no command and always exited 2; the same-database guard compared `URL.host` raw, so `host` and `host:5432` were "different databases" and a `reset --force` could have hit the app database; and the document told the reader to author with `prisma migrate dev` against `DATABASE_URL`, which is the app database. Second round, on the corrected code: the wrapper dropped trailing arguments silently (`pnpm db:scratch --name x` deployed nothing and exited 0); the script runs under `tsx`, which does not load `.env`, so `process.env` had neither variable and every command refused; a missing `DATABASE_URL` skipped the comparison instead of refusing; and the documented `pnpm exec prisma db seed` after a scratch reset would have seeded the app database. What the code does now: `import "dotenv/config"`, a `seed` command that scopes the scratch URL, refusal of extra arguments on every command but `dev`, host and database normalised (lowercased host, default port `5432` ignored), and a refusal when either variable is missing or unreadable. 492 tests, `tsc`, `lint` and `build` clean. **Both lineages stop at the targeted validator**: the capture tool rejects the provider binding as stale for the current STATUS, reproducibly, without running anything and without a verdict. That is a host/provider defect, not a code one; the branch is `chore/db-scratch-guard` with three commits, unpushed.
