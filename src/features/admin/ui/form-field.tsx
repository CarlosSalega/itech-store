"use client";

import type { ReactNode } from "react";

import { AlertIcon } from "./icons";

import styles from "./product-form.module.css";

export type FormFieldAria = {
	describedBy: string;
	invalid: true | undefined;
};

type FormFieldProps = {
	children: (aria: FormFieldAria) => ReactNode;
	help?: string;
	htmlFor: string;
	label: ReactNode;
	message: string | undefined;
};

export function FormField({
	children,
	help,
	htmlFor,
	label,
	message,
}: FormFieldProps) {
	const helpId = help === undefined ? null : `${htmlFor}-help`;
	const slotId = `${htmlFor}-message`;
	const describedBy = helpId === null ? slotId : `${helpId} ${slotId}`;

	return (
		<div className={styles.field}>
			<label htmlFor={htmlFor}>{label}</label>
			{children({
				describedBy,
				invalid: message === undefined ? undefined : true,
			})}
			{helpId === null || help === undefined ? null : (
				<p className={styles.help} id={helpId}>
					{help}
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
