# Database workflow

The app has one database. Migrations are authored and applied against that same database, and the seed rebuilds it from zero. There is no separate rehearsal database: what a migration still cannot do is destroy data the seed cannot rebuild, so the rollback contract below stays.

## Environment

| Variable | Holds | Who sets it |
|---|---|---|
| `DATABASE_URL` | the app's database | the owner, in `.env` |

One variable, read in three places: `prisma.config.ts` (migrations and `prisma db seed`), `prisma/seed.ts`, and `src/lib/prisma.ts` at runtime through `@prisma/adapter-pg`.

Prisma Postgres reaches the same database on two hosts. The pooled host (`pooled.db.prisma.io:5432`) is what the app uses and what `pnpm exec prisma migrate status` reads; if a migration command refuses the pooler, Prisma Postgres also exposes the direct host (`db.prisma.io:5432`) for the same database, and that is the one to put in `DATABASE_URL` for that command.

## Authoring a migration

```bash
pnpm exec prisma migrate dev --name <name>
```

It writes `prisma/migrations/<timestamp>_<name>/migration.sql` and applies it to `DATABASE_URL`. `prisma db push` is never used: it skips the migration history and leaves the schema and `prisma/migrations` describing different things.

## Proving the chain from zero

```bash
pnpm exec prisma migrate reset --force   # drops the schema, re-applies every migration in order
pnpm exec prisma db seed                 # rebuilds the catalogue and the admin account
```

`reset` destroys everything in the database, and that is acceptable only because `prisma db seed` rebuilds it: `prisma/seed.ts` loads every file in `prisma/seed`, and the catalogue pipeline is deterministic. Run both after any migration that changes existing rows — in this setup `reset` re-applies the migrations and does **not** run the seed, so the second command is not optional. It is the only proof that a fresh install works, and the only place a `rollback.sql` gets exercised.

A `rollback.sql` is run by hand, and `db execute` in Prisma 7 takes the config file rather than a schema path:

```bash
pnpm exec prisma db execute --file prisma/migrations/<name>/rollback.sql
```

It executes, but it does not update `_prisma_migrations` on its own — that is what the `DELETE` at the end of each `rollback.sql` is for. The proof that it worked is `pnpm exec prisma migrate status` reporting the migration as not yet applied again, and `pnpm exec prisma migrate deploy` putting it back.

## Applying it

```bash
pnpm exec prisma migrate deploy
```

The owner runs it. Take a backup first when the migration touches rows the seed cannot rebuild — which, while the only stored data is the seeded catalogue and fixtures, is none of them.

## Rollback

Prisma has no down migrations, so each migration that adds or reshapes data carries its reverse next to it:

```
prisma/migrations/20270101000000_add_order/migration.sql
prisma/migrations/20270101000000_add_order/rollback.sql
```

`rollback.sql` is the exact inverse: drops what the migration created, restores what it altered, and deletes the row it inserted into `_prisma_migrations`. A destructive-looking statement in a migration — a `DROP`, a `NOT NULL` without a default, a column rename — is a review blocker unless its `rollback.sql` exists and has been run once, after a `reset`, against the database.

## Rules

- Additive first: add the new column or table, backfill it, drop the old one in a later migration. One migration never does all three.
- A `NOT NULL` column arrives with a default or after a backfill, never as a bare constraint on a populated table.
- Integer cents get their own migration and their own backfill script, tested against the seeded catalogue.
- When data moves to a new shape and the old column becomes redundant, the migration that drops it first proves it is redundant: `prisma/migrations/20261126170000_drop_product_images/migration.sql` raises an exception unless every product's gallery reproduces its `images` array in order, with a NULL array compared as empty. A drop that cannot state its own precondition in SQL does not ship.
- The seed stays runnable from zero: `prisma migrate reset --force` followed by `prisma db seed` must rebuild a working catalogue.
- The moment the database stores something the seed cannot rebuild — a real order, an uploaded image — a rehearsal database stops being a convenience and becomes a requirement again. This workflow assumes nothing like that exists yet.
