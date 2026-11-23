"use server";

import { APIError } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";

import { INVALID_CREDENTIALS } from "./copy";
import { allowLoginAttempt, clearLoginAttempts, loginAttemptKey } from "./attempt-limit";
import { safeNextPath } from "./next-path";

export type SignInState = {
	error: string | null;
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
	const email = field(formData, "email").trim();
	const password = field(formData, "password");
	const key = loginAttemptKey(email);

	if (!allowLoginAttempt(key, Date.now())) {
		return { error: INVALID_CREDENTIALS };
	}

	try {
		await getAuth().api.signInEmail({
			body: { email, password },
			headers: await headers(),
		});
	} catch (error) {
		if (error instanceof APIError) {
			return { error: INVALID_CREDENTIALS };
		}

		throw error;
	}

	clearLoginAttempts(key);

	redirect(next);
}
