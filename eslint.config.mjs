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
    ignores: [".next/", "next-env.d.ts", "**/*.cjs", "Orchid-Analysis 3/**"],
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
];

export default eslintConfig;
