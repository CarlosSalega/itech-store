import { CheckIcon } from "@/components/icons";

import styles from "./stepper.module.css";

export const CHECKOUT_STEPS = ["datos", "pago", "confirmacion"] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

const STEP_LABEL: Record<CheckoutStep, string> = {
	datos: "Datos",
	pago: "Pago",
	confirmacion: "Confirmación",
};

type CheckoutStepperProps = {
	current: CheckoutStep;
	onNavigate?: (step: CheckoutStep) => void;
};

export function CheckoutStepper({ current, onNavigate }: CheckoutStepperProps) {
	const currentIndex = CHECKOUT_STEPS.indexOf(current);
	const progress = Math.round(((currentIndex + 1) * 1000) / CHECKOUT_STEPS.length) / 10;

	return (
		<div className={styles.head}>
			<ol aria-label="Pasos de la compra" className={styles.stepper}>
				{CHECKOUT_STEPS.map((step, index) => {
					const done = index < currentIndex;
					const isCurrent = index === currentIndex;
					const classes = [styles.step, done ? styles.done : null, isCurrent ? styles.current : null]
						.filter((value) => value !== null)
						.join(" ");

					return (
						<li
							aria-current={isCurrent ? "step" : undefined}
							className={classes}
							key={step}
						>
							{done && onNavigate !== undefined ? (
								<button
									className={`${styles.stepBody} ${styles.stepAction}`}
									onClick={() => onNavigate(step)}
									type="button"
								>
									<Mark done={done} index={index} />
									<span className={styles.name}>{STEP_LABEL[step]}</span>
									<span className="sr-only">(completado)</span>
								</button>
							) : (
								<span className={styles.stepBody}>
									<Mark done={done} index={index} />
									<span className={styles.name}>{STEP_LABEL[step]}</span>
									{done ? <span className="sr-only">(completado)</span> : null}
								</span>
							)}
							{isCurrent ? (
								<span className={styles.count}>
									paso {index + 1} de {CHECKOUT_STEPS.length}
								</span>
							) : null}
						</li>
					);
				})}
			</ol>
			<div aria-hidden="true" className={styles.progress}>
				<span className={styles.progressFill} style={{ width: `${progress}%` }} />
			</div>
		</div>
	);
}

function Mark({ done, index }: { done: boolean; index: number }) {
	return (
		<span aria-hidden="true" className={styles.mark}>
			{done ? <CheckIcon className={styles.check} /> : index + 1}
		</span>
	);
}
