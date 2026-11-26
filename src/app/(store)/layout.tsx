import { Suspense } from "react";

import { CartProvider } from "@/features/cart/ui/provider";
import { CartDrawer } from "@/features/cart/ui/drawer";
import { WhatsappButton } from "@/features/contact/whatsapp-button";
import { CartSession } from "@/features/cart/server/cart-session";

export default function StoreLayout({ children }: LayoutProps<"/">) {
	return (
		<CartProvider>
			{children}
			<CartDrawer />
			<WhatsappButton />
			<Suspense fallback={null}>
				<CartSession />
			</Suspense>
		</CartProvider>
	);
}
