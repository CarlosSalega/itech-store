"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	useRef,
	useState,
	type CSSProperties,
} from "react";

import {
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CloseIcon,
	TrashIcon,
} from "@/components/icons";
import { FAMILY_LABEL } from "@/features/catalog/domain/catalog";
import { formatArsPrice } from "@/features/catalog/domain/format-price";

import {
	LOW_STOCK_THRESHOLD,
	lowestStockVariant,
	parsePricePesos,
	pesosInputValue,
	productDateLabel,
	productPriceFrom,
	productStockTotal,
	setPublished,
	updateProduct,
	type AdminProduct,
	type AdminProductImage,
} from "../domain/product";
import { appendGalleryImage, blankAltIndex } from "../domain/product-gallery";
import { AlertIcon } from "./icons";
import { Money } from "./money";
import { ProductGallery } from "./product-gallery";
import { AdminScreen, ScreenFoot } from "./screen";
import {
	IDLE_FEEDBACK,
	PENDING_FEEDBACK,
	feedbackOf,
	runAction,
	type ActionFeedback,
	type ProductDetailActions,
} from "./screen-actions";
import { Toggle } from "./toggle";

import styles from "./product-detail.module.css";

type Editing = {
	sku: string;
	price: string;
	stock: string;
};

function variantCount(count: number): string {
	return count === 1 ? "1 variante" : `${count} variantes`;
}

export function ProductDetailScreen({
	initialProduct,
	productId,
	actions,
	initialFeedback = IDLE_FEEDBACK,
}: {
	initialProduct: AdminProduct | null;
	productId: string | null;
	actions: ProductDetailActions;
	initialFeedback?: ActionFeedback;
}) {
	if (initialProduct === null) {
		return <MissingProduct />;
	}

	return (
		<ProductDetail
			key={`${initialProduct.slug}-${initialProduct.createdAt}`}
			actions={actions}
			initialFeedback={initialFeedback}
			initialProduct={initialProduct}
			productId={productId}
		/>
	);
}

function MissingProduct() {
	return (
		<AdminScreen>
			<div className={styles.head}>
				<Link className={styles.back} href="/admin/productos">
					<ChevronLeftIcon className={styles.backIcon} />
					Productos
				</Link>
				<h1 className={styles.title}>No encontramos ese producto</h1>
				<p className={styles.deck}>
					El producto que buscás no está en el catálogo. Puede que se haya eliminado.
				</p>
			</div>
		</AdminScreen>
	);
}

function ProductDetail({
	actions,
	initialFeedback,
	initialProduct,
	productId,
}: {
	actions: ProductDetailActions;
	initialFeedback: ActionFeedback;
	initialProduct: AdminProduct;
	productId: string | null;
}) {
	const router = useRouter();
	const dialog = useRef<HTMLDialogElement | null>(null);
	const [current, setCurrent] = useState(initialProduct);
	const [editing, setEditing] = useState<Editing | null>(null);
	const [feedback, setFeedback] = useState<ActionFeedback>(initialFeedback);

	const product = current;
	const price = productPriceFrom(current);
	const units = productStockTotal(current);
	const scarcest = lowestStockVariant(current);
	const photos = current.gallery;
	const editingProduct = current;
	const galleryIndex = blankAltIndex(photos);
	const galleryError =
		galleryIndex === null
			? undefined
			: `Para guardar falta el texto alternativo de la foto ${galleryIndex + 1}.`;
	const blocked = feedback.pending;

	const editPrice = editing === null ? null : parsePricePesos(editing.price);
	const editStock =
		editing === null || !/^\d+$/.test(editing.stock.trim())
			? null
			: Number(editing.stock.trim());
	const editError =
		editing === null
			? null
			: editPrice === null
				? "Poné el precio en pesos."
				: editStock === null
					? "Poné el stock en unidades enteras."
					: null;

	const startEditing = (sku: string, priceCents: number, stock: number) => {
		setEditing({
			sku,
			price: pesosInputValue(priceCents),
			stock: String(stock),
		});
	};

	const saveEditing = () => {
		if (editing === null || editPrice === null || editStock === null || blocked) {
			return;
		}

		const variants = editingProduct.variants.map((variant) =>
			variant.sku === editing.sku
				? { ...variant, priceCents: editPrice, stock: editStock }
				: variant,
		);

		setFeedback(PENDING_FEEDBACK);

		void (async () => {
			const result = await runAction(() =>
				actions.update(current.slug, { variants }),
			);

			if (!result.ok) {
				setFeedback(feedbackOf(result));
				return;
			}

			setCurrent((value) => updateProduct([value], value.slug, { variants })[0] as AdminProduct);
			setFeedback(IDLE_FEEDBACK);
			setEditing(null);
		})();
	};

	const changePublication = (published: boolean) => {
		if (blocked) {
			return;
		}

		setFeedback(PENDING_FEEDBACK);

		void (async () => {
			const result = await runAction(() =>
				published
					? actions.publish(current.slug)
					: actions.unpublish(current.slug),
			);

			if (!result.ok) {
				setFeedback(feedbackOf(result));
				return;
			}

			setCurrent((value) => setPublished([value], value.slug, published)[0] as AdminProduct);
			setFeedback(IDLE_FEEDBACK);
		})();
	};

	const changeFeatured = (destacado: boolean) => {
		if (blocked) {
			return;
		}

		setFeedback(PENDING_FEEDBACK);

		void (async () => {
			const result = await runAction(() =>
				actions.update(current.slug, { destacado }),
			);

			if (!result.ok) {
				setFeedback(feedbackOf(result));
				return;
			}

			setCurrent((value) => updateProduct([value], value.slug, { destacado })[0] as AdminProduct);
			setFeedback(IDLE_FEEDBACK);
		})();
	};

	const changeGallery = (gallery: readonly AdminProductImage[]) => {
		setCurrent((value) => ({ ...value, gallery }));
	};

	const addPhoto = (photo: { readonly alt: string; readonly url: string }) => {
		setCurrent((value) => ({
			...value,
			gallery: appendGalleryImage(value.gallery, photo),
		}));
	};

	const saveGallery = () => {
		if (galleryError !== undefined || blocked) {
			return;
		}

		setFeedback(PENDING_FEEDBACK);

		void (async () => {
			const result = await runAction(() =>
				actions.update(current.slug, { gallery: current.gallery }),
			);

			setFeedback(feedbackOf(result));
		})();
	};

	const remove = () => {
		if (blocked) {
			return;
		}

		setFeedback(PENDING_FEEDBACK);

		void (async () => {
			const result = await runAction(() => actions.remove(current.slug));

			if (!result.ok) {
				setFeedback(feedbackOf(result));
				dialog.current?.close();
				return;
			}

			router.push("/admin/productos");
		})();
	};

	return (
		<AdminScreen>
			<div className={`${styles.head} ${styles.enter}`}>
				<Link className={styles.back} href="/admin/productos">
					<ChevronLeftIcon className={styles.backIcon} />
					Productos
				</Link>

				<div className={styles.headRow}>
					<div>
						<h1 className={styles.title}>{product.name}</h1>
						<p className={styles.meta}>
							<span>{FAMILY_LABEL[product.category]}</span>
							<span aria-hidden="true" className={styles.dot}>
								·
							</span>
							{product.published ? (
								<span className={styles.chip}>
									<CheckIcon className={styles.chipIcon} />
									Publicado
								</span>
							) : (
								<span className={styles.chipOff}>Sin publicar</span>
							)}
							<span aria-hidden="true" className={styles.dot}>
								·
							</span>
							<span>{variantCount(product.variants.length)}</span>
							<span aria-hidden="true" className={styles.dot}>
								·
							</span>
							<span>{units} unidades en total</span>
						</p>
					</div>

					<div className={styles.headActions}>
						<Toggle
							checked={product.published}
							id="publicado"
							label="Publicado"
							note={
								product.published
									? "Se ve en la tienda."
									: "No se ve en la tienda."
							}
							onChange={changePublication}
						/>
						<Link className={styles.shopLink} href={`/catalogo/${product.slug}`}>
							Ver en la tienda
							<ChevronRightIcon className={styles.shopIcon} />
						</Link>
					</div>
				</div>
				<p aria-live="polite" className={styles.error} id="accion-message">
					{feedback.message === null ? (
						feedback.pending ? "Guardando los cambios…" : null
					) : (
						<>
							<AlertIcon className={styles.errorIcon} />
							{feedback.message}
						</>
					)}
				</p>
			</div>

			<div className={`${styles.grid} ${styles.enter}`} style={{ "--i": 1 } as CSSProperties}>
				<div className={styles.colMain}>
					<section aria-labelledby="variantes">
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle} id="variantes">
								Variantes
							</h2>
							<span className={styles.secCount}>
								{variantCount(product.variants.length)} · {units} unidades
							</span>
						</div>
						<p className={styles.secDeck}>
							Cada capacidad tiene su precio y su stock. El catálogo muestra el más
							bajo como «desde».
						</p>

						<table className={styles.variants} role="table">
							<caption className="sr-only">
								{`Variantes de ${product.name}, con precio en pesos, stock y SKU.`}
							</caption>
							<thead role="rowgroup">
								<tr role="row">
									<th role="columnheader" scope="col">
										Capacidad
									</th>
									<th className={styles.num} role="columnheader" scope="col">
										Precio
									</th>
									<th className={styles.num} role="columnheader" scope="col">
										Stock
									</th>
									<th role="columnheader" scope="col">
										SKU
									</th>
									<th role="columnheader" scope="col">
										<span className="sr-only">Acciones</span>
									</th>
								</tr>
							</thead>
							<tbody role="rowgroup">
								{product.variants.map((variant) => {
									const isEditing = editing !== null && editing.sku === variant.sku;
									const lowStock = variant.stock <= LOW_STOCK_THRESHOLD;
									const name = variant.label ?? "sin capacidad";

									if (isEditing) {
										return (
											<tr className={styles.editingRow} key={variant.sku} role="row">
												<td role="cell">
													<span aria-hidden="true" className={styles.cellLabel}>
														Capacidad
													</span>
													<span className={styles.variantName}>{name}</span>
												</td>
												<td className={styles.num} role="cell">
													<span aria-hidden="true" className={styles.cellLabel}>
														Precio
													</span>
													<span className={styles.cellMoney}>
														<span className={styles.currency}>$</span>
														<label className="sr-only" htmlFor={`precio-${variant.sku}`}>
															{`Precio en pesos de la variante de ${name}`}
														</label>
														<input
															aria-describedby={editError === null ? "edicion-nota" : "edicion-error"}
															aria-invalid={editError === null ? undefined : true}
															className={`${styles.cellInput} ${styles.cellInputMoney}`}
															id={`precio-${variant.sku}`}
															inputMode="numeric"
															onChange={(event) =>
																setEditing({
																	sku: variant.sku,
																	price: event.target.value,
																	stock: editing?.stock ?? String(variant.stock),
																})
															}
															type="text"
															value={editing?.price ?? ""}
														/>
													</span>
												</td>
												<td className={styles.num} role="cell">
													<span aria-hidden="true" className={styles.cellLabel}>
														Stock
													</span>
													<label className="sr-only" htmlFor={`stock-${variant.sku}`}>
														{`Stock de la variante de ${name}`}
													</label>
													<input
														aria-invalid={editError === null ? undefined : true}
														className={`${styles.cellInput} ${styles.cellInputNum}`}
														id={`stock-${variant.sku}`}
														inputMode="numeric"
														onChange={(event) =>
															setEditing({
																sku: variant.sku,
																price: editing?.price ?? "",
																stock: event.target.value,
															})
														}
														type="text"
														value={editing?.stock ?? ""}
													/>
												</td>
												<td role="cell">
													<span aria-hidden="true" className={styles.cellLabel}>
														SKU
													</span>
													<span className={styles.sku}>{variant.sku}</span>
												</td>
												<td role="cell">
													<span className={styles.rowActions}>
														<button
															className={styles.iconButton}
															disabled={editError !== null || blocked}
															onClick={saveEditing}
															type="button"
														>
															<CheckIcon className={styles.iconGlyph} />
															<span className="sr-only">
																{`Guardar los cambios de la variante de ${name}`}
															</span>
														</button>
														<button
															className={styles.iconButton}
															onClick={() => setEditing(null)}
															type="button"
														>
															<CloseIcon className={styles.iconGlyph} />
															<span className="sr-only">
																{`Cancelar la edición de la variante de ${name}`}
															</span>
														</button>
													</span>
												</td>
											</tr>
										);
									}

									return (
										<tr key={variant.sku} role="row">
											<td className={styles.variantName} role="cell">
												<span aria-hidden="true" className={styles.cellLabel}>
													Capacidad
												</span>
												{name}
											</td>
											<td className={styles.num} role="cell">
												<span aria-hidden="true" className={styles.cellLabel}>
													Precio
												</span>
												<Money cents={variant.priceCents} className={styles.amount} />
											</td>
											<td className={styles.num} role="cell">
												<span aria-hidden="true" className={styles.cellLabel}>
													Stock
												</span>
												<span
													className={lowStock ? styles.stockLow : styles.stockOk}
												>
													{variant.stock} u.
													{lowStock ? (
														<span className={styles.stockNote}>stock bajo</span>
													) : null}
												</span>
											</td>
											<td role="cell">
												<span aria-hidden="true" className={styles.cellLabel}>
													SKU
												</span>
												<span className={styles.sku}>{variant.sku}</span>
											</td>
											<td role="cell">
												<span className={styles.rowActions}>
													<button
														className={styles.rowEdit}
														disabled={editing !== null}
														onClick={() =>
															startEditing(
																variant.sku,
																variant.priceCents,
																variant.stock,
															)
														}
														type="button"
													>
														Editar<span className="sr-only"> la variante de {name}</span>
													</button>
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>

						<p className={styles.tableNote} id="edicion-nota">
							<span>
								{editing === null
									? "El precio y el stock se editan de a una variante."
									: "El precio y el stock se guardan juntos."}
							</span>
							<span>
								{price === null ? "Sin precio" : `Desde ${formatArsPrice(price)}`} ·{" "}
								{units} unidades en total
							</span>
						</p>

						{editError === null ? null : (
							<p className={styles.error} id="edicion-error" role="alert">
								<AlertIcon className={styles.errorIcon} />
								{editError}
							</p>
						)}
					</section>

					<section className={styles.section}>
						<ProductGallery
							error={galleryError}
							images={photos}
							name={product.name}
							onAdd={addPhoto}
							onChange={changeGallery}
							productId={productId}
							scope={product.slug}
						/>
						<p className={styles.galleryFoot}>
							<button
								className={styles.gallerySave}
								disabled={galleryError !== undefined || blocked}
								onClick={saveGallery}
								type="button"
							>
								Guardar fotos
							</button>
						</p>
					</section>
				</div>

				<aside className={styles.colSide}>
					<section aria-labelledby="ficha">
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle} id="ficha">
								Ficha
							</h2>
						</div>

						<dl className={styles.sheet}>
							<div className={styles.fact}>
								<dt>Slug</dt>
								<dd className={styles.mono}>{product.slug}</dd>
							</div>
							<div className={styles.fact}>
								<dt>Creado</dt>
								<dd>{productDateLabel(product.createdAt)}</dd>
							</div>
							<div className={styles.fact}>
								<dt>Stock</dt>
								<dd>
									{scarcest === null
										? "Sin variantes"
										: `${units} unidades, la más corta en ${scarcest.stock}`}
								</dd>
							</div>
							{product.description === null ? null : (
								<div className={styles.fact}>
									<dt>Descripción</dt>
									<dd>{product.description}</dd>
								</div>
							)}
						</dl>

						<h3 className={styles.sheetTitle}>Publicación</h3>
						<Toggle
							checked={product.destacado}
							id="destacado"
							label="Destacado"
							note={
								product.destacado
									? "Se muestra con la estrella del catálogo."
									: "No tiene la estrella del catálogo."
							}
							onChange={changeFeatured}
						/>
					</section>

					<section aria-labelledby="eliminar" className={styles.danger}>
						<h2 className={styles.dangerTitle} id="eliminar">
							Eliminar
						</h2>
						<p className={styles.dangerNote}>
							Sacar el producto lo quita del catálogo y de la tienda. Los pedidos que
							ya lo incluyen no cambian.
						</p>
						<button
							aria-controls="confirmar-eliminar"
							aria-haspopup="dialog"
							className={styles.deleteTrigger}
							onClick={() => dialog.current?.showModal()}
							type="button"
						>
							<TrashIcon className={styles.deleteIcon} />
							Eliminar producto
						</button>

						<dialog
							aria-describedby="del-note"
							aria-labelledby="del-title"
							className={styles.confirm}
							id="confirmar-eliminar"
							ref={dialog}
						>
							<h2 className={styles.confirmTitle} id="del-title">
								{`¿Eliminar ${product.name}?`}
							</h2>
							<p className={styles.confirmNote} id="del-note">
								Se borra del catálogo, de la tienda y de la biblioteca. No se puede
								deshacer.
							</p>
							<div className={styles.confirmActions}>
								<button className={styles.dangerButton} onClick={remove} type="button">
									<TrashIcon className={styles.dangerIcon} />
									Sí, eliminar
								</button>
								<button
									autoFocus
									className={styles.quiet}
									onClick={() => dialog.current?.close()}
									type="button"
								>
									Cancelar
								</button>
							</div>
						</dialog>
					</section>
				</aside>
			</div>

			<ScreenFoot
				notice="El producto, sus precios y sus fotos se guardan en la base de datos. Las fotos que subís se guardan en la nube y los precios son los precios de venta."
				routes={`/admin/productos/${product.slug} · /catalogo/${product.slug}`}
			/>
		</AdminScreen>
	);
}
