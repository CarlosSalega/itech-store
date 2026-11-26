"use client";

import { useActionState, useEffect, useRef } from "react";

import { signIn, type SignInState } from "./actions";
import { LoginFields } from "./login-fields";

import {
	browserStorage,
	CART_STORAGE_KEY,
	parseCart,
	readStoredCart,
	serializeCart,
	writeStoredCart,
} from "@/features/cart/storage/local-storage";

const EMPTY: SignInState = { error: null };

export function LoginForm({ next }: { next: string }) {
	const [state, action] = useActionState(signIn, EMPTY);
	const backup = useRef<string | null>(null);

	const submit = (formData: FormData) => {
		const storage = browserStorage();
		const cart = readStoredCart(storage);

		backup.current = cart.lines.length > 0 ? serializeCart(cart) : null;

		if (backup.current !== null) {
			formData.set("guestCart", backup.current);
		}

		if (storage !== null) {
			try {
				storage.removeItem(CART_STORAGE_KEY);
			} catch {
				backup.current = null;
			}
		}

		action(formData);
	};

	useEffect(() => {
		if (state.error !== null && backup.current !== null) {
			writeStoredCart(browserStorage(), parseCart(backup.current));
			backup.current = null;
		}
	}, [state]);

	return (
		<LoginFields
			action={submit}
			error={state.error}
			messages={state.messages}
			next={next}
		/>
	);
}
