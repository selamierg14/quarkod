import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Üretilen Prisma istemcisi ve derleme çıktıları taranmasın.
    include: ["src/**/*.test.ts"],
    exclude: ["src/generated/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      // "server-only" Next dışında yüklenince hata fırlatır; testte etkisiz
      // bir modüle yönlendiriyoruz ki sunucu tarafı yardımcılar test edilebilsin.
      "server-only": new URL("./src/test/server-only-stub.ts", import.meta.url).pathname,
    },
  },
});
