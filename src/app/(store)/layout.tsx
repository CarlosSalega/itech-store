import { CartProvider } from "@/features/cart/ui/provider";
import { CartDrawer } from "@/features/cart/ui/drawer";
import { WhatsappButton } from "@/features/contact/whatsapp-button";

export default function StoreLayout({ children }: LayoutProps<"/">) {
	return (
		<CartProvider>
			{children}
			<CartDrawer />
			<WhatsappButton />
		</CartProvider>
	);
}
