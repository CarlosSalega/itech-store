const arsPesos = new Intl.NumberFormat("es-AR", {
	style: "decimal",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

export function formatArsPrice(cents: number): string {
	const pesos = Math.round(cents / 100);

	return `$ ${arsPesos.format(pesos)}`.replace(/[\u00a0\u202f]/g, " ");
}
