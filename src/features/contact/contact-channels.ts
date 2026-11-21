export const WHATSAPP_NUMBER: string | null = null;
export const CONTACT_EMAIL: string | null = null;

export function whatsappHref(number: string): string {
	return `https://wa.me/${number.replace(/\D/g, "")}`;
}

export function mailtoHref(email: string): string {
	return `mailto:${email}`;
}

export type ContactChannel = { href: string; label: string } | null;

export const WHATSAPP_CHANNEL: ContactChannel = WHATSAPP_NUMBER
	? { href: whatsappHref(WHATSAPP_NUMBER), label: WHATSAPP_NUMBER }
	: null;

export const EMAIL_CHANNEL: ContactChannel = CONTACT_EMAIL
	? { href: mailtoHref(CONTACT_EMAIL), label: CONTACT_EMAIL }
	: null;
