import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * iOS evrensel bağlantı doğrulaması.
 *
 * Apple, uygulama `applinks:<alan adı>` istediğinde bu adresi okuyor ve
 * "bu site gerçekten o uygulamaya ait mi" sorusunu buradan cevaplıyor.
 * Dosya olmadan paylaşılan bir mekan bağlantısı Safari'de açılıyor —
 * uygulama kurulu olsa bile.
 *
 * NEDEN `public/` ALTINDA DEĞİL de route: dosyanın adı UZANTISIZ ve
 * içerik türü `application/json` olmak zorunda. `public/` altındaki
 * uzantısız bir dosya `application/octet-stream` olarak servis ediliyor
 * ve Apple onu sessizce yok sayıyor — hata da vermiyor, yalnızca
 * bağlantılar çalışmıyor. Bu, saatlerce "neden çalışmıyor" aratan
 * türden bir ayrıntı.
 *
 * TEAM ID OLMADAN DOSYA YAYINLANMIYOR (404). Uydurma bir kimlikle
 * yayınlamak, Apple'ın doğrulamayı başarısız sayıp sonucu bir süre
 * önbelleğe almasına yol açıyor; gerçek kimlik girildiğinde bile
 * bağlantılar bir süre çalışmıyor. Yokluğu açıkça bırakmak daha temiz.
 */
export function GET() {
  const takimKimligi = process.env.IOS_TEAM_ID?.trim();
  const paketKimligi = process.env.IOS_BUNDLE_ID?.trim() || "com.quarkod.biyerlere";

  if (!takimKimligi) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${takimKimligi}.${paketKimligi}`],
            components: [
              // Yalnızca mekan sayfaları uygulamada açılıyor. Siteyi
              // tamamen devralmak ("/*"), gizlilik ve iletişim gibi
              // uygulamada karşılığı olmayan sayfaları da yakalardı.
              { "/": "/mekan/*", comment: "Mekan sayfaları uygulamada açılır" },
            ],
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        // Apple bu dosyayı kendi ağında önbelleğe alıyor; kısa bir süre
        // vermek, kimlik değişirse düzeltmenin günler sürmesini önlüyor.
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
