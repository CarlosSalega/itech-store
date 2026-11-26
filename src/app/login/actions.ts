"use server";

import { APIError } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { mergeGuestCartForUser } from "@/features/cart/server/cart-items";
import { parseCart } from "@/features/cart/storage/local-storage";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { INVALID_CREDENTIALS } from "./copy";
import { allowLoginAttempt, clearLoginAttempts, loginAttemptKey } from "./attempt-limit";
import { safeNextPath } from "./next-path";
import { loginPayload, payloadMessages, type LoginMessages } from "./schema";

export type SignInState = {
	error: string | null;
	messages?: LoginMessages;
};

function field(formData: FormData, name: string): string {
	const value = formData.get(name);

	return typeof value === "string" ? value : "";
}

export async function signIn(
	_state: SignInState,
	formData: FormData,
): Promise<SignInState> {
	const next = safeNextPath(field(formData, "next"));
	const payload = loginPayload(formData);
	const key = loginAttemptKey(payload.email);

	if (!allowLoginAttempt(key, Date.now())) {
		return { error: INVALID_CREDENTIALS };
	}

	const messages = payloadMessages(payload);

	if (Object.keys(messages).length > 0) {
		return { error: null, messages };
	}

	try {
		await getAuth().api.signInEmail({
			body: { email: payload.email, password: payload.password },
			headers: await headers(),
		});
	} catch (error) {
		if (error instanceof APIError) {
			return { error: INVALID_CREDENTIALS };
		}

		throw error;
	}

	clearLoginAttempts(key);

	const guestCart = parseCart(field(formData, "guestCart"));

	if (guestCart.lines.length > 0) {
		const user = await prisma.user
			.findUnique({ where: { email: payload.email }, select: { id: true } })
			.catch(() => null);

		if (user !== null) {
			await mergeGuestCartForUser(user.id, guestCart.lines).catch(() => undefined);
		}
	}

	redirect(next);
}
