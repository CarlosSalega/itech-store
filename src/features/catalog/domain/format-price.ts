// Argentine formatting for money. The database stores integer cents (ARS), and
// cents never leave this module: every surface renders pesos.
const arsPesos = new Intl.NumberFormat("es-AR", {
	style: "decimal",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

/**
 * Formats an amount stored as integer ARS cents, e.g. `90000000` → `$ 900.000`.
 */
export function formatArsPrice(cents: number): string {
	const pesos = Math.round(cents / 100);

	// Intl may group with a non-breaking space (U+00A0) or a narrow one (U+202F).
	// The design system specifies a plain space after the currency sign, so the
	// formatter normalises instead of pushing that detail onto every caller.
	return `$ ${arsPesos.format(pesos)}`.replace(/[\u00a0\u202f]/g, " ");
}
