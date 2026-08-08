import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Üretilen Prisma istemcisi ve derleme çıktıları taranmasın.
    include: ["src/**/*.test.ts"],
    exclude: ["src/generated/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
});
