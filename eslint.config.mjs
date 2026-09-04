import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma tarafından üretilen istemci — elle düzenlenmez.
    "src/generated/**",
    // Native uygulama kendi ESLint yapılandırmasıyla (eslint-config-expo)
    // denetleniyor. Next.js'in web kuralları React Native koduna
    // uymuyor: Reanimated'ın `shared.value = ...` yazımını "değiştirilemez"
    // sayıp hata veriyor, RN'in <Image> bileşeninde `alt` arıyor.
    "mobil/**",
  ]),
]);

export default eslintConfig;
