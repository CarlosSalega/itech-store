import { z } from "zod";

export const PRODUCT_DRAFT_SCHEMA = z.object({
	name: z.string().trim().min(1),
	category: z.string().trim().min(1),
	variants: z.array(z.unknown()).min(1),
});

export const PRODUCT_DRAFT_MESSAGES = {
	name: "Poné el nombre del producto.",
	category: "Elegí una familia.",
	variants: "Cargá al menos una variante.",
};

export const VARIANT_REQUIRED_SCHEMA = z.object({
	label: z.string().trim().min(1),
	price: z.string().trim().min(1),
});

export const VARIANT_REQUIRED_MESSAGES = {
	label: "Poné la capacidad de esta variante.",
	price: "Poné el precio de esta variante.",
};

export const VARIANT_SHAPE_SCHEMA = z.object({
	priceCents: z.number().int().min(0),
	stock: z.number().int().min(0),
});

export const VARIANT_SHAPE_MESSAGES = {
	priceCents: "Ese precio no es un número.",
	stock: "Poné el stock en unidades enteras.",
};
