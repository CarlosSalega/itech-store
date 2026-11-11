import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	cacheComponents: true,
	partialPrefetching: true,
	// Scoped to the Tailwind entry point on purpose. The previous `"*.css"` key
	// made Turbopack route every stylesheet through this loader, which silently
	// disabled CSS-module class mapping: every `styles.foo` resolved to undefined
	// and the app shipped unstyled markup. Component styles only need Turbopack's
	// own CSS Modules support, so only the Tailwind entry is intercepted.
	turbopack: {
		rules: {
			"src/app/globals.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
};

export default nextConfig;
