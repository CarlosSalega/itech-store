# Database workflow

The app has one database and one migration path. A migration is authored, rehearsed against a **scratch database**, and only then applied to the app's database — by the owner, never as a side effect of starting the app.

## Environments

| Variable | Holds | Who sets it |
|---|---|---|
| `DATABASE_URL` | the app's database | the owner, in `.env` |
| `SCRATCH_DATABASE_URL` | a second database used only to author and rehearse migrations | the owner, in `.env` |

Both are required to work on the schema. The rehearsal script refuses to run when `SCRATCH_DATABASE_URL` is missing, is not a `postgres://` URL, or points at the same host and database as `DATABASE_URL` — compared with the host lowercased and the default port `5432` ignored, so `host` and `host:5432` are the same database. If `DATABASE_URL` itself cannot be parsed, every command refuses rather than skipping the comparison: the guard fails closed.

## Authoring and rehearsing a migration

```bash
pnpm db:scratch:dev --name <name>   # authors the migration against the SCRATCH database
pnpm db:scratch                     # deploys every migration to the scratch database
pnpm db:scratch:reset               # drops and re-applies from zero, proving the chain
pnpm db:scratch:status              # what the scratch database believes it has applied
```

`prisma migrate dev` is never run directly: without a `DATABASE_URL` override it targets the app's database and applies the migration there before any rehearsal. `db:scratch:dev` runs it with the scratch URL in place, which is the only authoring path this project allows.

A migration is only ready when `db:scratch` and `db:scratch:reset` both succeed twice in a row. The second run matters: the first proves the change, the second proves it is idempotent against an existing database.

## Applying it to the app's database

The owner runs it, with a backup taken first:

```bash
pnpm exec prisma migrate deploy
```

`prisma migrate reset` and `prisma db push` are never run against `DATABASE_URL`. `reset` destroys data; `push` skips the migration history and leaves the schema and `prisma/migrations` describing different things.

## Rollback

Prisma has no down migrations, so each migration that adds or reshapes data carries its reverse next to it:

```
prisma/migrations/20270101000000_add_order/migration.sql
prisma/migrations/20270101000000_add_order/rollback.sql
```

`rollback.sql` is the exact inverse: drops what the migration created, restores what it altered, and deletes the row it inserted into `_prisma_migrations`. A destructive-looking statement in a migration — a `DROP`, a `NOT NULL` without a default, a column rename — is a review blocker unless its `rollback.sql` exists and has been run once against the scratch database.

## Rules

- Additive first: add the new column or table, backfill it, drop the old one in a later migration. One migration never does all three.
- A `NOT NULL` column arrives with a default or after a backfill, never as a bare constraint on a populated table.
- Integer cents and `String[]` → relation changes get their own migration and their own backfill script, tested against the seeded catalogue.
- The seed stays runnable from zero: `pnpm db:scratch:reset` followed by `pnpm exec prisma db seed` must rebuild a working catalogue.
