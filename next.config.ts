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
  // Kamera/mikrofon/konum bu üründe hiç kullanılmıyor; açık bırakmanın
  // hiçbir faydası yok, kapatmanın maliyeti sıfır.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
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
      {
        source: "/admin/:path*",
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
