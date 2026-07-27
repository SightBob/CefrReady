import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    extends: [...nextCoreWebVitals],

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
    },

    rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        // These React Compiler advisory rules were not part of the previous
        // Next.js 14 lint gate. Keep the upgrade behavior-neutral and address
        // them incrementally instead of rewriting existing effects wholesale.
        "react-hooks/immutability": "off",
        "react-hooks/purity": "off",
        "react-hooks/set-state-in-effect": "off",
    },
}]);
