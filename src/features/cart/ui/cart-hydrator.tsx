"use client";

import { useEffect, useRef } from "react";

import type { ServerCart } from "../server/cart-items";
import { useCart } from "./provider";

export function CartHydrator({ cart }: { cart: ServerCart }) {
	const { hydrateSession } = useCart();
	const done = useRef(false);

	useEffect(() => {
		if (!done.current) {
			done.current = true;
			hydrateSession(cart);
		}
	}, [cart, hydrateSession]);

	return null;
}
