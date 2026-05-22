import nextVitals from "eslint-config-next/core-web-vitals"

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    rules: {
      "no-useless-assignment": "off",
      "no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]

export default eslintConfig
