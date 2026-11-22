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
	createOrder,
	nextOrderNumber,
	validateBuyer,
	type BuyerErrors,
	type BuyerField,
	type Order,
	type OrderBuyer,
	type OrderPayment,
} from "../domain/order";
import { commitOrders, getOrdersSnapshot } from "../storage/order-store";
import { AlertIcon, ClockIcon, TruckIcon } from "./icons";
import { OrderSummary } from "./order-summary";
import { CheckoutScreen } from "./screen";
import { type CheckoutStep } from "./stepper";
import { useHydrated } from "./use-hydrated";

import screenStyles from "./screen.module.css";
import styles from "./wizard.module.css";

type FieldSpec = {
	label: string;
	autoComplete: string;
	type: "text" | "email" | "tel";
	inputMode?: "tel" | "numeric";
	help?: string;
};

const FIELD_SPECS: Record<BuyerField, FieldSpec> = {
	name: { label: "Nombre y apellido", autoComplete: "name", type: "text" },
	email: {
		label: "Email",
		autoComplete: "email",
		type: "email",
		help: "Al email te escribimos para coordinar el envío y el pago.",
	},
	phone: { label: "Teléfono", autoComplete: "tel", type: "tel", inputMode: "tel" },
	address: { label: "Dirección", autoComplete: "street-address", type: "text" },
	city: { label: "Ciudad", autoComplete: "address-level2", type: "text" },
	postalCode: {
		label: "Código postal",
		autoComplete: "postal-code",
		type: "text",
		inputMode: "numeric",
	},
};

const BUYER_GROUPS: readonly {
	title: string;
	rows: readonly (readonly BuyerField[])[];
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
	const [placed, setPlaced] = useState<Order | null>(null);
	const headingRef = useRef<HTMLHeadingElement | null>(null);
	const fieldRefs = useRef<Partial<Record<BuyerField, HTMLInputElement | null>>>({});
	const wantsHeadingFocus = useRef(false);

	const errors: BuyerErrors = attempted ? validateBuyer(buyer) : {};
	const lines = placed === null ? cart.lines : placed.lines;
	const shownTotals = placed === null ? totals : placed.totals;

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

	function updateBuyer(field: BuyerField, value: string) {
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

	function submitPayment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const orders = getOrdersSnapshot();
		const order = createOrder({
			cartLines: cart.lines,
			buyer,
			payment,
			number: nextOrderNumber(
				orders.map((entry) => entry.number),
				new Date().getFullYear(),
			),
			createdAt: new Date().toISOString(),
		});

		setPlaced(order);
		commitOrders([order, ...orders]);
		commitCart(EMPTY_CART);
		router.push(`/pedido/${order.number}`);
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
										{row.map((field) => {
											const spec = FIELD_SPECS[field];
											const id = `buyer-${field}`;
											const error = errors[field];
											const helpId = spec.help === undefined ? null : `${id}-help`;
											const errorId = error === undefined ? null : `${id}-error`;
											const describedBy = [helpId, errorId]
												.filter((value) => value !== null)
												.join(" ");

											return (
												<div key={field}>
													<label className={styles.label} htmlFor={id}>
														{spec.label}
													</label>
													<input
														aria-describedby={
															describedBy === "" ? undefined : describedBy
														}
														aria-invalid={error === undefined ? undefined : true}
														autoComplete={spec.autoComplete}
														className={
															error === undefined
																? styles.input
																: `${styles.input} ${styles.invalid}`
														}
														id={id}
														inputMode={spec.inputMode}
														name={field}
														onChange={(event) =>
															updateBuyer(field, event.target.value)
														}
														ref={(node) => {
															fieldRefs.current[field] = node;
														}}
														type={spec.type}
														value={buyer[field]}
													/>
													{helpId === null ? null : (
														<p className={styles.help} id={helpId}>
															{spec.help}
														</p>
													)}
													{errorId === null || error === undefined ? null : (
														<p className={styles.error} id={errorId} role="alert">
															<AlertIcon className={styles.errorIcon} />
															{error}
														</p>
													)}
												</div>
											);
										})}
									</div>
								))}
							</div>
						</div>
					))}

					<p className={styles.shipNote}>
						<TruckIcon className={styles.shipIcon} />
						El envío se coordina al finalizar.
					</p>

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

				<div className={screenStyles.actions}>
					<button className={screenStyles.primary} type="submit">
						Confirmar el pedido
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
