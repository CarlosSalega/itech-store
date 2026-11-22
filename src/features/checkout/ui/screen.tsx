import type { ReactNode } from "react";

import { CheckoutStepper, type CheckoutStep } from "./stepper";

import styles from "./screen.module.css";

type CheckoutScreenProps = {
	current: CheckoutStep;
	onNavigate?: (step: CheckoutStep) => void;
	aside: ReactNode;
	children: ReactNode;
};

export function CheckoutScreen({ current, onNavigate, aside, children }: CheckoutScreenProps) {
	return (
		<section className={styles.screen}>
			<CheckoutStepper current={current} onNavigate={onNavigate} />
			<div className={styles.body}>
				<div className={styles.decision}>{children}</div>
				{aside}
			</div>
		</section>
	);
}
