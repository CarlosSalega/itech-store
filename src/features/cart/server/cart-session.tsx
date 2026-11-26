import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { readServerCart, type ServerCart } from "./cart-items";

import { CartHydrator } from "@/features/cart/ui/cart-hydrator";

export async function CartSession() {
	const session = await getAuth()
		.api.getSession({ headers: await headers() })
		.catch(() => null);
	const userId = session?.user.id ?? null;

	if (userId === null) {
		return null;
	}

	let cart: ServerCart;

	try {
		cart = await readServerCart(userId);
	} catch {
		return null;
	}

	return <CartHydrator cart={cart} />;
}
