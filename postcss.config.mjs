// Tailwind 4's documented Next.js integration. The previous setup used
// @tailwindcss/turbopack as a loader with a turbopack `rules` key, which had two
// failure modes: a broad `*.css` key silently disabled CSS-module class mapping,
// and a narrow key stopped the Tailwind transform from running at all, leaving
// `@theme` as an unknown at-rule. PostCSS processes every stylesheet and leaves
// CSS Modules to Next, so both problems disappear.
const config = {
	plugins: {
		"@tailwindcss/postcss": {},
	},
};

export default config;
