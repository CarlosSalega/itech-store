import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";

import styles from "./placeholder.module.css";

export function AdminPlaceholder({
	title,
	deck,
	next,
}: {
	title: string;
	deck: string;
	next: string;
}) {
	return (
		<div className={styles.page}>
			<h1 className={styles.title}>{title}</h1>
			<p className={styles.deck}>{deck}</p>
			<p className={styles.next}>{next}</p>
			<Link className={styles.back} href="/admin">
				Volver al panel
				<ChevronRightIcon />
			</Link>
		</div>
	);
}
