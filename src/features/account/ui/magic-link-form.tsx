"use client";

import { useActionState } from "react";

import {
	requestMagicLink,
	type MagicLinkState,
} from "../server/actions";

import styles from "./magic-link.module.css";

const EMPTY: MagicLinkState = { error: null, message: null, fieldError: null };

export function MagicLinkForm() {
	const [state, action, isPending] = useActionState(requestMagicLink, EMPTY);

	return (
		<div className={styles.card}>
			<form action={action} className={styles.form}>
				<label className={styles.label} htmlFor="magic-email">
					Tu email
				</label>
				<input
					aria-invalid={state.fieldError !== null}
					autoComplete="email"
					className={styles.input}
					id="magic-email"
					inputMode="email"
					name="email"
					placeholder="vos@example.com"
					required
					type="email"
				/>
				{state.fieldError !== null ? (
					<p aria-live="polite" className={styles.fieldError} role="status">
						{state.fieldError}
					</p>
				) : null}

				<button
					aria-busy={isPending || undefined}
					className={styles.submit}
					disabled={isPending}
					type="submit"
				>
					{isPending ? "Enviando…" : "Enviarme el enlace"}
				</button>

				{state.message !== null ? (
					<p className={styles.notice} role="status">
						{state.message}
					</p>
				) : null}
				{state.error !== null ? (
					<p aria-live="polite" className={styles.sendError} role="alert">
						{state.error}
					</p>
				) : null}
			</form>
		</div>
	);
}
