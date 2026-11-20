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
} from "../domain/cart";
import {
	commitCart,
	getCartServerSnapshot,
	getCartSnapshot,
	subscribeCart,
} from "../storage/store";
import { revalidateCart } from "../server/actions";
import { applyRevalidation } from "../server/revalidation";

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
