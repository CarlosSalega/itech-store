import { nextOrderNumber, type OrderPayment } from "../domain/order";

export const ORDER_NUMBER_ATTEMPTS = 2;

export type OrderLineCreateData = {
	productName: string;
	productSlug: string;
	familyLabel: string;
	variantSku: string;
	variantLabel: string | null;
	quantity: number;
	unitPriceCents: number;
	imageUrl: string | null;
	imageAlt: string;
};

export type OrderCreateData = {
	number: string;
	status: "nuevo";
	payment: OrderPayment;
	buyerName: string;
	buyerEmail: string;
	buyerPhone: string;
	buyerAddress: string;
	buyerCity: string;
	buyerPostalCode: string;
	totalCents: number;
	lines: { create: OrderLineCreateData[] };
};

export type OrderNumberClient = {
	order: {
		findMany(args: {
			where: { number: { startsWith: string } };
			select: { number: true };
		}): Promise<readonly { number: string }[]>;
		create(args: {
			data: OrderCreateData;
			select: { id: true; number: true };
		}): Promise<{ id: string; number: string }>;
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function isUniqueViolation(error: unknown): boolean {
	return isRecord(error) && error.code === "P2002";
}

function yearPrefix(year: number): string {
	return `IT-${year}-`;
}

export async function nextFreeOrderNumber(
	client: OrderNumberClient,
	year: number,
): Promise<string> {
	const rows = await client.order.findMany({
		where: { number: { startsWith: yearPrefix(year) } },
		select: { number: true },
	});

	return nextOrderNumber(
		rows.map((row) => row.number),
		year,
	);
}

export async function createWithOrderNumber(
	client: OrderNumberClient,
	data: Omit<OrderCreateData, "number">,
	year: number,
): Promise<{ id: string; number: string }> {
	let collision: unknown;

	for (let attempt = 0; attempt < ORDER_NUMBER_ATTEMPTS; attempt += 1) {
		const number = await nextFreeOrderNumber(client, year);

		try {
			return await client.order.create({
				data: { ...data, number },
				select: { id: true, number: true },
			});
		} catch (error) {
			if (!isUniqueViolation(error)) {
				throw error;
			}

			collision = error;
		}
	}

	throw collision;
}
