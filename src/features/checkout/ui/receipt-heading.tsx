"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./receipt.module.css";

export function ReceiptHeading({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLHeadingElement | null>(null);

	useEffect(() => {
		ref.current?.focus();
	}, []);

	return (
		<h1 className={styles.heading} ref={ref} tabIndex={-1}>
			{children}
		</h1>
	);
}
