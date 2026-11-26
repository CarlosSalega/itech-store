import Link from "next/link";

import { LoginForm } from "./login-form";
import { safeNextPath } from "./next-path";

import styles from "./login.module.css";

export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
	const params = await searchParams;
	const requested = params.next;
	const next = safeNextPath(typeof requested === "string" ? requested : null);

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

				<LoginForm next={next} />
			</div>
		</main>
	);
}
