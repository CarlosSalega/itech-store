import { WHATSAPP_NUMBER, whatsappHref } from "./contact-channels";

import styles from "./whatsapp-button.module.css";

/**
 * The floating WhatsApp action shown on the public pages: the mark alone, no
 * container. A WhatsApp button whose destination is not WhatsApp is worse than no
 * button, so while the store's number is unconfirmed this links to the contact
 * page, whose whole job is to say that the channel is pending. Filling
 * `WHATSAPP_NUMBER` upgrades it to a real chat with no change here.
 */
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
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className={styles.icon} src="/whatsapp.svg" alt="" width={48} height={48} />
		</a>
	);
}
