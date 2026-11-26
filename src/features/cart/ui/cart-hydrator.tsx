"use client";

import { useEffect, useRef } from "react";

import {
	browserStorage,
	CART_STORAGE_KEY,
	readStoredCart,
	serializeCart,
} from "../storage/local-storage";
import { mergeMyGuestCart } from "../server/actions";
import type { ServerCart } from "../server/cart-items";
import { useCart } from "./provider";

export function CartHydrator({ cart }: { cart: ServerCart }) {
	const { hydrateSession, applyServerCart } = useCart();
	const done = useRef(false);

	useEffect(() => {
		if (done.current) {
			return;
		}

		done.current = true;
		hydrateSession(cart);

		const storage = browserStorage();
		const leftover = readStoredCart(storage);

		if (leftover.lines.length === 0) {
			return;
		}

		void mergeMyGuestCart(serializeCart(leftover)).then((result) => {
			if (!result.ok) {
				return;
			}

			try {
				storage?.removeItem(CART_STORAGE_KEY);
			} catch {
				return;
			}

			applyServerCart(result);
		});
	}, [cart, hydrateSession, applyServerCart]);

	return null;
}
