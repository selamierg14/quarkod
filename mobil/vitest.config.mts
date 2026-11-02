import { defineConfig } from "vitest/config";

/**
 * Mobil tarafın SAF mantık testleri.
 *
 * React Native bileşenlerini burada render etmiyoruz — bunun için jest +
 * react-native preset gerekir ve bu boyuttaki bir uygulamada kurulum
 * maliyeti kazancından fazla. Test edilen şey, ekrandan bağımsız
 * çalışabilen kurallar: karekod adresinin çözülmesi, mesafe/fiyat
 * biçimlendirme gibi. Bunlar sahada hata ayıklaması en zor yerler
 * (kamera akışında log kalmıyor), bu yüzden testi en çok hak edenler.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**"],
  },
});
