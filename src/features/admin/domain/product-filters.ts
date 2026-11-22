import {
	FAMILY_SLUG,
	familyFromSlug,
} from "@/features/catalog/domain/catalog";

import { isLowOnStock, type AdminProduct } from "./product";

export type ProductStatusFilter =
	| "todos"
	| "publicados"
	| "sin-publicar"
	| "stock-bajo";

export type ProductFilters = {
	query: string;
	family: AdminProduct["category"] | null;
	status: ProductStatusFilter;
};

export const PRODUCT_STATUS_FILTERS = [
	"todos",
	"publicados",
	"sin-publicar",
	"stock-bajo",
] as const satisfies readonly ProductStatusFilter[];

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
	query: "",
	family: null,
	status: "todos",
};

const STATUS_LABEL: Record<ProductStatusFilter, string> = {
	todos: "Todos",
	publicados: "Publicados",
	"sin-publicar": "Sin publicar",
	"stock-bajo": "Stock bajo",
};

export function productStatusLabel(
	status: ProductStatusFilter,
	count: number,
): string {
	return status === "todos" ? STATUS_LABEL.todos : `${STATUS_LABEL[status]} (${count})`;
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

function plain(value: string): string {
	return value
		.normalize("NFD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.trim();
}

function firstValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function statusFrom(value: string | undefined): ProductStatusFilter {
	return PRODUCT_STATUS_FILTERS.find((status) => status === value) ?? "todos";
}

export function productFiltersFromParams(
	params: Record<string, string | string[] | undefined>,
): ProductFilters {
	return {
		query: firstValue(params.q) ?? "",
		family: familyFromSlug(firstValue(params.familia)),
		status: statusFrom(firstValue(params.estado)),
	};
}

export function productFilterHref(filters: ProductFilters): string {
	const params = new URLSearchParams();

	if (filters.query !== "") {
		params.set("q", filters.query);
	}

	if (filters.family !== null) {
		params.set("familia", FAMILY_SLUG[filters.family]);
	}

	if (filters.status !== "todos") {
		params.set("estado", filters.status);
	}

	const query = params.toString();

	return query === "" ? "/admin/productos" : `/admin/productos?${query}`;
}

function matchesQuery(product: AdminProduct, query: string): boolean {
	if (query === "") {
		return true;
	}

	const needle = plain(query);

	return (
		plain(product.name).includes(needle) ||
		product.variants.some((variant) => plain(variant.sku).includes(needle))
	);
}

function matchesStatus(product: AdminProduct, status: ProductStatusFilter): boolean {
	if (status === "publicados") {
		return product.published;
	}

	if (status === "sin-publicar") {
		return !product.published;
	}

	if (status === "stock-bajo") {
		return isLowOnStock(product);
	}

	return true;
}

export function filterAdminProducts(
	products: readonly AdminProduct[],
	filters: ProductFilters,
): readonly AdminProduct[] {
	return products.filter((product) => {
		if (filters.family !== null && product.category !== filters.family) {
			return false;
		}

		return matchesQuery(product, filters.query) && matchesStatus(product, filters.status);
	});
}

export function productStatusCounts(
	products: readonly AdminProduct[],
): Record<ProductStatusFilter, number> {
	return {
		todos: products.length,
		publicados: products.filter((product) => product.published).length,
		"sin-publicar": products.filter((product) => !product.published).length,
		"stock-bajo": products.filter((product) => isLowOnStock(product)).length,
	};
}
