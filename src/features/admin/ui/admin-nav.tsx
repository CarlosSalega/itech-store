import Link from "next/link";
import { Fragment, type ComponentType } from "react";

import {
	ADMIN_DESTINATIONS,
	ADMIN_PRODUCT_LINKS,
	type AdminDestination,
	type AdminDestinationId,
} from "../domain/navigation";
import { BoxIcon, ClipboardIcon, PanelIcon, SlidersIcon } from "./icons";

import styles from "./admin-nav.module.css";

const DESTINATION_ICON: Record<
	AdminDestinationId,
	ComponentType<{ className?: string }>
> = {
	panel: PanelIcon,
	productos: BoxIcon,
	pedidos: ClipboardIcon,
	ajustes: SlidersIcon,
};

type AdminNavProps = {
	current: AdminDestinationId | null;
	currentProductHref?: string | null;
	pendingOrders: number;
	productCount: number;
};

function DestinationLink({
	destination,
	current,
	pendingOrders,
}: {
	destination: AdminDestination;
	current: AdminDestinationId | null;
	pendingOrders: number;
}) {
	const Icon = DESTINATION_ICON[destination.id];

	return (
		<Link
			aria-current={current === destination.id ? "page" : undefined}
			className={styles.item}
			href={destination.href}
		>
			<Icon className={styles.icon} />
			{destination.label}
			{destination.id === "pedidos" && pendingOrders > 0 ? (
				<>
					<span aria-hidden="true" className={styles.badge}>
						{pendingOrders}
					</span>
					<span className="sr-only">
						{`, ${pendingOrders} pedidos a preparar`}
					</span>
				</>
			) : null}
		</Link>
	);
}

function ProductsSubnav({
	currentProductHref,
	productCount,
}: {
	currentProductHref?: string | null;
	productCount: number;
}) {
	return (
		<ul className={styles.subnav}>
			{ADMIN_PRODUCT_LINKS.map((link, index) => (
				<li key={link.href}>
					<Link
						aria-current={currentProductHref === link.href ? "page" : undefined}
						className={styles.subnavLink}
						href={link.href}
					>
						{link.label}
						{index === 0 ? (
							<span className={styles.subCount}>{productCount}</span>
						) : null}
					</Link>
				</li>
			))}
		</ul>
	);
}

export function AdminNav({
	current,
	currentProductHref = null,
	pendingOrders,
	productCount,
}: AdminNavProps) {
	return (
		<nav aria-label="Secciones del panel" className={styles.nav}>
			{ADMIN_DESTINATIONS.map((destination) => (
				<Fragment key={destination.id}>
					<div className={styles.row}>
						<DestinationLink
							current={current}
							destination={destination}
							pendingOrders={pendingOrders}
						/>
					</div>
					{destination.id === "productos" ? (
						<ProductsSubnav
							currentProductHref={currentProductHref}
							productCount={productCount}
						/>
					) : null}
				</Fragment>
			))}
		</nav>
	);
}
