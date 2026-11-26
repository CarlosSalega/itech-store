import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import { ORDER_PROOF_COOKIE, parseOrderProofs } from "@/features/checkout/server/order-proof";
import { readOrderReceipt } from "@/features/checkout/server/order-receipt";
import { OrderProofGate, OrderReceipt } from "@/features/checkout/ui/receipt";

export const instant = false;

export const metadata: Metadata = {
	title: "Tu pedido — iTech Store",
	description:
		"El comprobante de un pedido de demostración de iTech Store, con su número, sus productos y el total.",
	robots: { index: false, follow: true },
};

export default async function PedidoPage({
	params,
	searchParams,
}: PageProps<"/pedido/[codigo]">) {
	const { codigo } = await params;
	const { email } = await searchParams;
	const proof = (await cookies()).get(ORDER_PROOF_COOKIE)?.value;

	const result = await readOrderReceipt({
		codigo,
		email: typeof email === "string" ? email : null,
		proofs: parseOrderProofs(proof),
	});

	return (
		<>
			<a className="skip" href="#main">
				Saltar al contenido
			</a>

			<SiteHeader />

			<main id="main">
				<div className="wrap">
					{result.state === "visible" ? (
						<OrderReceipt order={result.order} />
					) : (
						<OrderProofGate attempted={result.attempted} codigo={codigo} />
					)}
				</div>
			</main>

			<SiteFooter />
		</>
	);
}
