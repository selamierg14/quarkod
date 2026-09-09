import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Bazı testler kendine izole bir Postgres şeması kurup "prisma db push"
    // çalıştırıyor; uzak veritabanında bu iş varsayılan 10 saniyeyi rahat
    // aşıyor ve test kodu değil kurulum zaman aşımına uğruyordu.
    hookTimeout: 90_000,
    // Aynı testler onlarca sorgu turu atıyor; 5 saniye uzak
    // veritabanında yetmiyordu.
    testTimeout: 30_000,
    /**
     * Eşzamanlı test dosyası sayısı SINIRLI.
     *
     * Dört test dosyası kendi izole Postgres şemasını kurup (`prisma db
     * push`) kendi PrismaClient'ını açıyor. Vitest varsayılan olarak
     * çekirdek sayısı kadar dosyayı paralel çalıştırdığı için dosya sayısı
     * arttıkça uzak veritabanına (Neon) aynı anda açılan bağlantı da
     * artıyor ve bir eşikten sonra dosyalar TOPLUCA düşüyordu — testlerin
     * kendisi değil, kurulumları başarısız oluyordu (assertion hatası yok,
     * "suite failed" var).
     *
     * Dört worker, saf testlerin hızını gözle görülür biçimde
     * etkilemeden bağlantı sayısını güvenli aralıkta tutuyor.
     */
    maxWorkers: 4,

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
