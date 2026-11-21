# Contact channels

Status: **in force**. Two constants decide how the store can be reached, and both are `null` today
because the owner has not confirmed them.

## The rule

**C1 — The repository carries no phone number and no email address until the owner gives them.**
Inventing one sends a real person to a number or a mailbox nobody reads, which is worse than a page
that says the channel is pending. Nothing in the code may default, guess, or placeholder a number.

**C2 — One module holds both channels.** `src/features/contact/contact-channels.ts` exports
`WHATSAPP_NUMBER` and `CONTACT_EMAIL`, both `string | null`, and derives from them the shapes the
pages render: `WHATSAPP_CHANNEL` and `EMAIL_CHANNEL`, each either a ready `{ href, label }` or `null`.
The contact page and the floating WhatsApp action read the same module, so they can never disagree
about whether a number exists.

**C3 — Filling the two constants is the only change needed to turn both on.** The values are the
international number in digits only and the mailbox address:

```
WHATSAPP_NUMBER = "5491123456789"   // international format, digits only
CONTACT_EMAIL = "ventas@dominio.com"
```

**C4 — `wa.me` accepts digits only**, so a pasted number with spaces, dashes or a leading `+` is
normalised by `whatsappHref` instead of being pasted correctly by hand.

**C5 — An absent channel never becomes a dead link.** The contact page renders a channel as a link
only when its value exists, and otherwise states that it is pending ("Número a confirmar",
"Dirección a confirmar"), so the page never offers a control that cannot act. While the number is
unconfirmed, the floating WhatsApp action links to `/contacto`, whose whole job is to say the channel
is pending, and its accessible name says exactly that; filling `WHATSAPP_NUMBER` upgrades it to a
real chat with no change in the component.

**C6 — There is no form, on purpose.** Nothing on the other side would receive a message yet, and a
button that sends nothing is a lie. The contact page says so instead of rendering one.

## Where the rules used to live

Until `refactor/remaining-comments` this document did not exist: C1–C6 were prose comments inside
`src/features/contact/contact-channels.ts`, `whatsapp-button.tsx` and the contact page. The comments
were deleted after the rules were written here, so this file is now their only record.
