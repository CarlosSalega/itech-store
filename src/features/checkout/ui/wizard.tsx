"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { BagIcon, CheckIcon, ChevronLeftIcon } from "@/components/icons";
import { EMPTY_CART } from "@/features/cart/domain/cart";
import { commitCart } from "@/features/cart/storage/store";
import { useCart } from "@/features/cart/ui/provider";

import {
	BUYER_FIELDS,
	EMPTY_BUYER,
	validateBuyer,
	type BuyerErrors,
	type BuyerField as BuyerFieldName,
	type OrderBuyer,
	type OrderPayment,
} from "../domain/order";
import { placeOrderAction } from "../server/actions";
import type { PlaceOrderRefused } from "../server/place-order";
import { BuyerField } from "./buyer-field";
import { ClockIcon, TruckIcon } from "./icons";
import { OrderSummary } from "./order-summary";
import { CheckoutScreen } from "./screen";
import { type CheckoutStep } from "./stepper";
import { useHydrated } from "./use-hydrated";

import screenStyles from "./screen.module.css";
import styles from "./wizard.module.css";

const BUYER_GROUPS: readonly {
	title: string;
	rows: readonly (readonly BuyerFieldName[])[];
}[] = [
	{ title: "Tus datos", rows: [["name"], ["email", "phone"]] },
	{ title: "Dónde lo llevamos", rows: [["address"], ["city", "postalCode"]] },
];

const PAYMENT_OPTIONS: readonly {
	value: OrderPayment;
	label: string;
	note: string;
}[] = [
	{
		value: "transfer",
		label: "Transferencia bancaria",
		note: "Te pasamos los datos cuando confirmes el pedido.",
	},
	{
		value: "cash",
		label: "Efectivo al recibir",
		note: "Coordinamos el día y la dirección con vos.",
	},
];

export function CheckoutWizard() {
	return (
		<div className={styles.page}>
			<header className={styles.intro}>
				<h1 className={styles.title}>Tres pasos y el pedido queda hecho</h1>
				<p className={styles.deck}>
					Una decisión por pantalla: quién lo recibe, cómo lo pagás y el
					comprobante. Podés volver atrás sin perder lo que escribiste.
				</p>
			</header>

			<WizardBody />
		</div>
	);
}

function WizardBody() {
	const hydrated = useHydrated();

	if (!hydrated) {
		return (
			<div aria-busy="true" className={styles.pending}>
				<span className="sr-only">Cargando tu carrito…</span>
			</div>
		);
	}

	return <CheckoutFlow />;
}

function CheckoutFlow() {
	const router = useRouter();
	const { cart, totals, openCart } = useCart();
	const [step, setStep] = useState<CheckoutStep>("datos");
	const [buyer, setBuyer] = useState<OrderBuyer>(EMPTY_BUYER);
	const [payment, setPayment] = useState<OrderPayment>("transfer");
	const [attempted, setAttempted] = useState(false);
	const [placing, setPlacing] = useState(false);
	const [failure, setFailure] = useState<PlaceOrderRefused | null>(null);
	const headingRef = useRef<HTMLHeadingElement | null>(null);
	const fieldRefs = useRef<Partial<Record<BuyerFieldName, HTMLInputElement | null>>>({});
	const wantsHeadingFocus = useRef(false);

	const errors: BuyerErrors = attempted ? validateBuyer(buyer) : {};
	const lines = cart.lines;
	const shownTotals = totals;

	useEffect(() => {
		if (!wantsHeadingFocus.current) {
			return;
		}

		wantsHeadingFocus.current = false;
		headingRef.current?.focus();
	}, [step]);

	if (lines.length === 0) {
		return <EmptyCheckout />;
	}

	function goTo(next: CheckoutStep) {
		wantsHeadingFocus.current = true;
		setStep(next);
	}

	function updateBuyer(field: BuyerFieldName, value: string) {
		setBuyer((current) => ({ ...current, [field]: value }));
	}

	function submitBuyer(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setAttempted(true);

		const found = validateBuyer(buyer);
		const firstError = BUYER_FIELDS.find((field) => found[field] !== undefined);

		if (firstError !== undefined) {
			fieldRefs.current[firstError]?.focus();

			return;
		}

		goTo("pago");
	}

	async function submitPayment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFailure(null);
		setPlacing(true);

		const result = await placeOrderAction({ lines: cart.lines, buyer, payment });

		setPlacing(false);

		if (!result.ok) {
			setFailure(result);

			if (result.code === "DATOS_INVALIDOS") {
				setAttempted(true);
				goTo("datos");
			}

			return;
		}

		commitCart(EMPTY_CART);
		router.push(`/pedido/${result.number}`);
	}

	const summary = <OrderSummary lines={lines} onEdit={openCart} totals={shownTotals} />;

	if (step === "datos") {
		return (
			<CheckoutScreen aside={summary} current="datos">
				<h2 className={styles.heading} ref={headingRef} tabIndex={-1}>
					¿Quién recibe el pedido?
				</h2>

				<form noValidate onSubmit={submitBuyer}>
					{BUYER_GROUPS.map((group) => (
						<div className={styles.group} key={group.title}>
							<h3 className={styles.groupTitle}>{group.title}</h3>
							<div className={styles.fields}>
								{group.rows.map((row) => (
									<div
										className={row.length === 1 ? undefined : styles.row}
										key={row.join("-")}
									>
										{row.map((field) => (
											<BuyerField
												field={field}
												inputRef={(node) => {
													fieldRefs.current[field] = node;
												}}
												key={field}
												message={errors[field]}
												onChange={(event) =>
													updateBuyer(field, event.target.value)
												}
												value={buyer[field]}
											/>
										))}
									</div>
								))}
							</div>
						</div>
					))}

					<p className={styles.shipNote}>
						<TruckIcon className={styles.shipIcon} />
						El envío se coordina al finalizar.
					</p>

					<CheckoutFailure failure={failure} />

					<div className={screenStyles.actions}>
						<button className={screenStyles.primary} type="submit">
							Continuar al pago
						</button>
						<Link className={screenStyles.back} href="/catalogo">
							<ChevronLeftIcon className={screenStyles.backIcon} />
							Seguir comprando
						</Link>
					</div>
				</form>
			</CheckoutScreen>
		);
	}

	return (
		<CheckoutScreen aside={summary} current="pago" onNavigate={goTo}>
			<h2 className={styles.heading} ref={headingRef} tabIndex={-1}>
				¿Cómo querés pagar?
			</h2>

			<form onSubmit={submitPayment}>
				<div className={styles.simulation}>
					<p className={styles.simulationTitle}>
						<ClockIcon className={styles.simulationIcon} />
						Esto es una simulación
					</p>
					<p className={styles.simulationCopy}>
						No cobramos nada y no guardamos datos de tarjetas. Este paso no tiene
						campos de tarjeta a propósito: si algo te pide un número de tarjeta, no
						es esta demo.
					</p>
				</div>

				<fieldset className={styles.pay}>
					<legend className={styles.legend}>Medio de pago</legend>
					{PAYMENT_OPTIONS.map((option) => (
						<label className={styles.option} key={option.value}>
							<input
								checked={payment === option.value}
								className={styles.radio}
								name="medio-de-pago"
								onChange={() => setPayment(option.value)}
								type="radio"
								value={option.value}
							/>
							<span aria-hidden="true" className={styles.dot} />
							<span>
								<span className={styles.payName}>{option.label}</span>
								<span className={styles.note}>{option.note}</span>
								{payment === option.value ? (
									<span className={styles.state}>
										<CheckIcon className={styles.stateIcon} />
										Elegido
									</span>
								) : null}
							</span>
						</label>
					))}
				</fieldset>

				<CheckoutFailure failure={failure} />

				<div className={screenStyles.actions}>
					<button className={screenStyles.primary} disabled={placing} type="submit">
						{placing ? "Confirmando el pedido…" : "Confirmar el pedido"}
					</button>
					<button
						className={screenStyles.back}
						onClick={() => goTo("datos")}
						type="button"
					>
						<ChevronLeftIcon className={screenStyles.backIcon} />
						Volver a los datos
					</button>
				</div>
			</form>
		</CheckoutScreen>
	);
}

function CheckoutFailure({ failure }: { failure: PlaceOrderRefused | null }) {
	return (
		<p className={styles.failure} role="alert">
			{failure === null ? "" : failure.message}
		</p>
	);
}

function EmptyCheckout() {
	return (
		<div className={styles.empty}>
			<div aria-hidden="true" className={styles.emptyMark}>
				<BagIcon className={styles.emptyIcon} />
			</div>
			<h2 className={styles.emptyTitle}>Tu carrito está vacío</h2>
			<p className={styles.emptyCopy}>
				Sin productos no hay nada para finalizar. Agregá uno del catálogo y volvé: el
				pedido se arma en tres pasos.
			</p>
			<Link className={styles.emptyLink} href="/catalogo">
				Ver el catálogo
			</Link>
		</div>
	);
}
