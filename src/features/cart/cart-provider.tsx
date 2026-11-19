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

/**
 * The cart's client state: one provider at the root, so the header badge, the
 * product page and the drawer all read the same cart.
 *
 * The cart itself lives in the external store (`cart-store.ts`), not in React
 * state: the server renders an empty cart, the browser renders the stored one,
 * and every mutation is a write through the store. Only the panel's open flag is
 * React state, because nothing outside the browser owns it.
 */
type CartContextValue = {
	cart: Cart;
	totals: CartTotals;
	lastAdded: CartLine | undefined;
	isOpen: boolean;
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
			addLine,
			setQuantity,
			removeLine,
			openCart,
			closeCart,
		}),
		[cart, isOpen, addLine, setQuantity, removeLine, openCart, closeCart],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
