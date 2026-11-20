import type { Metadata } from "next";

import "./globals.css";

import { CartProvider } from "@/features/cart/ui/provider";
import { CartDrawer } from "@/features/cart/ui/drawer";
import { WhatsappButton } from "@/features/contact/whatsapp-button";

export const metadata: Metadata = {
	title: "iTech Store — catálogo Apple en pesos",
	description:
		"Catálogo de productos Apple en Argentina: Mac, iPad, Watch, AirPods y accesorios, con el precio de cada capacidad en pesos argentinos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="es-AR">
			<body>
				{/* The cart outlives every page: one provider, one drawer, both at the root. */}
				<CartProvider>
					{children}
					<CartDrawer />
				</CartProvider>
				{/* Public pages only today: no private route exists yet. When auth lands
				    these pages move into a (public) route group, and this moves with them. */}
				<WhatsappButton />
			</body>
		</html>
	);
}
