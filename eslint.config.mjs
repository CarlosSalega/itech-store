import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent tooling and generated design assets are not application source.
    ".agents/**",
    ".atl/**",
    // Prisma Client is generated output.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
