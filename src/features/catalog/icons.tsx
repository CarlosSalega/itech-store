/**
 * The icon set for this store, drawn here: twenty-four unit grid, 1.6 stroke,
 * round caps and joins, `currentColor`, `fill="none"`.
 *
 * Size comes from CSS only (the class the caller passes), never from a `width`
 * or `height` inside the SVG. Every glyph is decorative: the accessible name
 * belongs to the button or link that contains it.
 */
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

export function SearchIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<circle cx="10.5" cy="10.5" r="6.5" />
			<path d="M15.4 15.4 21 21" />
		</svg>
	);
}

export function BagIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M5.6 8.2h12.8a1.6 1.6 0 0 1 1.6 1.6v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.8v-9a1.6 1.6 0 0 1 1.6-1.6Z" />
			<path d="M8.4 8.2V6.6a3.6 3.6 0 0 1 7.2 0v1.6" />
		</svg>
	);
}

export function MenuIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M4 8.5h16" />
			<path d="M4 15.5h16" />
		</svg>
	);
}

export function CloseIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M6.5 6.5 17.5 17.5" />
			<path d="M17.5 6.5 6.5 17.5" />
		</svg>
	);
}

export function ChevronRightIcon({ className }: IconProps) {
	return (
		<svg {...iconProps} className={className}>
			<path d="M9.5 5.5 16 12l-6.5 6.5" />
		</svg>
	);
}
