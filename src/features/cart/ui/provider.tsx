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
	commitRemoteCart,
	hydrateRemoteCart,
	getCartServerSnapshot,
	getCartSnapshot,
	subscribeCart,
} from "../storage/store";
import {
	addCartLine,
	removeCartLine,
	revalidateCart,
	updateCartLine,
	type ServerCartResult,
} from "../server/actions";
import type { ServerCart } from "../server/cart-items";
import { applyRevalidation } from "../server/revalidation";

export type PriceVerification = "idle" | "checking" | "verified" | "failed";

type CartContextValue = {
	cart: Cart;
	totals: CartTotals;
	lastAdded: CartLine | undefined;
	isOpen: boolean;
	verification: PriceVerification;
	hydrateSession: (cart: ServerCart) => void;
	cappedVariantIds: string[];
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
	const [sessionCart, setSessionCart] = useState<ServerCart | null>(null);
	const [cappedVariantIds, setCappedVariantIds] = useState<string[]>([]);
	const signedIn = sessionCart !== null;

	const hydrateSession = useCallback((next: ServerCart) => {
		setSessionCart(next);
		setCappedVariantIds(next.cappedVariantIds);
		hydrateRemoteCart({ lines: next.lines, lastAddedVariantId: null });
	}, []);

	const commit = useCallback(
		(next: Cart) => (signedIn ? commitRemoteCart(next) : commitCart(next)),
		[signedIn],
	);

	const applyServerCart = useCallback(
		(result: ServerCartResult) => {
			if (!result.ok) {
				setVerification("failed");
				return;
			}

			commitRemoteCart({
				lines: result.lines,
				lastAddedVariantId: getCartSnapshot().lastAddedVariantId,
			});
			setCappedVariantIds(result.cappedVariantIds);
		},
		[],
	);

	const addLine = useCallback(
		(line: CartLine) => {
			if (!signedIn) {
				commitCart(addLineToCart(getCartSnapshot(), line));
				return;
			}

			commitRemoteCart(addLineToCart(getCartSnapshot(), line));

			void addCartLine(line.variantId, line.quantity).then(applyServerCart);
		},
		[signedIn, applyServerCart],
	);

	const setQuantity = useCallback(
		(variantId: string, quantity: number) => {
			if (!signedIn) {
				commitCart(setQuantityInCart(getCartSnapshot(), variantId, quantity));
				return;
			}

			commitRemoteCart(setQuantityInCart(getCartSnapshot(), variantId, quantity));

			void updateCartLine(variantId, quantity).then(applyServerCart);
		},
		[signedIn, applyServerCart],
	);

	const removeLine = useCallback(
		(variantId: string) => {
			if (!signedIn) {
				commitCart(removeLineFromCart(getCartSnapshot(), variantId));
				return;
			}

			commitRemoteCart(removeLineFromCart(getCartSnapshot(), variantId));

			void removeCartLine(variantId).then(applyServerCart);
		},
		[signedIn, applyServerCart],
	);

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

				commit(applyRevalidation(getCartSnapshot(), result));
				setVerification("verified");
			})
			.catch(() => {
				setVerification("failed");
			});
	}, [commit]);

	const closeCart = useCallback(() => {
		setIsOpen(false);
		commit(clearLastAdded(getCartSnapshot()));
	}, [commit]);

	const value = useMemo<CartContextValue>(
		() => ({
			cart,
			totals: cartTotals(cart),
			lastAdded: lastAddedLine(cart),
			isOpen,
			verification,
			hydrateSession,
			cappedVariantIds,
			addLine,
			setQuantity,
			removeLine,
			openCart,
			closeCart,
		}),
		[
			cart,
			isOpen,
			verification,
			hydrateSession,
			cappedVariantIds,
			addLine,
			setQuantity,
			removeLine,
			openCart,
			closeCart,
		],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
