"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from "react";

import {
	addLine as addLineToCart,
	cartTotals,
	clearLastAdded,
	lastAddedLine,
	removeLine as removeLineFromCart,
	setQuantity as setQuantityInCart,
	type Cart,
	type CartLine,
	type CartTotals,
} from "./cart";
import {
	commitCart,
	getCartServerSnapshot,
	getCartSnapshot,
	subscribeCart,
} from "./cart-store";
import { revalidateCart } from "./cart-actions";
import { applyRevalidation } from "./cart-revalidation";

/**
 * The cart's client state: one provider at the root, so the header badge, the
 * product page and the drawer all read the same cart.
 *
 * The cart itself lives in the external store (`cart-store.ts`), not in React
 * state: the server renders an empty cart, the browser renders the stored one,
 * and every mutation is a write through the store. Only the panel's open flag is
 * React state, because nothing outside the browser owns it.
 */
/**
 * Whether the prices the panel shows were checked against the catalogue when the
 * panel opened (§S9). `failed` means the snapshot is on screen and the panel says
 * so; it never means the snapshot is current.
 */
export type PriceVerification = "idle" | "checking" | "verified" | "failed";

type CartContextValue = {
	cart: Cart;
	totals: CartTotals;
	lastAdded: CartLine | undefined;
	isOpen: boolean;
	verification: PriceVerification;
	addLine: (line: CartLine) => void;
	setQuantity: (variantId: string, quantity: number) => void;
	removeLine: (variantId: string) => void;
	openCart: () => void;
	closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
	const value = useContext(CartContext);

	if (value === null) {
		throw new Error("useCart se usa dentro de <CartProvider>.");
	}

	return value;
}

export function CartProvider({ children }: { children: ReactNode }) {
	const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, getCartServerSnapshot);
	const [isOpen, setIsOpen] = useState(false);
	const [verification, setVerification] = useState<PriceVerification>("idle");

	// Every mutation reads the freshest snapshot instead of a captured render:
	// two clicks before a re-render must not both start from the same cart.
	const addLine = useCallback((line: CartLine) => {
		commitCart(addLineToCart(getCartSnapshot(), line));
	}, []);

	const setQuantity = useCallback((variantId: string, quantity: number) => {
		commitCart(setQuantityInCart(getCartSnapshot(), variantId, quantity));
	}, []);

	const removeLine = useCallback((variantId: string) => {
		commitCart(removeLineFromCart(getCartSnapshot(), variantId));
	}, []);

	const openCart = useCallback(() => {
		setIsOpen(true);

		const current = getCartSnapshot();

		if (current.lines.length === 0) {
			setVerification("idle");
			return;
		}

		// Revalidating on open, not on render: the panel opens immediately with the
		// snapshot and corrects itself when the answer arrives.
		setVerification("checking");

		void revalidateCart(current.lines.map((line) => line.variantId))
			.then((result) => {
				if (!result.ok) {
					setVerification("failed");
					return;
				}

				commitCart(applyRevalidation(getCartSnapshot(), result));
				setVerification("verified");
			})
			.catch(() => {
				setVerification("failed");
			});
	}, []);

	const closeCart = useCallback(() => {
		setIsOpen(false);
		// §S5: reopening the cart must not claim something was just added.
		commitCart(clearLastAdded(getCartSnapshot()));
	}, []);

	const value = useMemo<CartContextValue>(
		() => ({
			cart,
			totals: cartTotals(cart),
			lastAdded: lastAddedLine(cart),
			isOpen,
			verification,
			addLine,
			setQuantity,
			removeLine,
			openCart,
			closeCart,
		}),
		[cart, isOpen, verification, addLine, setQuantity, removeLine, openCart, closeCart],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
