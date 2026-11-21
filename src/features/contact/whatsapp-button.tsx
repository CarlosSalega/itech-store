import { WHATSAPP_NUMBER, whatsappHref } from "./contact-channels";

import styles from "./whatsapp-button.module.css";

export function WhatsappButton() {
	const href = WHATSAPP_NUMBER ? whatsappHref(WHATSAPP_NUMBER) : "/contacto";
	const external = WHATSAPP_NUMBER !== null;

	return (
		<a
			className={styles.button}
			href={href}
			aria-label={external ? "Escribinos por WhatsApp" : "Ver los canales de contacto"}
			{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
		>
			<span className={styles.label} aria-hidden="true">
				Escribinos
			</span>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className={styles.icon} src="/whatsapp.svg" alt="" width={56} height={56} />
		</a>
	);
}
