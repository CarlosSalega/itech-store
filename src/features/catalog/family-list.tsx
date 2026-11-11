import Link from "next/link";

import type { Category } from "@/generated/prisma/enums";

import { FAMILY_LABEL } from "./catalog";
import { ChevronRightIcon } from "./icons";
import styles from "./family-list.module.css";

export type FamilyEntry = {
	category: Category;
	count: number;
};

/**
 * The families as hanging rows. An empty family keeps its row, drops to
 * "0 productos" and loses its link: it is never hidden and never faked.
 */
export function FamilyList({ families }: { families: readonly FamilyEntry[] }) {
	return (
		<div className={styles.hanging}>
			{families.map((family) =>
				family.count === 0 ? (
					<span className={`${styles.hang} ${styles.empty}`} key={family.category}>
						<span className={styles.name}>{FAMILY_LABEL[family.category]}</span>
						<span className={styles.count}>0 productos</span>
					</span>
				) : (
					<Link className={styles.hang} href="/catalogo" key={family.category}>
						<span className={styles.name}>{FAMILY_LABEL[family.category]}</span>
						<span className={styles.count}>
							{family.count} {family.count === 1 ? "producto" : "productos"}
							<ChevronRightIcon className={styles.chevron} />
						</span>
					</Link>
				),
			)}
		</div>
	);
}
