import { NO_OTHER_ACCOUNTS } from "./copy";

import styles from "./login.module.css";

type LoginFieldsProps = {
	action: (formData: FormData) => void | Promise<void>;
	error: string | null;
	next: string;
};

export function LoginFields({ action, error, next }: LoginFieldsProps) {
	const invalid = error === null ? undefined : true;

	return (
		<form action={action} className={styles.form}>
			<input name="next" type="hidden" value={next} />

			<label className={styles.field}>
				<span className={styles.label}>Email</span>
				<input
					aria-invalid={invalid}
					autoComplete="email"
					className={styles.input}
					name="email"
					placeholder="sofia.ramos@example.com"
					required
					type="email"
				/>
			</label>

			<label className={styles.field}>
				<span className={styles.label}>Contraseña</span>
				<input
					aria-invalid={invalid}
					autoComplete="current-password"
					className={styles.input}
					name="password"
					required
					type="password"
				/>
			</label>

			{error === null ? null : (
				<div className={styles.failure} role="alert">
					<p className={styles.error}>{error}</p>
					<p className={styles.failureNote}>{NO_OTHER_ACCOUNTS}</p>
				</div>
			)}

			<button className={styles.primary} type="submit">
				Entrar
			</button>
		</form>
	);
}
