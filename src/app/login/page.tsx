import Link from "next/link";

import { enterAdminDemo } from "./actions";

import styles from "./login.module.css";

export default function LoginPage() {
	return (
		<main className={styles.page} id="main">
			<div className={styles.card}>
				<Link className={styles.brand} href="/catalogo">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						alt=""
						className={styles.mark}
						height={20}
						src="/logo.svg"
						width={20}
					/>
					iTech Store
				</Link>

				<h1 className={styles.title}>Entrá al panel</h1>
				<p className={styles.deck}>
					Los pedidos, los productos y el stock de la tienda, en un solo lugar.
				</p>

				<form action={enterAdminDemo} className={styles.form}>
					<label className={styles.field}>
						<span className={styles.label}>Email</span>
						<input
							autoComplete="email"
							className={styles.input}
							name="email"
							placeholder="sofia.ramos@example.com"
							type="email"
						/>
					</label>

					<label className={styles.field}>
						<span className={styles.label}>Contraseña</span>
						<input
							autoComplete="off"
							className={styles.input}
							name="password"
							placeholder="Cualquier contraseña"
							type="password"
						/>
					</label>

					<button className={styles.primary} type="submit">
						Entrar
					</button>
				</form>

				<p className={styles.note}>
					Esta demo no tiene sesión real: no se revisa ninguna contraseña y no se
					guarda lo que escribís acá.
				</p>
			</div>
		</main>
	);
}
