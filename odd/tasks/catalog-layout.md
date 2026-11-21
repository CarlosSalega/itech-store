# Catalog layout

Group `src/features/catalog/` by layer and remove the comments that restate the specs, using the criteria already applied to `src/features/cart/`. Branch `refactor/catalog-layout`, delivered as three pull requests. This document is the specification the worker reads; read it whole, including the log.

## Specs

S1 — The feature is grouped by layer: `domain/` (pure rules), `server/` (Prisma access), `ui/` (components and their stylesheets), `seed/` (extraction and seed policy). Tests sit beside the module they cover. A module name drops the `catalog-` prefix where the folder already says it.

S2 — The icon set is store-wide, so it stops living inside one feature: `src/components/icons.tsx`. Every importer points there: `app/_components/site-header.tsx`, `app/contacto/page.tsx`, `features/cart/ui/trigger.tsx`, `features/cart/ui/drawer.tsx`, `features/catalog/ui/catalog-pagination.tsx`, `features/catalog/ui/family-list.tsx`.

S3 — `VariantOption` is a domain type and lives in `domain/variant-selection.ts`. `variant-selector.tsx` imports it from there, and `domain/variant-selection.test.ts` never imports from `ui/`: a domain test reaching into a component is a layering inversion.

S4 — The seed pipeline keeps its own folder with these names: `seed/apple-catalogue.ts`, `seed/source-mapping.ts`, `seed/image-preservation.ts`, `seed/catalog.ts` (was `seed-catalog.ts`), `seed/files.test.ts` (was `seed-files.test.ts`). Its external consumers keep working: `scripts/extract-catalog.ts`, `scripts/extract-apple-catalogue.ts`, `scripts/extract-iphone-catalog.ts`, `prisma/seed.ts`.

S5 — `src/features/catalog/` carries zero prose comments. The only survivors are the two `eslint-disable-next-line @next/next/no-img-element` directives in `ui/product-card.tsx`, which are instructions to the linter, not prose. A rule that a comment carried and the code cannot express must first exist in its document (S6), never be dropped.

S6 — `docs/seed-pipeline.md` documents the extraction and seed policy that today exists only inside those four modules: the Apple classifier and the requested list, slug/SKU/capacity derivation, which photographs survive a re-run, how seed files merge, how featured products are picked, and how image references resolve. The pagination, price and family-taxonomy rules that only exist in comments move into `odd/tasks/public-catalog-mvp.md`; the icon grid convention and the 44px target notes move into `design/system.md`.

S7 — Every commit is green on its own: `pnpm exec next typegen && pnpm exec tsc --noEmit`, `pnpm test` (the nine catalog test files keep passing with their existing assertions), `pnpm lint`.

S8 — No behaviour change and no copy change. Routes, rendered strings, query results and seed output are identical before and after.

## Tasks

- T0 — Documentation first: `docs/seed-pipeline.md`, the `public-catalog-mvp.md` extension and the `design/system.md` extension. Specs: S6.
- T1 — The layout, in one commit: icons hoisted (S2), `domain/` (S1, S3), `server/` (S1), `ui/` (S1), `seed/` (S1, S4). One commit because every group changes the same importer files; splitting would leave importers pointing at modules that have not moved yet.
- T2 — Comments removed in two commits: `domain/`, `server/` and `seed/` first, then `ui/` and its stylesheets. Specs: S5.

## Verification

Per commit: `pnpm exec next typegen && pnpm exec tsc --noEmit` clean, `pnpm test` green, `pnpm lint` clean. Plus a diff audit: of every removed line, the only ones that are not a comment or blank are import specifiers and intentional rewrites; and after T2, `grep -rn '/\*\|^\s*//' src/features/catalog` returns only the two eslint directives.

## Delivery

Branch `refactor/catalog-layout`, three pull requests merged in order: layout, documentation, comments. The layout lands first so the provenance table in `docs/seed-pipeline.md` cites the paths a reader will actually find (L4). Comment removal is split by folder: `domain/`, `server/` and `seed/` in one commit, `ui/` and its stylesheets in the other, because the two halves cite different documents.

## Log

- L1 (owner, verbatim): "ahora planifica la reestructuracion del feature catalog utilizando el mismo criterio que usamos con cart"
- L2 (owner, decisions, verbatim option labels): seed pipeline inside the feature — "Dentro del feature, carpeta seed/ (recomendado)"; icon set hoisted — "Subirlo a src/components/icons.tsx (recomendado)"; and "Arrancar ahora, corte por corte".
- L3 (implementation decision): the plan proposed eight slices; the layout ships as one commit instead of five because each group changes the same importer files (`app/catalogo/page.tsx` alone imports from `domain/`, `server/` and `ui/`), so a per-group slice would leave importers pointing at modules that have not moved yet. The two comment commits stay separate.
- L4 (implementation decisions and findings): the commits run layout → documentation → comments, not documentation → layout, so the 50-row provenance table names the final module paths; at the time each block was deleted, its rule was already in a document. Evidence for the deletion: every catalog file is byte-identical to its pre-change copy once comments are stripped, and the four stylesheets keep their selector census (14, 12, 24, 30). Three things found and deliberately not fixed here, because they are behaviour or copy and S8 forbids both: `design/system.md` says an empty family shows a sentence plus a `/contacto` link while `ui/family-list.tsx` renders only `0 productos`; three deleted comments were already false (they claimed the IPHONE family has no products, and the phone extract put 17 rows on disk); and `ui/product-card.tsx` still splits the formatted price inline although `domain/variant-selection.ts` exports `splitPrice`. Those are the next decisions, not regressions of this refactor.
