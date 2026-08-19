import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/",
      "next-env.d.ts",
      "**/*.cjs",
      "Orchid-Analysis 3/**",
      // Outillage Node livré avec le dépôt, pas du code applicatif : ces scripts
      // sont du CommonJS et n'ont pas à passer par la configuration de l'app.
      ".agents/**",
      "update_locales.js",
      // Bundle de transfert Claude Design : prototype HTML/JS conservé comme
      // référence visuelle, jamais exécuté par l'application.
      "refonte-dynamique-site-logistique/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Contenu en français : les apostrophes typographiques dans le JSX sont
      // cosmétiques et rendues correctement -> warning, ne bloque pas le build.
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    // La configuration des tests charge ses doubles par require() : c'est le
    // mécanisme attendu par vitest, pas une entorse au style des modules.
    files: ["vitest.setup.ts", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
