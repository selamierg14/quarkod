/**
 * Sunucu tarafı hata kaydı.
 *
 * Canlıda bir şey patladığında kimsenin haberi olmaması en sinsi arıza türü:
 * müşteri anketi gönderemez, panel boş görünür, kimse fark etmez. Buradaki
 * kanca her sunucu hatasını tek satırlık, aranabilir bir kayda çevirir.
 *
 * Sentry gibi bir servise bağlamak isterseniz: paketi kurun ve aşağıdaki
 * `logError` içinden `Sentry.captureException(error)` çağırın — çağrı noktası
 * hazır, başka yeri değiştirmeye gerek yok.
 */

type ErrorContext = {
  path?: string;
  method?: string;
  routeType?: string;
};

function logError(error: unknown, context: ErrorContext) {
  const time = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    `[hata] ${time} ${context.method ?? "-"} ${context.path ?? "-"} (${context.routeType ?? "-"}): ${message}`,
  );
  if (stack) console.error(stack);
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routeType: string },
) {
  logError(error, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  });
}

/**
 * Uygulamanın saati İstanbul.
 *
 * Gün hesapları (lib/cekirdek/gun.ts: "bugün", hafta başı, vardiya günü)
 * ve tarih biçimleri sunucunun YEREL saatini kullanıyor. Vercel UTC'de
 * çalışıyor, geliştirme makinesi İstanbul'da — ve ikisi aynı veritabanına
 * yazıyor. Sonuç (Ekim 2026'da ölçüldü):
 *
 *   - Panelde saatler 3 saat geri ("11:24 itibarıyla", Türkiye 14:24).
 *   - Aynı gün iki ayrı anla saklanmış: vardiya atamalarının 214'ü
 *     İstanbul gece yarısında (21:00Z), 67'si UTC gece yarısında (00:00Z).
 *     İstanbul'dan yazılan atama canlıda BİR GÜN ÖNCE görünüyor; dört kişi
 *     aynı vardiyaya iki satırla atanmış.
 *
 * Ürünün bütün kullanıcıları Türkiye'de; tek doğru saat bu. Ortam
 * değişkenine bırakılmadı: unutulduğunda sessizce UTC'ye döner ve tam
 * olarak yukarıdaki hatayı geri getirir. Node, çalışma anında atanan
 * `process.env.TZ`'yi tanıyor; `register` ilk istekten önce bittiği için
 * hiçbir istek eski saatle işlenmiyor. Türkiye 2016'dan beri yaz saati
 * uygulamıyor, yani fark sabit +3.
 */
export const UYGULAMA_SAAT_DILIMI = "Europe/Istanbul";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = UYGULAMA_SAAT_DILIMI;
  }

  // Yakalanmayan hatalar Next'in kancasına düşmez; onları da kayda alalım.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Üretimde yanlış ayarla açılmaktansa hiç açılmamak yeğdir: bu
    // hataların hepsi sistem çalışıyor görünürken sessizce zarar verir.
    if (process.env.NODE_ENV === "production") {
      const { uretimSorunlari, uretimUyarilari } = await import(
        "./lib/cekirdek/uretim-kontrol"
      );
      const sorunlar = uretimSorunlari(process.env);
      if (sorunlar.length) {
        console.error("\n[ayar] Üretim ortamı hazır değil:\n");
        for (const sorun of sorunlar) console.error(`  • ${sorun}`);
        console.error("\nDüzeltip yeniden başlatın.\n");
        process.exit(1);
      }

      // Engellemiyor ama kayda giriyor: bunlar bilinçli bir tercih de
      // olabilir, sessizce olmamalı.
      for (const uyari of uretimUyarilari(process.env)) {
        console.warn(`[ayar] UYARI: ${uyari}`);
      }
    }

    process.on("unhandledRejection", (reason) => {
      logError(reason, { path: "unhandledRejection" });
    });
    process.on("uncaughtException", (error) => {
      logError(error, { path: "uncaughtException" });
    });
  }
}
