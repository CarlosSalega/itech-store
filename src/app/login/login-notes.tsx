import { NO_OTHER_ACCOUNTS, NO_PASSWORD_RESET } from "./copy";

import styles from "./login.module.css";

export function LoginNotes() {
	return (
		<div className={styles.notes}>
			<p className={styles.note}>{NO_OTHER_ACCOUNTS}</p>
			<p className={styles.note}>{NO_PASSWORD_RESET}</p>
		</div>
	);
}
