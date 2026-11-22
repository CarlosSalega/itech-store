import type { ReactNode } from "react";

import styles from "./screen.module.css";

export function AdminScreen({ children }: { children: ReactNode }) {
	return <div className={styles.page}>{children}</div>;
}

export function ScreenFoot({
	notice,
	routes,
}: {
	notice: string;
	routes: string;
}) {
	return (
		<footer className={styles.foot}>
			<span aria-hidden="true" className={styles.footRule} />
			<p className={styles.notice}>{notice}</p>
			<p className={styles.routes}>{routes}</p>
		</footer>
	);
}

export function ScreenPending({ label }: { label: string }) {
	return (
		<div aria-busy="true" className={styles.pending}>
			<span className="sr-only">{label}</span>
		</div>
	);
}
