# Authentication

The admin panel is guarded by a real Better Auth session. The rest of the app still runs on fixtures, and a guest still buys without an account.

## Variables

| Variable | Holds | Who sets it |
|---|---|---|
| `BETTER_AUTH_SECRET` | the secret Better Auth signs sessions with | the owner, in `.env` |
| `BETTER_AUTH_URL` | the origin Better Auth builds its URLs from, for example `http://localhost:3000` | the owner, in `.env` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | optional, comma-separated extra origins allowed to call `/api/auth/*`, for a second host or a preview deployment | the owner, in `.env` |
| `ADMIN_EMAIL` | the email of the admin the seed creates | the owner, in `.env` |
| `ADMIN_PASSWORD` | the password of that admin | the owner, in `.env` |

`src/lib/auth.ts` reads `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` the first time authentication is used and throws an error naming the missing variable. There is no default secret and no fallback origin: a missing variable fails loudly instead of signing sessions with something invented.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are read only by the seed.

## Creating the first admin

The seed creates the user through Better Auth's own sign-up API, so the password is hashed by Better Auth and stored on the `account` row, never in plain text:

```bash
pnpm exec prisma db seed
```

With both variables present it prints `Admin user ready: <email> (role ADMIN)`. Running it again does not fail: `signUpEmail` answers `422` with `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, `alreadyRegistered` in `src/lib/auth-errors.ts` matches the `USER_ALREADY_EXISTS` prefix without swallowing any other API failure or a non-API throw, and only the role is set back to `ADMIN`. That idempotency is load-bearing: `prisma db seed` is meant to be re-runnable against a database that already has the account, and until this was fixed the second run exited 1.

With either variable missing the seed prints one line — for example `Admin user skipped: ADMIN_EMAIL and ADMIN_PASSWORD are not set.` — leaves every other account alone, and still exits successfully. It never invents credentials. The catalogue part of the seed is unchanged.

The panel has one account, and the seed is the only thing that creates it. `/api/auth/sign-up/email` is closed in `src/lib/auth.ts` with `disabledPaths: ["/sign-up/email"]`, so the endpoint answers `404` and no visitor can register whatever the body says. The role field was already `input: false`, so a client could never have asked for `ADMIN` either. The seed keeps working because it calls `auth.api.signUpEmail` in-process, and `disabledPaths` is enforced by the HTTP router, not by that call. Reopening the path for customer accounts is P8's decision, and it is one line.

## What the guard refuses

`src/app/admin/layout.tsx` reads the session on the server with `getAuth().api.getSession({ headers: await headers() })` and asks `adminAccess` in `src/features/admin/domain/session.ts`.

| Session | Result |
|---|---|
| no session | redirected to `/login?next=%2Fadmin` |
| `CUSTOMER` | redirected to `/login?next=%2Fadmin` |
| role missing, empty or any other string | redirected to `/login?next=%2Fadmin` |
| `ADMIN` | the layout renders |

The decision is `allowed` only when the role is exactly `ADMIN`; everything else is refused, and the refusal always carries the `next` parameter. A layout has no access to the deeper pathname, so `next` is the guarded base path `/admin`: after signing in, an admin lands on the panel and navigates from there.

`src/proxy.ts` is unchanged: it still sets `X-Robots-Tag: noindex, nofollow` on `/admin` and `/login`, and neither route declares metadata.

## Signing in

`/login` posts to the `signIn` server action in `src/app/login/actions.ts`, which calls Better Auth's `signInEmail`. A wrong email or password returns `El email o la contraseña no son correctos.`, painted with `--danger` (`role="alert"`), with `aria-invalid` on both fields and the note that this database has no other accounts yet. A failed attempt never creates a session, because the session cookie is only written when Better Auth returns one.

After a successful sign-in the action redirects to the `next` parameter when it is a same-origin path (`safeNextPath` in `src/app/login/next-path.ts`), and to `/admin` otherwise. Protocol-relative (`//host`), backslash, absolute (`https://host`), scheme-only and relative-without-slash values all fall back to `/admin`.

There is no password reset path in this phase. The login screen says so, and the only way back is to recreate the admin from the seed.

## The login attempt limiter

The form posts to a server action, not to `/api/auth/*`, so the library's HTTP rate limiter never sees it. `src/app/login/attempt-limit.ts` is the limiter for that path, and it copies the library's shape instead of inventing one:

| Piece | What it does |
|---|---|
| `decideAttempt(state, now, limits)` | the whole decision, pure: an attempt inside a window is counted, the attempt after the maximum is refused without moving the window, and an expired window starts again with the first attempt |
| `LOGIN_LIMITS` | `5` attempts per `10` minutes |
| `loginAttemptKey(email)` | `trim().toLowerCase()`, so ` Admin@Example.com ` and `admin@example.com` share one counter |
| `allowLoginAttempt` / `clearLoginAttempts` | the module-level `Map` that records an attempt and answers whether it may go ahead; expired keys are dropped as the map is written, and a correct password clears its key |
| `resetLoginAttempts` | empties the whole map, so each test starts from an empty store |

`signIn` records the attempt before it calls `signInEmail`, so a refused attempt never reaches the library or the database, and a correct password gives the address a fresh window.

A refused attempt answers with the same sentence as a wrong password, `El email o la contraseña no son correctos.`, on purpose: a separate "too many attempts" message, keyed by email, would answer the one question the form must not answer — whether that address exists. The cost is honest and it is in the same sentence the screen already shows: the owner is not told to wait.

**The store is memory, in the same terms as the library's own `memory` rate-limit storage.** It counts per process; it resets on every deploy or restart; it is not shared with a second instance. A real deployment needs a shared store — the library's `rateLimit.storage: "database"` or a limiter in front of the app — and this one stays a deliberate limitation of a one-account panel until then.

## Signing out

`Cerrar sesión` at the foot of the panel is a `<form>` posting the `signOut` server action in `src/app/admin/actions.ts`, not a link to `/login`. The action calls `getAuth().api.signOut({ headers: await headers() })` with the incoming request headers — the session token travels in a cookie, so those headers are what lets the library find the session — and then redirects to `/login`.

| Step | Effect |
|---|---|
| `api.signOut` | deletes the session row and returns the instructions that expire the session cookie |
| the `nextCookies()` plugin | writes those instructions onto the response Next.js sends back |
| `redirect("/login")` | the browser lands on the login screen without the panel |

The redirect happens only after the library answered: if `signOut` throws, the action throws and the panel stops there instead of showing a login screen over a live session. The shell also stops inventing an identity: `src/app/admin/layout.tsx` passes the session's `name` and `email` to `AdminShell`, which renders them and derives the avatar's initials from them (`adminInitials` in `src/features/admin/domain/session.ts`).

## What Better Auth already does, so this app does not

The rules below are the library's, verified against the installed `better-auth@1.7.27` and not re-implemented here:

| Rule | Where it lives |
|---|---|
| Passwords are hashed with scrypt and stored on the `Account` row, never in `User` | the library's default hasher; the app passes no custom `hash`/`verify` |
| A password must be 8 to 128 characters | `emailAndPassword` defaults; sign-up and change-password reject anything shorter or longer with `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` before touching the database |
| A refused sign-in answers `Invalid email or password` and runs a dummy hash for an unknown email | `signInEmail`; the action maps every refusal to one message, so the screen adds nothing either |
| A state-changing call from another origin is refused with `403 Invalid origin` | the library's origin check on `/api/auth/*`; neither `advanced.disableOriginCheck` nor `advanced.disableCSRFCheck` is set |
| Sign-in, change-password and change-email are throttled in production | the library's rate limiter, 3 requests per 10 seconds per path, `memory` storage; sign-up is no longer a mounted path |
| Cookies are `httpOnly`, `sameSite: lax`, and `secure` as soon as `BETTER_AUTH_URL` is an `https` origin | cookie defaults; the app sets none of them |
| The session is read from the `Session` table on every request | no `cookieCache` is configured, so a revoked session stops working immediately |
| `GET /api/auth/ok` answers `{ "ok": true }` | the library's health endpoint, used to know the route is mounted |

## What this phase deliberately does not do

Each line is a capability the four better-auth skills describe that this phase cannot honestly ship, and what would change that.

| Missing | Why | What would bring it back |
|---|---|---|
| Email verification (`emailVerification.sendVerificationEmail`) | there is no transactional email provider; `requireEmailVerification` would lock every account out | the provider that P8 needs for magic links |
| Password reset (`emailAndPassword.sendResetPassword`) | same provider; `/api/auth/request-password-reset` answers `400 RESET_PASSWORD_DISABLED` instead of pretending | the same provider |
| Two-factor authentication | it needs a plugin, its tables and a second screen; the panel is one seeded account | a phase that owns the plugin schema change |
| Audit logging (`databaseHooks`) | the project has no log sink to write to | a logging decision |
| Rate limiting that survives a restart | both limiters are memory: the library's on `/api/auth/*` and this app's on the login form | a shared store, which is a schema change or an infrastructure one |
| Customer accounts, and the sign-up endpoint with them | self-registration is closed and P8 owns customer accounts | P8 removing `disabledPaths: ["/sign-up/email"]` |

## Verifying it without a database

`src/lib/auth.test.ts` drives the mounted handler with the same requests a browser makes: the health check, a refused password reset, a refused verification email, a `404` on sign-up, the trusted origins list, and the shape of the instance itself. The seed's in-process sign-up is driven directly, and it answers with the library's `PASSWORD_TOO_SHORT` instead of a `404`, which is what proves the closure is on the route and not on the capability. No test needs Postgres, because each of those answers before the adapter is queried.

Better Auth turns its own origin check off when `NODE_ENV` is `test`, so the CSRF and origin rules are held by two facts instead of a 403 in that suite: the app passes no `advanced` block, which the inferred options type itself refuses (`auth.options` has no `advanced` key to disable), and every state-changing call the app makes runs inside a Next.js server action, where Next.js validates `Origin` and `Host` itself.

`src/app/login/actions.test.ts` pins the error shape: a wrong password and an unknown email produce the same sentence, a failure that is not a refused credential is not disguised as one, and the attempt after the window is full never reaches the library while answering with that same sentence.

`src/app/login/attempt-limit.test.ts` pins the limiter itself: the pure decision at both ends of a window, the normalized key, the store's count, the expiry and the clear, and one address not spending another's attempts.

`src/app/admin/actions.test.ts` pins the sign-out: the library is called with the incoming request headers, `/login` is where the action lands, and a library failure is not turned into a redirect. `src/lib/auth.test.ts` pins the other half of the same click: the mounted `/api/auth/sign-out` answers `200` and returns a `Set-Cookie` that expires `better-auth.session_token`, which is the library behaviour the action hands over to.

Two links of that chain stay unproven here, and both need the database or a Next.js runtime: that the session row is really gone (there is no session row to delete on this machine) and that the `nextCookies()` plugin writes those headers onto the response Next.js returns (it reads `next/headers`, which exists only inside a request). `src/lib/auth.test.ts` covers what answers before the adapter is queried, and that is also why the sign-up tests there expect a `404` and a password rule, never a created user.

## Migration

`prisma/migrations/20261112100000_add_auth/migration.sql` creates the `Role` enum, the `User`, `Session`, `Account` and `Verification` tables, their indexes and their foreign keys, all with defaults, so it is additive only: nothing existing is altered and no backfill is needed.

`prisma/migrations/20261112100000_add_auth/rollback.sql` is its hand-written inverse: it drops the two foreign keys, the four tables, the enum, and the row this migration inserts into `_prisma_migrations`.

The statements were produced with `prisma migrate diff` between the previous datamodel and the new one, so they match what Prisma would generate.

**Rehearsed on 2026-11-26, end to end.** `pnpm exec prisma migrate reset --force` applied all three migrations from zero, `prisma db seed` rebuilt the catalogue (90 products, 100 variants, 194 images), `rollback.sql` — run with `pnpm exec prisma db execute --file prisma/migrations/20261112100000_add_auth/rollback.sql` — dropped the four tables, the enum and the migration row and sent `migrate status` back to "not yet applied", `migrate deploy` re-applied it, and a second seed read back the same 90 products and 100 variants, proving the rollback touched nothing outside auth. `migrate status` ends at "Database schema is up to date".

The migration is verified; the account is not. The seed prints `Admin user skipped: ADMIN_EMAIL and ADMIN_PASSWORD are not set.`, so `/admin` has no user to sign in as until both variables exist in `.env` and the seed runs again. Everything that needs a request — the session row, `nextCookies()` writing its headers onto a real response — still needs the app running, which the owner does.
