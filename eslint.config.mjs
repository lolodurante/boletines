import nextVitals from "eslint-config-next/core-web-vitals"

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**", "tsconfig.tsbuildinfo", "playwright-report/**", "test-results/**"],
  },
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
]

export default config
