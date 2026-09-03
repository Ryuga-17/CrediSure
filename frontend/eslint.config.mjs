import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next@16 ships flat configs natively (no more legacy
// .eslintrc-style "next/core-web-vitals" strings resolved through
// FlatCompat -- that combination throws "Converting circular structure to
// JSON" against this version).
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
