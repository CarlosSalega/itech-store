"use client";

import type { ChangeEvent } from "react";

import type { BuyerField } from "../domain/order";
import { AlertIcon } from "./icons";

import styles from "./wizard.module.css";

type FieldSpec = {
	label: string;
	autoComplete: string;
	type: "text" | "email" | "tel";
	inputMode?: "tel" | "numeric";
	help?: string;
};

const FIELD_SPECS: Record<BuyerField, FieldSpec> = {
	name: { label: "Nombre y apellido", autoComplete: "name", type: "text" },
	email: {
		label: "Email",
		autoComplete: "email",
		type: "email",
		help: "Al email te escribimos para coordinar el envío y el pago.",
	},
	phone: { label: "Teléfono", autoComplete: "tel", type: "tel", inputMode: "tel" },
	address: { label: "Dirección", autoComplete: "street-address", type: "text" },
	city: { label: "Ciudad", autoComplete: "address-level2", type: "text" },
	postalCode: {
		label: "Código postal",
		autoComplete: "postal-code",
		type: "text",
		inputMode: "numeric",
	},
};

type BuyerFieldProps = {
	field: BuyerField;
	inputRef?: (node: HTMLInputElement | null) => void;
	message: string | undefined;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	value: string;
};

export function BuyerField({
	field,
	inputRef,
	message,
	onChange,
	value,
}: BuyerFieldProps) {
	const spec = FIELD_SPECS[field];
	const id = `buyer-${field}`;
	const helpId = spec.help === undefined ? null : `${id}-help`;
	const slotId = `${id}-message`;
	const describedBy = [helpId, slotId].filter((entry) => entry !== null).join(" ");

	return (
		<div>
			<label className={styles.label} htmlFor={id}>
				{spec.label}
			</label>
			<input
				aria-describedby={describedBy}
				aria-invalid={message === undefined ? undefined : true}
				autoComplete={spec.autoComplete}
				className={
					message === undefined ? styles.input : `${styles.input} ${styles.invalid}`
				}
				id={id}
				inputMode={spec.inputMode}
				name={field}
				onChange={onChange}
				ref={inputRef}
				type={spec.type}
				value={value}
			/>
			{helpId === null || spec.help === undefined ? null : (
				<p className={styles.help} id={helpId}>
					{spec.help}
				</p>
			)}
			<span aria-live="polite" className={styles.slot} id={slotId}>
				{message === undefined ? null : (
					<>
						<AlertIcon className={styles.errorIcon} />
						{message}
					</>
				)}
			</span>
		</div>
	);
}
