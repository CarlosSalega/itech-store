import type { Metadata } from "next";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import { OrderReceiptView } from "@/features/checkout/ui/receipt";

export const instant = false;

export const metadata: Metadata = {
	title: "Tu pedido — iTech Store",
	description:
		"El comprobante de un pedido de demostración de iTech Store, con su número, sus productos y el total.",
	robots: { index: false, follow: true },
};

export default async function PedidoPage({ params }: PageProps<"/pedido/[codigo]">) {
	const { codigo } = await params;

	return (
		<>
			<a className="skip" href="#main">
				Saltar al contenido
			</a>

			<SiteHeader />

			<main id="main">
				<div className="wrap">
					<OrderReceiptView codigo={codigo} />
				</div>
			</main>

			<SiteFooter />
		</>
	);
}
