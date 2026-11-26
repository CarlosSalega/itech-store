"use server";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import {
	ORDER_PROOF_COOKIE,
	orderProofCookieOptions,
	rememberOrderProof,
} from "./order-proof";
import { placeOrder, type PlaceOrderInput, type PlaceOrderResult } from "./place-order";

export async function placeOrderAction(
	input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
	const result = await placeOrder(input, {
		client: { variant: prisma.variant, order: prisma.order },
		year: () => new Date().getFullYear(),
	});

	if (result.ok) {
		const store = await cookies();
		const proof = rememberOrderProof(
			store.get(ORDER_PROOF_COOKIE)?.value,
			result.id,
		);

		store.set(ORDER_PROOF_COOKIE, proof, orderProofCookieOptions());
	}

	return result;
}
