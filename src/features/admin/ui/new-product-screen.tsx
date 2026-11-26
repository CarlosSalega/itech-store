"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type FormEvent } from "react";

import { ChevronLeftIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { FAMILY_LABEL, NAV_FAMILIES } from "@/features/catalog/domain/catalog";

import {
	productSlug,
	variantSku,
	type AdminProduct,
	type AdminProductImage,
} from "../domain/product";
import {
	EMPTY_VARIANT_DRAFT,
	blankDraft,
	draftToProduct,
	saveNote,
	validateProductDraft,
	type ProductDraft,
	type VariantDraft,
	type VariantDraftErrors,
} from "../domain/product-form";
import { appendGalleryImage } from "../domain/product-gallery";
import type { AdminProductInput } from "../server/product-actions";
import { FormField } from "./form-field";
import { AlertIcon, ChevronDownIcon } from "./icons";
import { ProductGallery } from "./product-gallery";
import { AdminScreen, ScreenFoot } from "./screen";
import {
	IDLE_FEEDBACK,
	PENDING_FEEDBACK,
	feedbackOf,
	runAction,
	type ActionFeedback,
	type ProductCreateAction,
} from "./screen-actions";
import { Toggle } from "./toggle";

import styles from "./product-form.module.css";

type VariantField = keyof VariantDraftErrors;

function variantKey(index: number, field: VariantField): string {
	return `variant-${index}-${field}`;
}

function productInput(product: AdminProduct): AdminProductInput {
	return {
		name: product.name,
		description: product.description,
		category: product.category,
		gallery: product.gallery,
		published: product.published,
		destacado: product.destacado,
		variants: product.variants.map((variant) => ({
			label: variant.label,
			priceCents: variant.priceCents,
			stock: variant.stock,
		})),
	};
}

export function NewProductScreen({
	products,
	create,
	initialFeedback = IDLE_FEEDBACK,
}: {
	products: readonly AdminProduct[];
	create: ProductCreateAction;
	initialFeedback?: ActionFeedback;
}) {
	const router = useRouter();
	const [draft, setDraft] = useState<ProductDraft>(blankDraft);
	const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
	const [feedback, setFeedback] = useState<ActionFeedback>(initialFeedback);

	const errors = validateProductDraft(
		draft,
		products.map((product) => product.slug),
	);
	const note = saveNote(errors, draft);
	const message = feedback.message ?? note;
	const blocked = note !== null || feedback.pending;
	const slug = productSlug(draft.name);
	const loaded = draft.variants.length === 1 ? "1 cargada" : `${draft.variants.length} cargadas`;
	const nameError = touched.has("name") ? errors.name : undefined;
	const categoryError = touched.has("category") ? errors.category : undefined;

	const touch = (key: string) => {
		setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
	};

	const change = (patch: Partial<ProductDraft>) => {
		setDraft((current) => ({ ...current, ...patch }));
	};

	const changeVariant = (index: number, patch: Partial<VariantDraft>) => {
		setDraft((current) => ({
			...current,
			variants: current.variants.map((variant, position) =>
				position === index ? { ...variant, ...patch } : variant,
			),
		}));
	};

	const addVariant = () => {
		setDraft((current) => ({
			...current,
			variants: [...current.variants, EMPTY_VARIANT_DRAFT],
		}));
	};

	const removeVariant = (index: number) => {
		setDraft((current) => ({
			...current,
			variants: current.variants.filter((_, position) => position !== index),
		}));
	};

	const changeGallery = (gallery: readonly AdminProductImage[]) => {
		setDraft((current) => ({ ...current, gallery }));
	};

	const addPhoto = (photo: { readonly alt: string; readonly url: string }) => {
		setDraft((current) => ({
			...current,
			gallery: appendGalleryImage(current.gallery, photo),
		}));
	};

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (blocked) {
			return;
		}

		const product = draftToProduct(draft, new Date().toISOString());

		setFeedback(PENDING_FEEDBACK);

		void (async () => {
			const result = await runAction(() => create(productInput(product)));

			if (result.ok) {
				router.push(`/admin/productos/${result.slug}`);
				return;
			}

			setFeedback(feedbackOf(result));
		})();
	};

	const rowError = (index: number, field: VariantField): string | undefined => {
		const row = errors.variantRows?.[index] ?? null;

		if (row === null || !touched.has(variantKey(index, field))) {
			return undefined;
		}

		return row[field];
	};

	return (
		<AdminScreen>
			<div className={`${styles.head} ${styles.enter}`}>
				<Link className={styles.back} href="/admin/productos">
					<ChevronLeftIcon className={styles.backIcon} />
					Productos
				</Link>
				<h1 className={styles.title}>Nuevo producto</h1>
				<p className={styles.deck}>
					Los datos que el catálogo necesita: nombre, familia, variantes y precios.
				</p>
			</div>

			<form className={styles.form} noValidate onSubmit={submit}>
				<div className={`${styles.grid} ${styles.enter}`} style={{ "--i": 1 } as CSSProperties}>
					<div className={styles.colMain}>
						<section aria-labelledby="datos" className={styles.section}>
							<div className={styles.sectionHead}>
								<h2 className={styles.sectionTitle} id="datos">
									Datos del producto
								</h2>
							</div>

							<div className={styles.fields}>
								<FormField
									help="El nombre que se ve en el catálogo. No se traduce."
									htmlFor="nombre"
									label="Nombre"
									message={nameError}
								>
									{(aria) => (
										<input
											aria-describedby={aria.describedBy}
											aria-invalid={aria.invalid}
											className={styles.input}
											id="nombre"
											onBlur={() => touch("name")}
											onChange={(event) => change({ name: event.target.value })}
											type="text"
											value={draft.name}
										/>
									)}
								</FormField>

								<FormField
									help="Se arma con el nombre: cambia solo mientras lo escribís."
									htmlFor="slug"
									label="Slug"
									message={errors.slug}
								>
									{(aria) => (
										<input
											aria-describedby={aria.describedBy}
											aria-invalid={aria.invalid}
											className={`${styles.input} ${styles.inputMono}`}
											id="slug"
											readOnly
											value={slug}
										/>
									)}
								</FormField>

								<FormField
									htmlFor="familia"
									label="Familia"
									message={categoryError}
								>
									{(aria) => (
										<span className={styles.selectWrap}>
											<select
												aria-describedby={aria.describedBy}
												aria-invalid={aria.invalid}
												className={styles.input}
												id="familia"
												onBlur={() => touch("category")}
												onChange={(event) =>
													change({
														category: event.target.value as AdminProduct["category"],
													})
												}
												value={draft.category}
											>
												<option value="">Elegí una familia</option>
												{NAV_FAMILIES.map((family) => (
													<option key={family} value={family}>
														{FAMILY_LABEL[family]}
													</option>
												))}
											</select>
											<ChevronDownIcon className={styles.selectChevron} />
										</span>
									)}
								</FormField>

								<div className={styles.field}>
									<label htmlFor="descripcion">
										Descripción<span className={styles.optional}>opcional</span>
									</label>
									<textarea
										className={styles.input}
										id="descripcion"
										onChange={(event) => change({ description: event.target.value })}
										value={draft.description}
									/>
								</div>
							</div>
						</section>

						<section aria-labelledby="variantes" className={styles.section}>
							<div className={styles.sectionHead}>
								<h2 className={styles.sectionTitle} id="variantes">
									Variantes
								</h2>
								<span className={styles.secCount}>{loaded}</span>
							</div>
							<p className={styles.secDeck}>
								Cada capacidad es una variante con su precio y su stock. El SKU se
								arma con el slug y la capacidad.
							</p>

							<div className={styles.repeater}>
								{draft.variants.map((variant, index) => {
									const label = variant.label.trim();
									const priceError = rowError(index, "price");
									const stockError = rowError(index, "stock");
									const labelError = rowError(index, "label");
									const variantMessage =
										labelError ?? priceError ?? stockError ?? undefined;

									return (
										<div className={styles.variant} key={index}>
											<div className={styles.variantFields}>
												<FormField
													htmlFor={`cap-${index}`}
													label="Capacidad"
													message={labelError}
													slot={{ id: `var-${index}-message`, own: false }}
												>
													{(aria) => (
														<input
															aria-describedby={aria.describedBy}
															aria-invalid={aria.invalid}
															className={styles.input}
															id={`cap-${index}`}
															onBlur={() => touch(variantKey(index, "label"))}
															onChange={(event) => changeVariant(index, { label: event.target.value })}
															type="text"
															value={variant.label}
														/>
													)}
												</FormField>

												<FormField
													help="En pesos, sin centavos."
													htmlFor={`precio-${index}`}
													label="Precio en pesos"
													message={priceError}
													slot={{ id: `var-${index}-message`, own: false }}
												>
													{(aria) => (
														<span className={styles.money}>
															<span className={styles.moneyCurrency}>$</span>
															<input
																aria-describedby={aria.describedBy}
																aria-invalid={aria.invalid}
																className={styles.input}
																id={`precio-${index}`}
																inputMode="numeric"
																onBlur={() => touch(variantKey(index, "price"))}
																onChange={(event) =>
																	changeVariant(index, { price: event.target.value })
																}
																type="text"
																value={variant.price}
															/>
														</span>
													)}
												</FormField>

												<FormField
													htmlFor={`stock-${index}`}
													label="Stock"
													message={stockError}
													slot={{ id: `var-${index}-message`, own: false }}
												>
													{(aria) => (
														<input
															aria-describedby={aria.describedBy}
															aria-invalid={aria.invalid}
															className={styles.input}
															id={`stock-${index}`}
															inputMode="numeric"
															onBlur={() => touch(variantKey(index, "stock"))}
															onChange={(event) =>
																changeVariant(index, { stock: event.target.value })
															}
															type="text"
															value={variant.stock}
														/>
													)}
												</FormField>

												<span
													aria-live="polite"
													className={styles.variantSlot}
													id={`var-${index}-message`}
												>
													{variantMessage === undefined ? null : (
														<>
															<AlertIcon className={styles.errorIcon} />
															{variantMessage}
														</>
													)}
												</span>

												<button
													className={styles.remove}
													onClick={() => removeVariant(index)}
													type="button"
												>
													<TrashIcon className={styles.removeIcon} />
													<span className="sr-only">
														{label === ""
															? `Quitar la variante ${index + 1}`
															: `Quitar la variante de ${label}`}
													</span>
												</button>
											</div>
											<p className={styles.variantSku}>
												<b>SKU</b> {variantSku(slug, variant.label)}
											</p>
										</div>
									);
								})}
							</div>

							<button className={styles.addVariant} onClick={addVariant} type="button">
								<PlusIcon className={styles.addIcon} />
								Agregar variante
							</button>

							{errors.variants === undefined ? null : (
								<p className={styles.error} role="alert">
									<AlertIcon className={styles.errorIcon} />
									{errors.variants}
								</p>
							)}
						</section>

						<ProductGallery
							error={errors.gallery}
							images={draft.gallery}
							name={draft.name}
							onAdd={addPhoto}
							onChange={changeGallery}
							productId={null}
							scope={slug}
						/>
					</div>

					<aside className={styles.colSide}>
						<section aria-labelledby="publicacion" className={styles.section}>
							<div className={styles.sectionHead}>
								<h2 className={styles.sectionTitle} id="publicacion">
									Publicación
								</h2>
							</div>

							<Toggle
								checked={draft.published}
								id="publicado"
								label="Publicado"
								note="Se ve en la tienda apenas se guarda."
								onChange={(published) => change({ published })}
							/>
							<Toggle
								checked={draft.destacado}
								id="destacado"
								label="Destacado"
								note="Se muestra con la estrella del catálogo."
								onChange={(destacado) => change({ destacado })}
							/>
						</section>
					</aside>
				</div>

				<div className={styles.actionBar}>
					<p className={styles.actionNote} id="save-note">
						{feedback.pending ? (
							"Guardando el producto…"
						) : message === null ? (
							"Todo listo para guardar el producto."
						) : (
							<>
								<AlertIcon className={styles.actionNoteIcon} />
								{message}
							</>
						)}
					</p>
					<div className={styles.actionActions}>
						<Link className={styles.quiet} href="/admin/productos">
							Cancelar
						</Link>
						<button
							aria-describedby="save-note"
							className={styles.primary}
							disabled={blocked}
							type="submit"
						>
							{feedback.pending ? "Guardando…" : "Guardar producto"}
						</button>
					</div>
				</div>
			</form>

			<ScreenFoot
				notice="El producto se guarda en la base de datos. Las fotos que subís se guardan en la nube y el catálogo conserva las suyas. Los precios son los precios de venta."
				routes="/admin/productos/nuevo"
			/>
		</AdminScreen>
	);
}
