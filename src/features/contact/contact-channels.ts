/**
 * The store's contact channels, in one place.
 *
 * The repository carries no phone number and no email address for the store, and
 * inventing one would send a real person to a number or a mailbox nobody reads.
 * Both stay `null` until the owner confirms them. The contact page says the
 * channel is pending, and the floating WhatsApp button falls back to that page
 * instead of opening a chat that cannot exist yet.
 *
 * Filling these two constants is the only change needed to turn both on:
 *
 *   WHATSAPP_NUMBER = "5491123456789"  // international format, digits only
 *   CONTACT_EMAIL = "ventas@dominio.com"
 */
export const WHATSAPP_NUMBER: string | null = null;
export const CONTACT_EMAIL: string | null = null;

/** `wa.me` only accepts digits, so a pasted number with spaces or dashes is normalised. */
export function whatsappHref(number: string): string {
	return `https://wa.me/${number.replace(/\D/g, "")}`;
}

export function mailtoHref(email: string): string {
	return `mailto:${email}`;
}

/** Shape the contact page renders: a ready link, or nothing to link to. */
export type ContactChannel = { href: string; label: string } | null;

export const WHATSAPP_CHANNEL: ContactChannel = WHATSAPP_NUMBER
	? { href: whatsappHref(WHATSAPP_NUMBER), label: WHATSAPP_NUMBER }
	: null;

export const EMAIL_CHANNEL: ContactChannel = CONTACT_EMAIL
	? { href: mailtoHref(CONTACT_EMAIL), label: CONTACT_EMAIL }
	: null;
