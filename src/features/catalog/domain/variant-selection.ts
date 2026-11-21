export type VariantOption = {
	id: string;
	sku: string;
	label: string;
	variantLabel: string | null;
	price: number;
	stock: number;
};

export function resolveVariant(
	variants: VariantOption[],
	selectedId: string,
): VariantOption | undefined {
	return variants.find((option) => option.id === selectedId) ?? variants[0];
}

export function splitPrice(formatted: string): { currency: string; amount: string } {
	const [currency = "", ...amount] = formatted.split(" ");

	return { currency, amount: amount.join(" ") };
}
