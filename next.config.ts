import type { NextConfig } from "next";

/**
 * Temel güvenlik başlıkları.
 *
 * Önceden hiç ayarlanmamıştı: Vercel varsayılan olarak bunları eklemiyor.
 * En somut risk clickjacking'di — panel (oturum çerezi taşıyan, para/veri
 * değiştiren formlar içeren) başka bir sitede görünmez bir iframe'e
 * gömülüp kullanıcı fark etmeden tıklatılabilirdi.
 *
 * `/admin` tamamen kapalı (DENY): panelin başka hiçbir sayfaya gömülmesi
 * gerekmiyor. `/f` (müşteri QR sayfaları) SAMEORIGIN: admin panelindeki
 * "Müşteri gözüyle aç" önizlemesi kendi kökeninden bir iframe kullanıyor
 * (bkz. menu/onizle/page.tsx), o yüzden tamamen kapatılamaz — ama üçüncü
 * bir sitenin bu sayfaları kendi çerçevesine alması hâlâ engelleniyor.
 *
 * Sıkı bir Content-Security-Policy (script-src vb.) bilinçli olarak
 * eklenmedi: Next'in hydration'ı, inline stil/scriptleri ve üçüncü parti
 * bütünleşmeleri (SMS/e-posta değil ama ileride eklenebilecek analytics)
 * doğru bir CSP'yi kapsamlı bir denemeden geçirmeden yazmak, "güvenlik"
 * adı altında üretimi kırma riski taşır. `frame-ancestors` tek başına
 * güvenli ve X-Frame-Options ile aynı korumayı veriyor.
 */
const ORTAK_BASLIKLAR = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS: tarayıcı bir kez HTTPS ile geldikten sonra bir daha düz HTTP
  // denemiyor — yönlendirmeyi bekleyen ilk isteğin araya girilme (SSL
  // stripping) penceresi böylece kapanıyor.
  //
  // YALNIZCA `HTTPS_ZORUNLU=1` iken gönderiliyor. Sertifika takılmadan bu
  // başlığı yollamak, tarayıcıya "bu alan adına artık sadece HTTPS ile
  // gel" demek olurdu ve site erişilemez hâle gelirdi — üstelik
  // `max-age` boyunca geri alınamaz. Sertifika hazır olunca ortam
  // değişkenini açmak yeterli; kod değişmiyor.
  ...(process.env.HTTPS_ZORUNLU === "1"
    ? [
        {
          key: "Strict-Transport-Security",
          // Bir yıl + alt alan adları. `preload` bilerek YOK: listeye
          // girmek kolay, çıkmak aylar sürüyor.
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
  // Kamera ve mikrofon web'de hiç kullanılmıyor; kapalı.
  //
  // KONUM `self`: önceden `geolocation=()` yazıyordu ve bu, Biyerlere web
  // sürümünün "Konumu aç" özelliğini TARAYICI DÜZEYİNDE kapatıyordu — izin
  // penceresi bile açılmıyor, "permissions policy ile kapatıldı" hatası
  // dönüyordu (canlı doğrulandı). `self`, konumu yalnızca kendi
  // sayfalarımıza açıyor; gömülü üçüncü taraf çerçeveler hâlâ isteyemiyor.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  // `X-Powered-By: Next.js` sürüm/çatı bilgisini her yanıtta dışarı
  // veriyordu; saldırgana hangi bilinen açıkları deneyeceğini söylemenin
  // hiçbir faydası yok.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Vardiya çizelgesi Excel içe aktarımı 1 MB'a kadar dosya kabul
      // ediyor (bkz. vardiya-planlama/actions.ts, EN_BUYUK_DOSYA); Next'in
      // varsayılan sunucu eylemi gövde sınırı da 1 MB. Dosyanın kendisi
      // sınıra tam yaklaştığında form alanlarıyla birlikte toplam boyut
      // varsayılanı aşıp Next'in kendi genel hata sayfasını gösteriyordu —
      // bizim "dosya çok büyük" mesajımız hiç çalışmadan. Biraz pay
      // bırakarak asıl kontrolün (ve Türkçe hata mesajının) devreye
      // girmesini sağlıyoruz.
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: ORTAK_BASLIKLAR,
      },
      /**
       * ÇERÇEVEYE GÖMÜLME YASAĞI — /f/* (masadaki anket) DIŞINDAKİ HER ŞEY.
       *
       * Önceden yalnızca /admin korunuyordu. Biyerlere sayfaları — hesap
       * silme, şifre değiştirme, favori — başka bir sitenin görünmez
       * çerçevesine gömülüp kullanıcıya fark ettirmeden tıklatılabiliyordu
       * (clickjacking). Canlı doğrulandı: /profil/sifre çerçeve başlığı
       * taşımıyordu.
       *
       * Negatif ileri bakış (`(?!f/)`), anket sayfalarını bilerek dışarıda
       * bırakıyor: onlar aşağıdaki kuralla kendi alan adımızdan
       * çerçevelenebiliyor (panel önizlemesi).
       */
      {
        source: "/((?!f/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/f/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
