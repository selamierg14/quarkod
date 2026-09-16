import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * `app.json`'un üstüne binen dinamik yapılandırma.
 *
 * NEDEN VAR: evrensel bağlantılar (universal links / App Links) bir ALAN
 * ADI bilmek zorunda ve o alan adı yapılandırmaya gömülü olamaz —
 * geliştirme, hazırlık ve yayın ortamları farklı adlarda çalışıyor.
 * `app.json` düz JSON olduğu için değişken okuyamıyor; bu dosya okuyor.
 *
 * `app.json` SİLİNMEDİ: statik alanların tamamı orada duruyor ve buradaki
 * fonksiyon onu `config` olarak alıp yalnızca dinamik kısmı ekliyor.
 * Böylece iki dosya birbirinin kopyası olmuyor.
 *
 * Alan adı verilmezse bağlantı yapılandırması HİÇ EKLENMİYOR. Yanlış bir
 * alan adıyla derlemek, iOS'un doğrulama isteğini var olmayan bir sunucuya
 * göndermesi ve bağlantıların sessizce çalışmaması demek; hiç eklememek
 * en azından "kurulmamış" olduğunu açıkça bırakıyor.
 */

/** Sitenin alan adı — "biyerlere.com" gibi, şema ve eğik çizgi olmadan. */
const ALAN_ADI = process.env.EXPO_PUBLIC_SITE_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

export default ({ config }: ConfigContext): ExpoConfig => {
  const temel = config as ExpoConfig;
  if (!ALAN_ADI) return temel;

  return {
    ...temel,
    ios: {
      ...temel.ios,
      /**
       * `applinks:` iOS'a "bu alan adının bağlantılarını ben açabilirim"
       * dedirtiyor. Karşılığında Apple, o adresteki
       * /.well-known/apple-app-site-association dosyasını okuyup
       * uygulamanın gerçekten o siteye ait olduğunu doğruluyor —
       * dosya yoksa bağlantılar tarayıcıda açılmaya devam ediyor.
       */
      associatedDomains: [`applinks:${ALAN_ADI}`],
    },
    android: {
      ...temel.android,
      intentFilters: [
        {
          action: "VIEW",
          // `autoVerify`, Android'in /.well-known/assetlinks.json dosyasını
          // okuyup bağlantıyı doğrudan uygulamaya yönlendirmesini sağlıyor.
          // Olmadan kullanıcıya her seferinde "hangi uygulamayla açayım"
          // diye soruluyor.
          autoVerify: true,
          data: [{ scheme: "https", host: ALAN_ADI, pathPrefix: "/mekan" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
  };
};
