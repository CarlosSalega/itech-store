import { ChevronRightIcon } from "@/components/icons";
import {
	cartCountLabel,
	cartLineTotal,
	lineContextLabel,
	type CartLine,
	type CartTotals,
} from "@/features/cart/domain/cart";
import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";
import { formatArsPrice } from "@/features/catalog/domain/format-price";

import styles from "./order-summary.module.css";

type OrderSummaryProps = {
	lines: readonly CartLine[];
	totals: CartTotals;
	onEdit: () => void;
};

export function OrderSummary({ lines, totals, onEdit }: OrderSummaryProps) {
	return (
		<aside aria-labelledby="resumen-del-pedido" className={styles.aside}>
			<div className={styles.head}>
				<h2 className={styles.title} id="resumen-del-pedido">
					Tu pedido
				</h2>
				<span className={styles.count}>{cartCountLabel(totals)}</span>
			</div>

			<ul className={styles.lines}>
				{lines.map((line) => (
					<li className={styles.line} key={line.variantId}>
						<figure className={styles.media}>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								alt={line.imageUrl === null ? "" : line.imageAlt}
								decoding="async"
								height={640}
								src={line.imageUrl ?? PLACEHOLDER_IMAGE}
								width={640}
							/>
						</figure>
						<div>
							<span className={styles.name}>{line.productName}</span>
							<span className={styles.context}>{lineContextLabel(line)}</span>
						</div>
						<span className={styles.amount}>{formatArsPrice(cartLineTotal(line))}</span>
					</li>
				))}
			</ul>

			<dl className={styles.totals}>
				<dt>Total</dt>
				<dd>{formatArsPrice(totals.totalCents)}</dd>
			</dl>

			<button className={styles.edit} onClick={onEdit} type="button">
				Editar el carrito
				<ChevronRightIcon className={styles.editIcon} />
			</button>
		</aside>
	);
}
