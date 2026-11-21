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
				<CartProvider>
					{children}
					<CartDrawer />
				</CartProvider>
				<WhatsappButton />
			</body>
		</html>
	);
}
