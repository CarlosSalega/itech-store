"use client";

import {
	startTransition,
	useState,
	type ChangeEvent,
	type FormEvent,
} from "react";

import {
	EMPTY_LOGIN,
	LOGIN_FIELDS,
	loginMessages,
	loginPayload,
	rejectedFields,
	type LoginField,
	type LoginMessages,
	type LoginPayload,
} from "./schema";

import styles from "./login.module.css";

type LoginFieldsProps = {
	action: (formData: FormData) => void | Promise<void>;
	error: string | null;
	messages?: LoginMessages;
	next: string;
};

type LoginFieldProps = {
	field: LoginField;
	invalid: boolean;
	message: string | undefined;
	onFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const NO_MESSAGES: LoginMessages = {};

const MESSAGE_ID: Record<LoginField, string> = {
	email: "login-email-message",
	password: "login-password-message",
};

const CONTROL: Record<
	LoginField,
	{ autoComplete: string; label: string; placeholder?: string; type: string }
> = {
	email: {
		autoComplete: "email",
		label: "Email",
		placeholder: "sofia.ramos@example.com",
		type: "email",
	},
	password: {
		autoComplete: "current-password",
		label: "Contraseña",
		type: "password",
	},
};

function LoginField({ field, invalid, message, onFieldChange }: LoginFieldProps) {
	const control = CONTROL[field];

	return (
		<div className={styles.field}>
			<label className={styles.control}>
				<span className={styles.label}>{control.label}</span>
				<input
					aria-describedby={MESSAGE_ID[field]}
					aria-invalid={invalid ? true : undefined}
					autoComplete={control.autoComplete}
					className={styles.input}
					name={field}
					onChange={onFieldChange}
					placeholder={control.placeholder}
					required
					type={control.type}
				/>
			</label>
			<span aria-live="polite" className={styles.slot} id={MESSAGE_ID[field]}>
				{message}
			</span>
		</div>
	);
}

export function LoginFields({
	action,
	error,
	messages = NO_MESSAGES,
	next,
}: LoginFieldsProps) {
	const [payload, setPayload] = useState<LoginPayload>(EMPTY_LOGIN);
	const [hasFailedSubmit, setHasFailedSubmit] = useState(false);

	const shown: LoginMessages = {
		...messages,
		...loginMessages(payload, hasFailedSubmit),
	};

	function focusFirstRejected(form: HTMLFormElement, fields: readonly LoginField[]) {
		for (const field of fields) {
			const input = form.elements.namedItem(field);

			if (input instanceof HTMLInputElement) {
				input.focus();

				return;
			}
		}
	}

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const form = event.currentTarget;
		const data = new FormData(form);
		const submitted = loginPayload(data);
		const rejected = rejectedFields(loginMessages(submitted, true));

		if (rejected.length > 0) {
			setPayload(submitted);
			setHasFailedSubmit(true);
			focusFirstRejected(form, rejected);

			return;
		}

		startTransition(() => action(data));
	}

	function onFieldChange(event: ChangeEvent<HTMLInputElement>) {
		if (!hasFailedSubmit) return;

		const form = event.currentTarget.form;

		if (form !== null) setPayload(loginPayload(new FormData(form)));
	}

	return (
		<form className={styles.form} noValidate onSubmit={onSubmit}>
			<input name="next" type="hidden" value={next} />

			{LOGIN_FIELDS.map((field) => (
				<LoginField
					field={field}
					invalid={error !== null || shown[field] !== undefined}
					key={field}
					message={shown[field]}
					onFieldChange={onFieldChange}
				/>
			))}

			<div className={styles.summary}>
				{error === null ? null : (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}
			</div>

			<button className={styles.primary} type="submit">
				Entrar
			</button>
		</form>
	);
}
