export type VariantRow = {
	sku: string;
	storage: string | null;
	price: number;
	stock: number;
};

export const VARIANT_SELECT = {
	sku: true,
	storage: true,
	price: true,
	stock: true,
} as const;

export type VariantDelegate = {
	findMany(args: {
		where: { productId: string };
		select: typeof VARIANT_SELECT;
	}): Promise<readonly VariantRow[]>;
	create(args: {
		data: {
			productId: string;
			sku: string;
			storage: string | null;
			color: string | null;
			price: number;
			stock: number;
		};
	}): Promise<unknown>;
	update(args: {
		where: { sku: string };
		data: { storage: string | null; price: number; stock: number };
	}): Promise<unknown>;
	deleteMany(args: {
		where: { productId: string; sku: { in: string[] } };
	}): Promise<unknown>;
};

export async function reconcileProductVariants(
	delegate: VariantDelegate,
	productId: string,
	variants: readonly VariantRow[],
): Promise<void> {
	const wanted = new Map(variants.map((variant) => [variant.sku, variant]));
	const stored = await delegate.findMany({
		where: { productId },
		select: VARIANT_SELECT,
	});
	const bySku = new Map(stored.map((row) => [row.sku, row]));

	for (const variant of wanted.values()) {
		const current = bySku.get(variant.sku);

		if (current === undefined) {
			await delegate.create({
				data: {
					productId,
					sku: variant.sku,
					storage: variant.storage,
					color: null,
					price: variant.price,
					stock: variant.stock,
				},
			});
			continue;
		}

		if (
			current.storage === variant.storage &&
			current.price === variant.price &&
			current.stock === variant.stock
		) {
			continue;
		}

		await delegate.update({
			where: { sku: variant.sku },
			data: {
				storage: variant.storage,
				price: variant.price,
				stock: variant.stock,
			},
		});
	}

	const stale = stored
		.filter((row) => !wanted.has(row.sku))
		.map((row) => row.sku);

	if (stale.length > 0) {
		await delegate.deleteMany({ where: { productId, sku: { in: stale } } });
	}
}
