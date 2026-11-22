"use client";

import { useSyncExternalStore, type CSSProperties } from "react";

import { PlusIcon } from "@/components/icons";

import {
	ADMIN_CHANNELS,
	SHIPPING_FACTS,
	SHIPPING_RULE,
	mediaLibrary,
	mediaUsageLabel,
	unpublishedChannelCount,
	unpublishedChannelLabel,
	type AdminChannel,
} from "../domain/settings";
import type { AdminProduct } from "../domain/product";
import { getProductsSnapshot, subscribeProducts } from "../storage/product-store";
import { AlertIcon, ChevronDownIcon } from "./icons";
import { AdminScreen, ScreenFoot } from "./screen";

import styles from "./settings.module.css";

function delay(index: number) {
	return { "--i": index } as CSSProperties;
}

export function SettingsScreen({
	initialProducts,
}: {
	initialProducts: readonly AdminProduct[];
}) {
	const products = useSyncExternalStore(
		subscribeProducts,
		getProductsSnapshot,
		() => initialProducts,
	);
	const library = mediaLibrary(products);

	return (
		<AdminScreen>
			<div className={`${styles.head} ${styles.enter}`}>
				<div>
					<h1 className={styles.title}>Ajustes</h1>
					<p className={styles.deck}>
						Los canales de la tienda, la regla de envío y las fotos que usa el
						catálogo.
					</p>
				</div>
			</div>

			<div className={`${styles.top} ${styles.enter}`} style={delay(1)}>
				<section aria-labelledby="canales" className={styles.section}>
					<div className={styles.sectionHead}>
						<h2 className={styles.sectionTitle} id="canales">
							Canales
						</h2>
						<span className={styles.secCount}>
							{unpublishedChannelLabel(unpublishedChannelCount(ADMIN_CHANNELS))}
						</span>
					</div>

					<ul className={styles.channels}>
						{ADMIN_CHANNELS.map((channel) => (
							<ChannelItem channel={channel} key={channel.id} />
						))}
					</ul>

					<p className={styles.sectionNote}>
						<AlertIcon className={styles.noteIcon} />
						No inventamos un número ni una casilla: no se publican hasta que los
						confirmes.
					</p>
				</section>

				<section aria-labelledby="envio" className={styles.section}>
					<div className={styles.sectionHead}>
						<h2 className={styles.sectionTitle} id="envio">
							Envío
						</h2>
					</div>
					<p className={styles.sectionDeck}>
						La regla es una sola y el pedido no suma envío.
					</p>

					<div className={styles.ship}>
						<p className={styles.shipRule}>{SHIPPING_RULE}</p>
						<p className={styles.shipNote}>
							La tienda no calcula un costo de envío. El pedido se cierra y el envío
							se acuerda después, por el canal que confirmes.
						</p>
						<dl className={styles.shipFacts}>
							{SHIPPING_FACTS.map((fact) => (
								<div key={fact.term}>
									<dt>{fact.term}</dt>
									<dd>{fact.detail}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>
			</div>

			<section
				aria-labelledby="biblioteca"
				className={`${styles.section} ${styles.mediaSection} ${styles.enter}`}
				style={delay(2)}
			>
				<div className={styles.sectionHead}>
					<h2 className={styles.sectionTitle} id="biblioteca">
						Biblioteca de imágenes
					</h2>
					<span className={styles.secCount}>{library.summary}</span>
				</div>
				<p className={styles.sectionDeck}>
					Las fotos del catálogo y en cuántos productos se usa cada una.
				</p>

				<ul className={styles.media}>
					{library.images.map((image) => (
						<li className={styles.tile} key={image.src}>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								alt=""
								className={styles.tileFrame}
								height={640}
								src={image.src}
								width={640}
							/>
							<span className={styles.tileName}>{image.name}</span>
							<span className={styles.tileMeta}>
								{mediaUsageLabel(image.products, "portada")}
							</span>
						</li>
					))}

					<li className={`${styles.tile} ${styles.tileReserve}`}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							alt=""
							className={styles.tileFrame}
							height={640}
							src={library.reserve.src}
							width={640}
						/>
						<span className={styles.tileName}>Imagen no disponible</span>
						<span className={styles.tileMeta}>
							{mediaUsageLabel(library.reserve.products, "reserva")}
						</span>
					</li>

					<li>
						<button className={`${styles.tile} ${styles.tileUpload}`} disabled type="button">
							<span className={styles.uploadFrame}>
								<PlusIcon className={styles.uploadIcon} />
								<span className={styles.uploadLabel}>Subir</span>
							</span>
							<span className={styles.tileName}>Subir una foto</span>
							<span className={styles.tileMeta}>No disponible en esta demo</span>
						</button>
					</li>
				</ul>
			</section>

			<ScreenFoot
				notice="Los datos de este panel son de ejemplo: los canales y el envío son las reglas de la tienda y esta demo no tiene integraciones ni tarifas. Las fotos son las del catálogo de ejemplo y los precios no son precios de venta."
				routes="/admin/ajustes"
			/>
		</AdminScreen>
	);
}

function ChannelItem({ channel }: { channel: AdminChannel }) {
	return (
		<li className={styles.channel}>
			<div className={styles.channelHead}>
				<h3 className={styles.channelName}>{channel.name}</h3>
				{channel.published ? (
					<span className={styles.chipPublished}>{channel.value}</span>
				) : (
					<span className={styles.chipPending}>
						<AlertIcon className={styles.chipIcon} />
						Sin publicar
					</span>
				)}
			</div>

			<p className={styles.channelCopy}>{channel.copy}</p>

			{channel.published ? null : (
				<details className={styles.how}>
					<summary className={styles.howSummary}>
						Ver cómo se activa
						<ChevronDownIcon className={styles.howIcon} />
					</summary>
					<p className={styles.howBody}>{channel.activation}</p>
				</details>
			)}
		</li>
	);
}
