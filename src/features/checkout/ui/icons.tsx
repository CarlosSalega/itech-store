type IconProps = {
	className?: string;
};

const iconProps = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.6,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	focusable: "false",
} as const;

export function AlertIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M12 3.5 21 20H3L12 3.5z" />
			<path d="M12 9.5v4.5" />
			<path d="M12 16.75v.5" />
		</svg>
	);
}

export function ClockIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M12 7.5V12l3 2" />
		</svg>
	);
}

export function TruckIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M3 7.5h10v9H3z" />
			<path d="M13 10.5h4l4 3v3h-8z" />
			<circle cx="7" cy="18.5" r="1.6" />
			<circle cx="17" cy="18.5" r="1.6" />
		</svg>
	);
}
