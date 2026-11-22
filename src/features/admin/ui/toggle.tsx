import styles from "./toggle.module.css";

export function Toggle({
	id,
	checked,
	label,
	note,
	onChange,
}: {
	id: string;
	checked: boolean;
	label: string;
	note: string;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label className={styles.switch} htmlFor={id}>
			<input
				checked={checked}
				id={id}
				onChange={(event) => onChange(event.target.checked)}
				type="checkbox"
			/>
			<span aria-hidden="true" className={styles.track}>
				<span className={styles.knob} />
			</span>
			<span className={styles.text}>
				<span className={styles.name}>{label}</span>
				<span className={styles.note}>{note}</span>
			</span>
		</label>
	);
}
