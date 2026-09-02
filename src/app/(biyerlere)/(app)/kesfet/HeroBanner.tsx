"use client";

import type { MekanOzet } from "@/lib/kesfet-veri";

/**
 * Öne çıkan etkinlik afişi.
 *
 * "Sponsorlu" spec'te geçiyor ama bir reklam/öne çıkarma satın alma
 * mekanizması henüz yok (bkz. Business modeli) — bu yüzden burada
 * gösterilen, gerçekten en YAKIN zamanda başlayacak etkinlik. Sahte bir
 * "sponsorlu" etiketi basmak yerine dürüst bir sıralama kuralı kullanmak,
 * ileride gerçek bir öne çıkarma özelliği eklendiğinde bu bileşeni
 * bozmadan üzerine inşa etmeyi de kolaylaştırıyor.
 */
export function HeroBanner({
  mekan,
  duyuru,
}: {
  mekan: Pick<MekanOzet, "slug" | "ad" | "markaRengi">;
  duyuru: MekanOzet["etkinlikler"][number];
}) {
  const tarihMetni = duyuru.baslangic
    ? new Date(duyuru.baslangic).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        weekday: "long",
      })
    : null;

  async function paylas() {
    const metin = `${mekan.ad} — ${duyuru.baslik}${tarihMetni ? ` (${tarihMetni})` : ""}`;
    const url = `${location.origin}/mekan/${mekan.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: mekan.ad, text: metin, url });
        return;
      } catch {
        // Kullanıcı paylaşım sayfasını iptal etmiş olabilir — WhatsApp'a düş.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${metin}\n${url}`)}`, "_blank");
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="relative h-44 w-full">
        {duyuru.gorselUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={duyuru.gorselUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `linear-gradient(155deg, ${mekan.markaRengi} 0%, #0F172A 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {tarihMetni ? (
            <span className="rounded-full bg-[#FF5A36] px-2.5 py-1 text-[11px] font-semibold text-white">
              {tarihMetni}
            </span>
          ) : null}
          <h2 className="mt-2 text-lg font-bold text-white">{duyuru.baslik}</h2>
          <p className="text-small text-slate-300">{mekan.ad}</p>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-900/85 p-3 backdrop-blur-md">
        <button
          type="button"
          onClick={paylas}
          className="flex-1 rounded-control border border-slate-700 py-2.5 text-small font-semibold text-white active:scale-[0.99]"
        >
          WhatsApp&apos;ta paylaş
        </button>
        <a
          href={`/mekan/${mekan.slug}`}
          className="flex-1 rounded-control bg-[#6366F1] py-2.5 text-center text-small font-semibold text-white active:scale-[0.99]"
        >
          Fırsatı gör
        </a>
      </div>
    </div>
  );
}
