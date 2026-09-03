"use client";

import type { MekanOzet } from "@/lib/kesfet-veri";

/**
 * Öne çıkan afiş.
 *
 * Öncelik sırası (bkz. KesfetAkisi.tsx'teki seçim): önce bu HAFTANIN
 * satın alınmış sponsoru (Business.sponsorHaftasi, admin/sponsorlar'dan
 * yönetiliyor), yoksa en yakın zamanda başlayacak etkinlik. Sponsorun
 * kendi etkinliği olmayabilir — `duyuru` bu yüzden isteğe bağlı; yoksa
 * afiş mekanın kapak fotoğrafını ve adını gösterir. `sponsorluMu` true
 * olduğunda köşede dürüst bir "Sponsorlu" rozeti çıkar — hangi sebeple
 * öne çıktığını gizlemek güven kaybettirirdi.
 */
export function HeroBanner({
  mekan,
  duyuru,
}: {
  mekan: Pick<MekanOzet, "slug" | "ad" | "markaRengi" | "kapakUrl" | "sponsorluMu">;
  duyuru: MekanOzet["etkinlikler"][number] | null;
}) {
  const tarihMetni = duyuru?.baslangic
    ? new Date(duyuru.baslangic).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        weekday: "long",
      })
    : null;
  const gorselUrl = duyuru?.gorselUrl ?? mekan.kapakUrl;
  const baslik = duyuru?.baslik ?? mekan.ad;

  async function paylas() {
    const metin = `${mekan.ad} — ${baslik}${tarihMetni ? ` (${tarihMetni})` : ""}`;
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
        {gorselUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gorselUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `linear-gradient(155deg, ${mekan.markaRengi} 0%, #18191E 100%)`,
            }}
          />
        )}
        {/* Mekanın kendi rengi/fotoğrafı canlı kalsın diye ağır bir siyah
            karartma yerine zemin rengine dayalı, yalnızca metnin okunmasını
            sağlayacak kadar ince bir gölge. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#18191E]/95 via-[#18191E]/25 to-transparent" />
        {mekan.sponsorluMu ? (
          <span className="absolute top-3 right-3 rounded-full bg-[#F59E0B] px-2.5 py-1 text-[11px] font-semibold text-white">
            Sponsorlu
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-4">
          {tarihMetni ? (
            <span className="rounded-full bg-[#FF6B4A] px-2.5 py-1 text-[11px] font-semibold text-white">
              {tarihMetni}
            </span>
          ) : null}
          <h2 className="mt-2 text-lg font-bold text-white">{baslik}</h2>
          {duyuru ? <p className="text-small text-gray-300">{mekan.ad}</p> : null}
        </div>
      </div>

      <div className="flex gap-2 bg-[#24262E]/85 p-3 backdrop-blur-md">
        <button
          type="button"
          onClick={paylas}
          className="flex-1 rounded-control border border-white/15 py-2.5 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          WhatsApp&apos;ta paylaş
        </button>
        <a
          href={`/mekan/${mekan.slug}`}
          className="flex-1 rounded-control bg-[#6366F1] py-2.5 text-center text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          Fırsatı gör
        </a>
      </div>
    </div>
  );
}
