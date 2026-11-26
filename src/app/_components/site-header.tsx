import Link from "next/link";

import {
	FAMILY_LABEL,
	NAV_FAMILIES,
	catalogHref,
} from "@/features/catalog/domain/catalog";
import {
	CloseIcon,
	MenuIcon,
	SearchIcon,
} from "@/components/icons";
import { CartTrigger } from "@/features/cart/ui/trigger";

import styles from "./site-header.module.css";

export function SiteHeader() {
	return (
		<header className={styles.header}>
			<div className={styles.bar}>
				<Link className={styles.brand} href="/">
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

					<Link className={styles.navLink} href="/mis-pedidos">
						Mis pedidos
					</Link>
				</nav>

				<div className={styles.tools}>
					<Link className={styles.iconButton} href="/catalogo">
						<SearchIcon className={styles.icon} />
						<span className="sr-only">Buscar un producto</span>
					</Link>

					<CartTrigger className={styles.iconButton} iconClassName={styles.icon} />

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

							<Link className={styles.menuLink} href="/mis-pedidos">
								Mis pedidos
							</Link>
						</nav>
					</details>
				</div>
			</div>
		</header>
	);
}
