import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Android App Links doğrulaması.
 *
 * `autoVerify` işaretli bir uygulama kurulduğunda Android bu adresi okuyup
 * imza parmak izini karşılaştırıyor. Eşleşirse `https://<alan>/mekan/...`
 * bağlantıları doğrudan uygulamada açılıyor; eşleşmezse kullanıcıya her
 * seferinde "hangi uygulamayla açayım" diye soruluyor.
 *
 * PARMAK İZİ YOKSA DOSYA YAYINLANMIYOR (404). İmza parmak izi derleme
 * anahtarından geliyor (EAS'te `eas credentials`, Play Store imzalamada
 * Play Console'dan) — uydurulamaz, boş bırakılamaz.
 *
 * BİRDEN FAZLA PARMAK İZİ olabilir ve çoğu zaman olmalı: Play Store'un
 * yeniden imzaladığı sürümle geliştirme derlemesinin izleri farklı.
 * Virgülle ayrılmış liste kabul ediliyor.
 */
export function GET() {
  const parmakIzleri = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((p) => p.trim().toUpperCase())
    // Beklenen biçim: iki noktayla ayrılmış 32 bayt (SHA-256).
    .filter((p) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(p));

  if (parmakIzleri.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const paketAdi = process.env.ANDROID_PACKAGE?.trim() || "com.quarkod.biyerlere";

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: paketAdi,
          sha256_cert_fingerprints: parmakIzleri,
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
