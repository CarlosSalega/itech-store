import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import { CheckoutSummary } from "@/features/cart/ui/checkout-summary";

import styles from "./finalizar-compra.module.css";

export const metadata: Metadata = {
	title: "Finalizar compra — iTech Store",
	description:
		"El pago online todavía no está disponible en iTech Store: la compra se coordina por contacto.",
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
					<nav aria-label="Ruta de navegación" className={styles.crumbs}>
						<ol>
							<li>
								<Link href="/">Inicio</Link>
							</li>
							<li aria-hidden="true" className={styles.sep}>
								/
							</li>
							<li aria-current="page">Finalizar compra</li>
						</ol>
					</nav>

					<header className={styles.head}>
						<h1 className={styles.title}>Finalizar compra</h1>
						<p className={styles.lead}>
							El pago online todavía no está disponible: estamos preparando el cobro
							con MercadoPago. Por ahora, la compra se coordina por contacto, con el
							detalle que ves acá abajo.
						</p>
					</header>

					<CheckoutSummary />

					<div className={styles.actions}>
						<Link className={styles.primary} href="/contacto">
							Coordinar la compra
						</Link>
						<Link className={styles.secondary} href="/catalogo">
							Volver al catálogo
						</Link>
					</div>

					<p className={styles.caption}>
						No se cobró nada y no se envió ningún pedido: esta pantalla todavía no
						crea una orden.
					</p>
				</div>
			</main>

			<SiteFooter />
		</>
	);
}
