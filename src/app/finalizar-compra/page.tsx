import type { Metadata } from "next";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import { CheckoutWizard } from "@/features/checkout/ui/wizard";

export const metadata: Metadata = {
	title: "Finalizar compra — iTech Store",
	description:
		"Tres pasos para cerrar un pedido de demostración en iTech Store: quién lo recibe, el pago simulado y el comprobante.",
	robots: { index: false, follow: true },
};

export default function FinalizarCompraPage() {
	return (
		<>
			<a className="skip" href="#main">
				Saltar al contenido
			</a>

			<SiteHeader />

			<main id="main">
				<div className="wrap">
					<CheckoutWizard />
				</div>
			</main>

			<SiteFooter />
		</>
	);
}
