import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRightIcon, SearchIcon } from "@/components/icons";
import { adminInitials } from "../domain/session";
import { LogoutIcon, ChevronDownIcon } from "./icons";

import styles from "./admin-shell.module.css";

type AdminIdentity = {
	name: string;
	email: string;
};

export function AdminShell({
	admin,
	nav,
	signOut,
	children,
}: {
	admin: AdminIdentity;
	nav: ReactNode;
	signOut: () => Promise<void>;
	children: ReactNode;
}) {
	return (
		<>
			<a className="skip" href="#admin-main">
				Saltar al contenido
			</a>

			<header className={styles.side}>
				<div className={styles.bar}>
					<div className={styles.brandRow}>
						<Link className={styles.brand} href="/admin">
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

						<details className={styles.workspace}>
							<summary className={styles.wsToggle}>
								<ChevronDownIcon className={styles.wsChevron} />
								<span className="sr-only">Cambiar de espacio de trabajo</span>
							</summary>
							<div className={styles.wsPanel}>
								<p className={styles.wsLabel}>Espacio de trabajo</p>
								<p className={styles.wsName}>iTech Store</p>
								<p className={styles.wsNote}>
									Esta demo tiene un solo espacio de trabajo.
								</p>
							</div>
						</details>
					</div>

					<p className={styles.brandMeta}>Panel de administración</p>

					<button
						aria-keyshortcuts="Meta+K Control+K"
						className={styles.search}
						type="button"
					>
						<SearchIcon className={styles.searchIcon} />
						<span className={styles.searchLabel}>Buscar en el panel</span>
						<kbd className={styles.kbd}>⌘K</kbd>
					</button>
				</div>

				<div className={styles.strip}>
					{nav}

					<div className={styles.foot}>
						<nav aria-label="Sesión" className={styles.session}>
							<Link className={styles.item} href="/catalogo">
								<ChevronRightIcon className={styles.icon} />
								Ver la tienda
							</Link>
							<form action={signOut}>
								<button
									className={`${styles.item} ${styles.signOut}`}
									type="submit"
								>
									<LogoutIcon className={styles.icon} />
									Cerrar sesión
								</button>
							</form>
						</nav>

						<div className={styles.user}>
							<span aria-hidden="true" className={styles.avatar}>
								{adminInitials(admin.name, admin.email)}
							</span>
							<span className={styles.userText}>
								<span className={styles.userName}>{admin.name}</span>
								<span className={styles.userMail}>{admin.email}</span>
							</span>
						</div>
					</div>
				</div>
			</header>

			<main className={styles.main} id="admin-main">
				{children}
			</main>
		</>
	);
}
