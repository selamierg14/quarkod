// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

/**
 * Native uygulama kendi yapılandırmasını kullanıyor.
 *
 * Kök dizindeki Next.js yapılandırması buraya uymuyordu: React
 * Compiler'ın değişmezlik kuralı Reanimated'ın `shared.value = ...`
 * yazımını hata sayıyor, jsx-a11y ise React Native'in <Image>
 * bileşeninde `alt` arıyor. Kök yapılandırma da `mobil/**` klasörünü
 * bu yüzden yok sayıyor.
 */
module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*"],
  },
]);
