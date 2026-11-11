import Link from "next/link";

import { FAMILY_LABEL, NAV_FAMILIES } from "@/features/catalog/catalog";
import {
	BagIcon,
	CloseIcon,
	MenuIcon,
	SearchIcon,
} from "@/features/catalog/icons";

import styles from "./site-header.module.css";

/**
 * Sticky header. Below 900px the links live in a `<details>` menu that swaps its
 * own icon in CSS, so the disclosure needs no JavaScript.
 *
 * The family entries are in-page anchors today: the family filter of `/catalogo`
 * arrives with that route.
 */
export function SiteHeader() {
	return (
		<header className={styles.header}>
			<div className={`wrap ${styles.bar}`}>
				<Link className={styles.brand} href="/">
					iTech Store
				</Link>

				<nav className={styles.nav} aria-label="Principal">
					{NAV_FAMILIES.map((category) => (
						<a className={styles.navLink} href="#familias" key={category}>
							{FAMILY_LABEL[category]}
						</a>
					))}
				</nav>

				<div className={styles.tools}>
					{/* Find-an-item leads to the catalog listing: there is no search box yet. */}
					<Link className={styles.iconButton} href="/catalogo">
						<SearchIcon className={styles.icon} />
						<span className="sr-only">Buscar un producto</span>
					</Link>

					{/* No cart exists in this milestone, so the bag is present but inert. */}
					<button
						className={styles.iconButton}
						type="button"
						disabled
						aria-disabled="true"
					>
						<BagIcon className={styles.icon} />
						<span className="sr-only">
							Carrito: disponible en la próxima etapa
						</span>
					</button>

					<details className={styles.menu}>
						<summary className={styles.summary}>
							<span>Menú</span>
							<MenuIcon className={`${styles.icon} ${styles.iconMenu}`} />
							<CloseIcon className={`${styles.icon} ${styles.iconClose}`} />
						</summary>
						<nav className={styles.menuNav} aria-label="Principal en móvil">
							{NAV_FAMILIES.map((category) => (
								<a className={styles.menuLink} href="#familias" key={category}>
									{FAMILY_LABEL[category]}
								</a>
							))}
							<Link className={styles.menuLink} href="/catalogo">
								Catálogo
							</Link>
						</nav>
					</details>
				</div>
			</div>
		</header>
	);
}
