# Validation with Zod, and room reserved for its messages

One shared schema per data contract, our own Spanish copy on top, and a slot under every field that already holds the space the message will need. Branch `feat/validation`. Five slices, V0 to V4.

## Specs

S1 — Goal (owner, verbatim): "me gustaria utilizar la libreria zod (si es que no la estamos usando aun) para validad cliente/servidor y agregar mensajes de error en la UI (Si es que aun no lo hay) para mejorar la UX, no olvides reservar los espacios para textos de error en la UI asi evitamos layout shift o saltos en la UI".

S2 — Zod owns the **data contract** — shape, required fields, email shape, positive integers, string length. It does not own business rules: `clampQuantity`, SKU derivation, the "unavailable lines out of the total" rule and the pesos-to-cents conversion stay where they are.

S3 — **One schema per contract, used by both sides.** The form and the server action validate with the same schema, so they cannot disagree about what is acceptable.

S4 — **Zod never speaks to the user.** A schema produces issues; a single mapper turns them into this project's Spanish copy, field by field. No English library message reaches a screen.

S5 — **Space is reserved, not revealed.** Every validated field owns a message slot with a minimum height of one line of `--t-caption`, and a summary slot where a form-level message appears. A message must be written to fit one line at 320px; anything longer grows the slot and brings the shift back, so the system records a maximum length.

S6 — **Announcement without jumping.** Each slot is `aria-live="polite"`, the field carries `aria-invalid` and `aria-describedby`, and a form-level failure uses `role="alert"`. Focus moves to the first invalid field on submit.

S7 — **Timing.** Validate on submit; after the first failed submit, revalidate as the visitor corrects. Never on the first keystroke of a pristine field.

S8 — **Copy is contract.** The strings already shipped — `Escribí tu email.`, `Falta el código postal.`, `Ese email no parece válido.` and the rest — stay byte-identical. The existing tests that assert them are the lock.

S9 — No behaviour change beyond validation and its presentation: same routes, same success paths, same tokens, no new dependency except `zod` pinned exactly.

## Tasks

- V0 — `zod` pinned, `src/lib/validation/` with the issue-to-copy mapper, the copy module and its tests. Specs: S2, S3, S4.
- V1 — Login: one schema shared by the form and the action, per-field messages, the error slot reserved. Specs: S3–S9.
- V2 — Checkout: the schema wraps `validateBuyer`; its public shape and strings unchanged, and its seven fields gain the reserved slot. Specs: S2, S3, S5, S6, S8.
- V3 — Admin product form: name, family, price, stock, slug; the pesos-to-cents conversion stays outside Zod, and the form gains the reserved slot. Specs: S2, S3, S5, S6, S8.
- V4 — `design/system.md` records the field-plus-slot rule, the copy length limit and where a **static** note belongs (never inside an error lane, or the lane cannot stay one line); the artboards that show errors gain the reserved slot. Specs: S5, S6.

## Log

- L1 (owner, verbatim): the S1 string above, plus "Dime que opinas antes de proceder con el plan".
- L2 (architect decision, approved by the owner): Zod at the boundary only; the mapper owns the copy; reserve the slot instead of animating it; V0 and V1 first so the pattern is reviewed before it spreads to checkout and the admin.
- L3 (V0 and V1 shipped): `zod` pinned at `4.6.7`, `src/lib/validation/` with the copy module (`MESSAGE_MAX_LENGTH = 44`, `FIELD_FALLBACK_MESSAGE = "Revisá este dato."`) and `messagesFromError`, which reads only single-segment paths, keeps the first issue per field and never lets a library sentence through. The login now validates with one schema on both sides, per-field slots are always present with `min-height: calc(var(--t-caption) * 1.35 + var(--s-1))` and `aria-live="polite"`, focus goes to the first rejected field, and nothing is validated before the first submit. Two consequences worth remembering: `z.email()` is stricter than Better Auth was, so `ADMIN_EMAIL` must be a normal `user@domain.tld` and not `admin@localhost`; and the shipped credential note is 92 characters, so it wraps to three lines at 320px inside the reserved lane — S8 forbids shortening it, so V4 must move it out of the lane instead of growing the reserve.
- L4 (V2 and V3 shipped): the checkout buyer and the admin product draft are zod schemas whose issues reach the screen only through `messagesFromError`; both validators keep their exported shape and every shipped sentence byte-identical, proven by the untouched `order.test.ts` and `product-form.test.ts`. Both surfaces gained a `BuyerField` and a `FormField` that render the slot unconditionally with the login's exact reserve, `aria-live="polite"` and `aria-describedby`; the help note is now permanent instead of being swapped out by the error, which is what made the old layout jump. Two deliberate differences worth remembering: the buyer email keeps the shipped `EMAIL_PATTERN` rather than `z.email()`, so acceptance does not change and the checkout stays more permissive than the login on purpose; and the pesos-to-cents and whole-units converters stayed outside Zod, with the schema validating the parsed integer so `"1.035.000"` cannot become `NaN`. The buyer contract has six fields, not seven. What stays out of Zod by design: catalogue slug uniqueness (needs the existing slugs) and the duplicate-capacity sentence (nested path, and the mapper reads single segments only).
