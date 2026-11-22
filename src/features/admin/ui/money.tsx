import { formatArsPrice } from "@/features/catalog/domain/format-price";

import styles from "./money.module.css";

export function Money({ cents, className }: { cents: number; className?: string }) {
	const [currency, amount] = formatArsPrice(cents).split(" ");

	return (
		<span className={className}>
			<span className={styles.currency}>{currency}</span> {amount}
		</span>
	);
}
