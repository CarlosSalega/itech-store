import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import { ChevronRightIcon } from "@/features/catalog/icons";

import styles from "./contacto.module.css";

export const metadata: Metadata = {
	title: "Contacto — iTech Store",
	description:
		"Los canales de iTech Store para consultar por un producto del catálogo Apple.",
};

/*
 * Contact channels.
 *
 * The repository carries no phone number and no email address for the store, and
 * inventing one would send a real person to a number or a mailbox nobody reads.
 * Both stay `null`, the page says the channel is pending, and filling in the
 * value here turns the row into a link without touching the markup:
 *
 *   whatsapp: { href: "https://wa.me/54...", label: "+54 ..." }
 *   email: { href: "mailto:...", label: "..." }
 */
const CONTACT: {
	whatsapp: { href: string; label: string } | null;
	email: { href: string; label: string } | null;
} = {
	whatsapp: null,
	email: null,
};

export default function ContactoPage() {
	const pending = CONTACT.whatsapp === null || CONTACT.email === null;

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
							<li aria-current="page">Contacto</li>
						</ol>
					</nav>

					<header className={styles.head}>
						<h1 className={styles.title}>Hablemos.</h1>
						<p className={styles.deck}>
							El catálogo es público y los pedidos se coordinan a mano por ahora.
							Estos son los canales del local.
						</p>
					</header>
				</div>

				<div className="rule" role="presentation" />

				<section aria-labelledby="canales-title" className={styles.section}>
					<div className="wrap">
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle} id="canales-title">
								{pending ? "Un canal, todavía sin datos." : "Dos canales abiertos."}
							</h2>
							<p>
								{pending
									? "El local todavía no publicó su número ni su correo, así que no inventamos ninguno: no hay ningún enlace de contacto que no lleve a una persona."
									: "Escribinos por WhatsApp o por correo y te respondemos con el precio y el stock de la variante que te interesa."}
							</p>
						</div>

						<ul className={styles.channels}>
							<li className={styles.channel}>
								{/* A plain <img> on purpose: this is a committed 28px SVG icon, which
								    the framework image component does not optimise. It is decorative, so the
								    row's heading carries the name of the channel. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									alt=""
									className={styles.channelIcon}
									decoding="async"
									height={28}
									loading="lazy"
									src="/whatsapp.svg"
									width={28}
								/>
								<div className={styles.channelBody}>
									<h3 className={styles.channelName}>WhatsApp</h3>
									<p className={styles.channelCopy}>
										El canal más rápido: mandá el modelo y la capacidad que
										buscás y te contestamos con el precio de esa variante.
									</p>
								</div>
								{CONTACT.whatsapp === null ? (
									<span className={styles.pending}>Número a confirmar</span>
								) : (
									<a className={styles.channelLink} href={CONTACT.whatsapp.href}>
										{CONTACT.whatsapp.label}
										<ChevronRightIcon className={styles.channelIconLink} />
									</a>
								)}
							</li>

							<li className={styles.channel}>
								<div aria-hidden="true" className={styles.channelLetter}>
									@
								</div>
								<div className={styles.channelBody}>
									<h3 className={styles.channelName}>Correo</h3>
									<p className={styles.channelCopy}>
										Para consultas largas, facturación o un pedido por encargo.
									</p>
								</div>
								{CONTACT.email === null ? (
									<span className={styles.pending}>Dirección a confirmar</span>
								) : (
									<a className={styles.channelLink} href={CONTACT.email.href}>
										{CONTACT.email.label}
										<ChevronRightIcon className={styles.channelIconLink} />
									</a>
								)}
							</li>
						</ul>
					</div>
				</section>

				<div className="rule" role="presentation" />

				<section aria-labelledby="form-title" className={styles.section}>
					<div className="wrap">
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle} id="form-title">
								Sin formulario, por ahora.
							</h2>
							<p>
								Esta página no tiene un formulario a propósito: no hay nada del
								otro lado que reciba el mensaje todavía, y un botón que no envía
								nada sería mentira. Cuando exista el carrito, la confirmación del
								pedido reemplaza a este párrafo.
							</p>
						</div>

						<div className={styles.actions}>
							<Link className={styles.primary} href="/catalogo">
								Ver el catálogo
							</Link>
							<Link className={styles.secondary} href="/catalogo?familia=mac">
								Buscar por familia
								<ChevronRightIcon className={styles.secondaryIcon} />
							</Link>
						</div>
					</div>
				</section>
			</main>

			<SiteFooter />
		</>
	);
}
