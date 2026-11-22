import type { CartLine } from "@/features/cart/domain/cart";

import { createOrder, type Order, type OrderBuyer } from "../domain/order";

const SOFIA: OrderBuyer = {
	name: "Sofía Ramos",
	email: "sofia.ramos@example.com",
	phone: "11 5555 0100",
	address: "Av. Córdoba 1875, 4.º B",
	city: "CABA",
	postalCode: "1120",
};

const JULIAN: OrderBuyer = {
	name: "Julián Pereyra",
	email: "julian.pereyra@example.com",
	phone: "11 5555 0182",
	address: "Calle 47 812, 3.º A",
	city: "La Plata",
	postalCode: "1900",
};

const CAMILA: OrderBuyer = {
	name: "Camila Duarte",
	email: "camila.duarte@example.com",
	phone: "11 5555 0147",
	address: "Av. Santa Fe 2630, 8.º C",
	city: "CABA",
	postalCode: "1425",
};

const IPAD_11: CartLine = {
	variantId: "fx-ipad-11-256",
	sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
	productSlug: "apple-ipad-11-a16-chip-wi-fi",
	productName: 'Apple iPad 11" A16 Chip WI-FI',
	familyLabel: "iPad",
	variantLabel: "Capacidad 256 GB",
	imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
	imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
	unitPriceCents: 103_500_000,
	quantity: 1,
	available: true,
};

const MACBOOK_AIR_13: CartLine = {
	variantId: "fx-macbook-air-13",
	sku: "apple-13-macbook-air-chip-m5",
	productSlug: "apple-13-macbook-air-chip-m5",
	productName: 'Apple 13" MacBook Air - Chip M5',
	familyLabel: "Mac",
	variantLabel: null,
	imageUrl: "/products/mac/apple-13-macbook-air-chip-m5-1.webp",
	imageAlt: "Apple MacBook Air de 13 pulgadas con chip M5, abierta de frente",
	unitPriceCents: 200_000_000,
	quantity: 1,
	available: true,
};

const MACBOOK_AIR_15: CartLine = {
	variantId: "fx-macbook-air-15",
	sku: "apple-15-macbook-air-chip-m5",
	productSlug: "apple-15-macbook-air-chip-m5",
	productName: 'Apple 15" MacBook Air - Chip M5',
	familyLabel: "Mac",
	variantLabel: null,
	imageUrl: "/products/mac/apple-15-macbook-air-chip-m5-1.webp",
	imageAlt: "Apple MacBook Air de 15 pulgadas con chip M5, abierta de frente",
	unitPriceCents: 200_000_000,
	quantity: 1,
	available: true,
};

const WATCH_SERIES_11: CartLine = {
	variantId: "fx-watch-series-11-negro",
	sku: "apple-watch-series-11-caja-aluminio-negro-correa-deportiva-negra",
	productSlug: "apple-watch-series-11-caja-aluminio-negro-correa-deportiva-negra",
	productName: "Apple Watch Series 11 - Caja Aluminio Negro - Correa Deportiva Negra",
	familyLabel: "Watch",
	variantLabel: null,
	imageUrl:
		"/products/watch/apple-watch-series-11-caja-aluminio-negro-correa-deportiva-negra-1.webp",
	imageAlt: "Apple Watch Series 11 con caja de aluminio negro y correa deportiva negra",
	unitPriceCents: 60_000_000,
	quantity: 1,
	available: true,
};

const WATCH_SE_3: CartLine = {
	variantId: "fx-watch-se-3",
	sku: "watch-se-3-40mm",
	productSlug: "watch-se-3-40mm",
	productName: "Apple Watch SE 3 40mm",
	familyLabel: "Watch",
	variantLabel: null,
	imageUrl: "/products/watch/watch-se-3-40mm-1.webp",
	imageAlt: "Apple Watch SE 3 de 40 milímetros, de frente",
	unitPriceCents: 60_000_000,
	quantity: 1,
	available: true,
};

const HOMEPOD_MINI: CartLine = {
	variantId: "fx-homepod-mini",
	sku: "apple-homepod-mini",
	productSlug: "apple-homepod-mini",
	productName: "Apple HomePod Mini",
	familyLabel: "Accesorios",
	variantLabel: null,
	imageUrl: "/products/accessory/apple-homepod-mini-1.webp",
	imageAlt: "Apple HomePod Mini, altavoz inteligente",
	unitPriceCents: 3_000_000,
	quantity: 2,
	available: true,
};

const MAGIC_KEYBOARD: CartLine = {
	variantId: "fx-magic-keyboard-ipad",
	sku: "magic-keyboard-ipad-white",
	productSlug: "magic-keyboard-ipad-white",
	productName: "Apple Magic Keyboard iPad White",
	familyLabel: "Accesorios",
	variantLabel: null,
	imageUrl: "/products/accessory/magic-keyboard-ipad-white-1.webp",
	imageAlt: "Apple Magic Keyboard para iPad en blanco, de frente",
	unitPriceCents: 3_000_000,
	quantity: 1,
	available: true,
};

const AIRPODS_PRO_3: CartLine = {
	variantId: "fx-airpods-pro-3",
	sku: "airpods-pro-3",
	productSlug: "airpods-pro-3",
	productName: "Airpods Pro 3",
	familyLabel: "AirPods",
	variantLabel: null,
	imageUrl: "/products/airpods/airpods-pro-3-1.webp",
	imageAlt: "AirPods Pro 3 con su estuche de carga, de frente",
	unitPriceCents: 25_000_000,
	quantity: 1,
	available: true,
};

export const FIXTURE_ORDERS: readonly Order[] = [
	createOrder({
		cartLines: [IPAD_11, MACBOOK_AIR_13, WATCH_SERIES_11, HOMEPOD_MINI],
		buyer: SOFIA,
		payment: "transfer",
		number: "IT-2026-0003",
		createdAt: "2026-11-20T14:05:00.000Z",
	}),
	createOrder({
		cartLines: [WATCH_SE_3, AIRPODS_PRO_3],
		buyer: JULIAN,
		payment: "cash",
		number: "IT-2026-0002",
		createdAt: "2026-11-12T18:20:00.000Z",
	}),
	createOrder({
		cartLines: [MACBOOK_AIR_15, MAGIC_KEYBOARD],
		buyer: CAMILA,
		payment: "transfer",
		number: "IT-2026-0001",
		createdAt: "2026-11-03T11:48:00.000Z",
	}),
];
