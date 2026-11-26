import { describe, expect, it } from "vitest";

import {
	ORDER_NUMBER_ATTEMPTS,
	createWithOrderNumber,
	isUniqueViolation,
	nextFreeOrderNumber,
	type OrderCreateData,
	type OrderNumberClient,
} from "./order-number";

type FakeNumberDatabase = {
	client: OrderNumberClient;
	numbers: string[];
	reads: string[];
	creates: string[];
};

function fakeDatabase(initial: readonly string[]): FakeNumberDatabase {
	const numbers = [...initial];
	const reads: string[] = [];
	const creates: string[] = [];

	const client: OrderNumberClient = {
		order: {
			findMany: async ({ where }) => {
				reads.push(where.number.startsWith);

				return numbers
					.filter((number) => number.startsWith(where.number.startsWith))
					.map((number) => ({ number }));
			},
			create: async ({ data }) => {
				creates.push(data.number);

				if (numbers.includes(data.number)) {
					throw Object.assign(new Error("Unique constraint failed"), {
						code: "P2002",
					});
				}

				numbers.push(data.number);

				return { id: `order_${numbers.length}`, number: data.number };
			},
		},
	};

	return { client, numbers, reads, creates };
}

const DATA: Omit<OrderCreateData, "number"> = {
	status: "nuevo",
	payment: "transfer",
	buyerName: "Sofía Ramos",
	buyerEmail: "sofia.ramos@example.com",
	buyerPhone: "11 5555 0100",
	buyerAddress: "Av. Córdoba 1875, 4.º B",
	buyerCity: "CABA",
	buyerPostalCode: "1120",
	totalCents: 103_500_000,
	lines: { create: [] },
};

describe("the order number, allocated by the database", () => {
	it("continues the year it is in, counting only that year", async () => {
		const { client, reads } = fakeDatabase([
			"IT-2026-0003",
			"IT-2026-0007",
			"IT-2025-0042",
		]);

		expect(await nextFreeOrderNumber(client, 2026)).toBe("IT-2026-0008");
		expect(reads).toEqual(["IT-2026-"]);
	});

	it("starts the year at one when nothing was sold yet", async () => {
		const { client } = fakeDatabase([]);

		expect(await nextFreeOrderNumber(client, 2026)).toBe("IT-2026-0001");
	});

	it("keeps four digits for the sequential part", async () => {
		const { client } = fakeDatabase(["IT-2026-0009"]);

		expect(await nextFreeOrderNumber(client, 2026)).toBe("IT-2026-0010");
	});

	it("retries once on a collision instead of failing the purchase", async () => {
		const { client, numbers, creates } = fakeDatabase(["IT-2026-0001"]);
		const racing = client.order.create;

		client.order.create = async (args) => {
			if (creates.length === 0) {
				creates.push(args.data.number);
				numbers.push(args.data.number);

				throw Object.assign(new Error("Unique constraint failed"), {
					code: "P2002",
				});
			}

			return racing(args);
		};

		const created = await createWithOrderNumber(client, DATA, 2026);

		expect(created.number).toBe("IT-2026-0003");
		expect(creates).toEqual(["IT-2026-0002", "IT-2026-0003"]);
		expect(numbers).toEqual(["IT-2026-0001", "IT-2026-0002", "IT-2026-0003"]);
	});

	it("gives up after the second collision instead of looping", async () => {
		const { client, numbers, reads } = fakeDatabase(["IT-2026-0001"]);

		client.order.create = async (args) => {
			numbers.push(args.data.number);

			throw Object.assign(new Error("Unique constraint failed"), {
				code: "P2002",
			});
		};

		await expect(createWithOrderNumber(client, DATA, 2026)).rejects.toThrow();

		expect(reads).toHaveLength(ORDER_NUMBER_ATTEMPTS);
		expect(numbers).toEqual(["IT-2026-0001", "IT-2026-0002", "IT-2026-0003"]);
	});

	it("does not mistake another failure for a collision", async () => {
		const { client } = fakeDatabase([]);

		client.order.create = async () => {
			throw Object.assign(new Error("connection lost"), { code: "P1001" });
		};

		await expect(createWithOrderNumber(client, DATA, 2026)).rejects.toThrow(
			"connection lost",
		);
		expect(isUniqueViolation({ code: "P1001" })).toBe(false);
		expect(isUniqueViolation({ code: "P2002" })).toBe(true);
		expect(isUniqueViolation(null)).toBe(false);
	});
});
