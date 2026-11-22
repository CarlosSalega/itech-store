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

export function PanelIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M4 4.5h6.5V11H4z" />
			<path d="M13.5 4.5H20V8.5h-6.5z" />
			<path d="M13.5 11H20v8.5h-6.5z" />
			<path d="M4 13.5h6.5V20H4z" />
		</svg>
	);
}

export function BoxIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M12 3.2 20.5 7.6v8.8L12 20.8 3.5 16.4V7.6L12 3.2z" />
			<path d="M3.5 7.6 12 12l8.5-4.4" />
			<path d="M12 12v8.8" />
		</svg>
	);
}

export function ClipboardIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8v-17z" />
			<path d="M9 8h6" />
			<path d="M9 11.5h6" />
		</svg>
	);
}

export function SlidersIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M4 8h5" />
			<path d="M13 8h7" />
			<path d="M4 16h7" />
			<path d="M15 16h5" />
			<circle cx="11" cy="8" r="2" />
			<circle cx="13" cy="16" r="2" />
		</svg>
	);
}

export function LogoutIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M15 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
			<path d="M9.5 12H19" />
			<path d="M16 8.5 19.5 12 16 15.5" />
		</svg>
	);
}

export function ChevronDownIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M8 10.5 12 14.5 16 10.5" />
		</svg>
	);
}

export function ArrowUpIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M12 19V5.5" />
			<path d="M6.5 11 12 5.5 17.5 11" />
		</svg>
	);
}

export function ArrowDownIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M12 5v13.5" />
			<path d="M17.5 13 12 18.5 6.5 13" />
		</svg>
	);
}

export function StarIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="m12 3.7 2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.72l-5.1 2.68.97-5.68L3.75 9.7l5.7-.83z" />
		</svg>
	);
}

export function AlertIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M12 3.8 21 20H3L12 3.8z" />
			<path d="M12 10v4.6" />
			<path d="M12 17.4v.4" />
		</svg>
	);
}

export function ImageIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M4 5.5h16v13H4z" />
			<circle cx="9" cy="10" r="1.6" />
			<path d="m5 16.5 4.5-4 3.5 3 2.5-2 3.5 3" />
		</svg>
	);
}

export function PencilIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M4.5 19.5h4l10-10-4-4-10 10z" />
			<path d="m14.5 5.5 4 4" />
		</svg>
	);
}
