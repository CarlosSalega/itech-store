import Link from "next/link";

import type { Category } from "@/generated/prisma/enums";

import { ChevronRightIcon } from "@/components/icons";

import { FAMILY_LABEL } from "../domain/catalog";
import styles from "./family-list.module.css";

export type FamilyEntry = {
	category: Category;
	count: number;
};

export function FamilyList({ families }: { families: readonly FamilyEntry[] }) {
	return (
		<div className={styles.hanging}>
			{families.map((family) =>
				family.count === 0 ? (
					<div className={styles.emptyCell} key={family.category}>
						<span className={`${styles.hang} ${styles.empty}`}>
							<span className={styles.name}>{FAMILY_LABEL[family.category]}</span>
							<span className={styles.count}>0 productos</span>
						</span>
						<span className={styles.emptyNote}>
							¿Buscás algo que no está?
							<Link className={styles.emptyLink} href="/contacto">
								Consultanos
								<ChevronRightIcon className={styles.chevron} />
							</Link>
						</span>
					</div>
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
