"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	useState,
	useSyncExternalStore,
	type CSSProperties,
	type FormEvent,
} from "react";

import { ChevronLeftIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { FAMILY_LABEL, NAV_FAMILIES } from "@/features/catalog/domain/catalog";

import { productSlug, variantSku, type AdminProduct } from "../domain/product";
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
import {
	commitProducts,
	getProductsServerSnapshot,
	getProductsSnapshot,
	subscribeProducts,
} from "../storage/product-store";
import { AlertIcon, ChevronDownIcon } from "./icons";
import { AdminScreen, ScreenFoot } from "./screen";
import { Toggle } from "./toggle";

import styles from "./product-form.module.css";

type VariantField = keyof VariantDraftErrors;

function variantKey(index: number, field: VariantField): string {
	return `variant-${index}-${field}`;
}

export function NewProductScreen() {
	const router = useRouter();
	const products = useSyncExternalStore(
		subscribeProducts,
		getProductsSnapshot,
		getProductsServerSnapshot,
	);
	const [draft, setDraft] = useState<ProductDraft>(blankDraft);
	const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

	const errors = validateProductDraft(
		draft,
		products.map((product) => product.slug),
	);
	const note = saveNote(errors, draft);
	const slug = productSlug(draft.name);
	const loaded = draft.variants.length === 1 ? "1 cargada" : `${draft.variants.length} cargadas`;

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

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (note !== null) {
			return;
		}

		const product = draftToProduct(draft, new Date().toISOString());

		commitProducts([...products, product]);
		router.push(`/admin/productos/${product.slug}`);
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
								<div className={styles.field}>
									<label htmlFor="nombre">Nombre</label>
									<input
										aria-describedby={
											errors.name !== undefined && touched.has("name")
												? "nombre-error"
												: "nombre-help"
										}
										aria-invalid={
											errors.name !== undefined && touched.has("name")
												? true
												: undefined
										}
										className={styles.input}
										id="nombre"
										onBlur={() => touch("name")}
										onChange={(event) => change({ name: event.target.value })}
										type="text"
										value={draft.name}
									/>
									{errors.name !== undefined && touched.has("name") ? (
										<p className={styles.error} id="nombre-error" role="alert">
											<AlertIcon className={styles.errorIcon} />
											{errors.name}
										</p>
									) : (
										<p className={styles.help} id="nombre-help">
											El nombre que se ve en el catálogo. No se traduce.
										</p>
									)}
								</div>

								<div className={styles.field}>
									<label htmlFor="slug">Slug</label>
									<input
										aria-describedby={errors.slug === undefined ? "slug-help" : "slug-error"}
										aria-invalid={errors.slug === undefined ? undefined : true}
										className={`${styles.input} ${styles.inputMono}`}
										id="slug"
										readOnly
										value={slug}
									/>
									{errors.slug === undefined ? (
										<p className={styles.help} id="slug-help">
											Se arma con el nombre: cambia solo mientras lo escribís.
										</p>
									) : (
										<p className={styles.error} id="slug-error" role="alert">
											<AlertIcon className={styles.errorIcon} />
											{errors.slug}
										</p>
									)}
								</div>

								<div className={styles.field}>
									<label htmlFor="familia">Familia</label>
									<span className={styles.selectWrap}>
										<select
											aria-describedby={
												errors.category !== undefined && touched.has("category")
													? "familia-error"
													: undefined
											}
											aria-invalid={
												errors.category !== undefined && touched.has("category")
													? true
													: undefined
											}
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
									{errors.category !== undefined && touched.has("category") ? (
										<p className={styles.error} id="familia-error" role="alert">
											<AlertIcon className={styles.errorIcon} />
											{errors.category}
										</p>
									) : null}
								</div>

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

									return (
										<div className={styles.variant} key={index}>
											<div className={styles.variantFields}>
												<div className={styles.field}>
													<label htmlFor={`cap-${index}`}>Capacidad</label>
													<input
														aria-describedby={
															labelError === undefined ? undefined : `cap-error-${index}`
														}
														aria-invalid={labelError === undefined ? undefined : true}
														className={styles.input}
														id={`cap-${index}`}
														onBlur={() => touch(variantKey(index, "label"))}
														onChange={(event) => changeVariant(index, { label: event.target.value })}
														type="text"
														value={variant.label}
													/>
													{labelError === undefined ? null : (
														<p className={styles.error} id={`cap-error-${index}`} role="alert">
															<AlertIcon className={styles.errorIcon} />
															{labelError}
														</p>
													)}
												</div>

												<div className={styles.field}>
													<label htmlFor={`precio-${index}`}>Precio en pesos</label>
													<span className={styles.money}>
														<span className={styles.moneyCurrency}>$</span>
														<input
															aria-describedby={
																priceError === undefined
																	? `precio-help-${index}`
																	: `precio-error-${index}`
															}
															aria-invalid={priceError === undefined ? undefined : true}
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
													{priceError === undefined ? (
														<p className={styles.help} id={`precio-help-${index}`}>
															En pesos, sin centavos.
														</p>
													) : (
														<p className={styles.error} id={`precio-error-${index}`} role="alert">
															<AlertIcon className={styles.errorIcon} />
															{priceError}
														</p>
													)}
												</div>

												<div className={styles.field}>
													<label htmlFor={`stock-${index}`}>Stock</label>
													<input
														aria-describedby={
															stockError === undefined ? undefined : `stock-error-${index}`
														}
														aria-invalid={stockError === undefined ? undefined : true}
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
													{stockError === undefined ? null : (
														<p className={styles.error} id={`stock-error-${index}`} role="alert">
															<AlertIcon className={styles.errorIcon} />
															{stockError}
														</p>
													)}
												</div>

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

							<p className={styles.sideNote}>
								Las fotos se eligen en la ficha del producto: acá se carga el dato y
								el catálogo usa la imagen de muestra hasta que haya una propia.
							</p>
						</section>
					</aside>
				</div>

				<div className={styles.actionBar}>
					<p className={styles.actionNote} id="save-note">
						{note === null ? (
							"Todo listo para guardar el producto."
						) : (
							<>
								<AlertIcon className={styles.actionNoteIcon} />
								{note}
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
							disabled={note !== null}
							type="submit"
						>
							Guardar producto
						</button>
					</div>
				</div>
			</form>

			<ScreenFoot
				notice="Los datos de este panel son de ejemplo: el producto se guarda en este navegador, no en la base, y las fotos son las del catálogo de la demo. Los precios son de muestra y no son precios de venta."
				routes="/admin/productos/nuevo"
			/>
		</AdminScreen>
	);
}
