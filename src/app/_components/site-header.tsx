import Link from "next/link";

import {
	FAMILY_LABEL,
	NAV_FAMILIES,
	catalogHref,
} from "@/features/catalog/catalog";
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
 * Each family links into the catalog with its filter applied, so the header
 * reaches a real page from anywhere instead of an in-page anchor.
 */
export function SiteHeader() {
	return (
		<header className={styles.header}>
			<div className={styles.bar}>
				<Link className={styles.brand} href="/">
					{/* A plain <img> on purpose: this is an 809-byte SVG mark, which next/image
					    does not optimise. It is committed (unlike public/products), so nothing
					    here couples the build to gitignored files. */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						className={styles.logo}
						src="/logo.svg"
						alt=""
						width={20}
						height={20}
					/>
					iTech Store
				</Link>

				<nav className={styles.nav} aria-label="Principal">
					{NAV_FAMILIES.map((category) => (
						<Link
							className={styles.navLink}
							href={catalogHref({ family: category })}
							key={category}
						>
							{FAMILY_LABEL[category]}
						</Link>
					))}
					<Link className={styles.navLink} href="/contacto">
						Contacto
					</Link>
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
						<summary className={styles.summary} aria-label="Menú">
							<span className={styles.menuLabel}>Menú</span>
							<MenuIcon className={`${styles.icon} ${styles.iconMenu}`} />
							<CloseIcon className={`${styles.icon} ${styles.iconClose}`} />
						</summary>
						<nav className={styles.menuNav} aria-label="Principal en móvil">
							{NAV_FAMILIES.map((category) => (
								<Link
									className={styles.menuLink}
									href={catalogHref({ family: category })}
									key={category}
								>
									{FAMILY_LABEL[category]}
								</Link>
							))}
							<Link className={styles.menuLink} href={catalogHref({})}>
								Catálogo
							</Link>
							<Link className={styles.menuLink} href="/contacto">
								Contacto
							</Link>
						</nav>
					</details>
				</div>
			</div>
		</header>
	);
}
