"use client";

import { useState } from "react";

import { TrashIcon } from "@/components/icons";
import { galleryAlt } from "@/features/catalog/seed/gallery";
import { IMAGE_UPLOAD_LIMITS, imageErrorMessage } from "@/modules/image-uploads/core";

import type { AdminProductImage } from "../domain/product";
import {
	canMoveDown,
	canMoveUp,
	editGalleryImageAlt,
	moveGalleryImageDown,
	moveGalleryImageUp,
	removeGalleryImage,
} from "../domain/product-gallery";
import { AlertIcon, ArrowDownIcon, ArrowUpIcon, ImageIcon } from "./icons";
import { ImageUploadError, uploadProductImage } from "./image-upload";

import styles from "./product-form.module.css";

export const GALLERY_FILE_ID = "fotos-archivo";
export const GALLERY_MESSAGE_ID = "fotos-message";

const MISSING_NAME_MESSAGE = "Para subir una foto, primero poné el nombre del producto.";
const ACCEPTED_TYPES = IMAGE_UPLOAD_LIMITS.allowedMimeTypes.join(",");
const LIMIT_NOTE = `JPEG, PNG, WebP o AVIF, hasta ${IMAGE_UPLOAD_LIMITS.maxBytes / (1024 * 1024)} MB.`;

function photoCount(total: number): string {
	return total === 1 ? "1 foto · la primera es la portada" : `${total} fotos · la primera es la portada`;
}

export type GalleryPhotosProps = {
	readonly images: readonly AdminProductImage[];
	readonly message: string | undefined;
	readonly onAltChange: (index: number, alt: string) => void;
	readonly onMoveDown: (index: number) => void;
	readonly onMoveUp: (index: number) => void;
	readonly onPick: (file: File | undefined) => void;
	readonly onRemove: (index: number) => void;
	readonly uploading: boolean;
};

export function GalleryPhotos({
	images,
	message,
	onAltChange,
	onMoveDown,
	onMoveUp,
	onPick,
	onRemove,
	uploading,
}: GalleryPhotosProps) {
	return (
		<section aria-labelledby="fotos" className={styles.section}>
			<div className={styles.sectionHead}>
				<h2 className={styles.sectionTitle} id="fotos">
					Fotos
				</h2>
				<span className={styles.secCount}>{photoCount(images.length)}</span>
			</div>
			<p className={styles.secDeck}>El orden de esta lista es el orden del catálogo.</p>

			{images.length === 0 ? (
				<p className={styles.photoEmpty}>
					Todavía no hay fotos: el catálogo usa la imagen de muestra hasta que subas una.
				</p>
			) : (
				<ol className={styles.gallery}>
					{images.map((image, index) => {
						const position = index + 1;

						return (
							<li className={styles.photoRow} key={image.url}>
								<span aria-hidden="true" className={styles.photoIndex}>
									{position}
								</span>

								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									alt=""
									className={styles.photoThumb}
									height={56}
									src={image.url}
									width={56}
								/>

								<div className={styles.photoFields}>
									<label className={styles.photoLabel} htmlFor={`foto-alt-${index}`}>
										Texto alternativo
									</label>
									<input
										className={styles.input}
										id={`foto-alt-${index}`}
										onChange={(event) => onAltChange(index, event.target.value)}
										type="text"
										value={image.alt}
									/>
								</div>

								<div className={styles.photoActions}>
									<button
										className={styles.move}
										disabled={!canMoveUp(index)}
										onClick={() => onMoveUp(index)}
										type="button"
									>
										<ArrowUpIcon className={styles.moveIcon} />
										Subir<span className="sr-only">{` la foto ${position}`}</span>
									</button>
									<button
										className={styles.move}
										disabled={!canMoveDown(index, images.length)}
										onClick={() => onMoveDown(index)}
										type="button"
									>
										<ArrowDownIcon className={styles.moveIcon} />
										Bajar<span className="sr-only">{` la foto ${position}`}</span>
									</button>
									<button
										className={styles.move}
										onClick={() => onRemove(index)}
										type="button"
									>
										<TrashIcon className={styles.moveIcon} />
										Quitar<span className="sr-only">{` la foto ${position}`}</span>
									</button>
								</div>
							</li>
						);
					})}
				</ol>
			)}

			<div className={styles.uploadRow}>
				<label className={styles.uploadPick} htmlFor={GALLERY_FILE_ID}>
					<ImageIcon className={styles.uploadIcon} />
					{uploading ? "Subiendo la foto…" : "Elegir una foto"}
					<input
						accept={ACCEPTED_TYPES}
						aria-describedby={GALLERY_MESSAGE_ID}
						className="sr-only"
						disabled={uploading}
						id={GALLERY_FILE_ID}
						onChange={(event) => {
							onPick(event.target.files?.[0]);
							event.target.value = "";
						}}
						type="file"
					/>
				</label>
				<p className={styles.uploadNote}>{LIMIT_NOTE}</p>
			</div>

			<span aria-live="polite" className={styles.slot} id={GALLERY_MESSAGE_ID}>
				{message === undefined ? null : (
					<>
						<AlertIcon className={styles.errorIcon} />
						{message}
					</>
				)}
			</span>
		</section>
	);
}

export type ProductGalleryProps = {
	readonly error?: string;
	readonly images: readonly AdminProductImage[];
	readonly name: string;
	readonly onAdd: (photo: { readonly alt: string; readonly url: string }) => void;
	readonly onChange: (images: readonly AdminProductImage[]) => void;
	readonly productId?: string | null;
	readonly scope: string;
};

export function ProductGallery({
	error,
	images,
	name,
	onAdd,
	onChange,
	productId = null,
	scope,
}: ProductGalleryProps) {
	const [uploading, setUploading] = useState(false);
	const [refusal, setRefusal] = useState<string | undefined>(undefined);

	const upload = async (file: File) => {
		const alt = galleryAlt(name.trim() === "" ? scope : name.trim(), images.length);

		setUploading(true);

		try {
			const uploaded = await uploadProductImage({ file, scope, productId, alt });

			onAdd({ alt, url: uploaded.url });
		} catch (failure) {
			setRefusal(
				failure instanceof ImageUploadError
					? failure.message
					: imageErrorMessage("UPLOAD_FAILED"),
			);
		} finally {
			setUploading(false);
		}
	};

	const pick = (file: File | undefined) => {
		if (file === undefined) return;

		setRefusal(undefined);

		if (scope === "") {
			setRefusal(MISSING_NAME_MESSAGE);
			return;
		}

		void upload(file);
	};

	return (
		<GalleryPhotos
			images={images}
			message={refusal ?? error}
			onAltChange={(index, alt) => onChange(editGalleryImageAlt(images, index, alt))}
			onMoveDown={(index) => onChange(moveGalleryImageDown(images, index))}
			onMoveUp={(index) => onChange(moveGalleryImageUp(images, index))}
			onPick={pick}
			onRemove={(index) => onChange(removeGalleryImage(images, index))}
			uploading={uploading}
		/>
	);
}
