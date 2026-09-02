import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Star, MapPin, Phone, MessageCircle, ClipboardList } from "lucide-react";
import { mekanDetayGetir } from "@/lib/kesfet-veri";
import { BUSINESS_TYPES } from "@/lib/mekan";
import { prisma } from "@/lib/db";
import { FavoriButonu } from "./FavoriButonu";
import { YolTarifiButonu } from "./YolTarifiButonu";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mekan = await mekanDetayGetir(slug);
  return { title: mekan?.ad ?? "Mekan bulunamadı" };
}

export default async function MekanDetayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mekan = await mekanDetayGetir(slug);
  if (!mekan) notFound();

  // Görüntüleme sayacı — panelin "Biyerlere bu hafta" istatistik kartının
  // ham verisi. Yanıtı bekletmesin diye `after()` ile isteğin arkasına
  // bırakılıyor (bkz. f/[slug]/[table]/actions.ts'teki aynı desen).
  after(async () => {
    await prisma.mekanEtkilesim
      .create({ data: { businessId: mekan.id, tur: "goruntuleme" } })
      .catch((error) => {
        console.error("[biyerlere] mekan görüntüleme sayılamadı:", error);
      });
  });

  const whatsappHref = mekan.telefon
    ? `https://wa.me/${mekan.telefon.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Merhaba, ${mekan.ad} için rezervasyon yaptırmak istiyorum.`,
      )}`
    : null;

  return (
    <div className="-mx-4 -mt-3 flex flex-col gap-5 pb-4">
      <div className="relative h-56 w-full bg-slate-800">
        {mekan.kapakUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mekan.kapakUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `linear-gradient(155deg, ${mekan.markaRengi} 0%, #0F172A 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent" />

        <div className="absolute right-4 top-3">
          <FavoriButonu businessId={mekan.id} />
        </div>

        <div className="absolute inset-x-4 bottom-3 flex items-end gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-900 ring-2 ring-[#0F172A]">
            {mekan.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mekan.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-xl font-bold text-white">{mekan.ad}</h1>
            <p className="flex items-center gap-2 text-caption text-slate-300">
              {BUSINESS_TYPES[mekan.tur as keyof typeof BUSINESS_TYPES] ?? mekan.tur}
              {mekan.fiyatSegmenti ? (
                <span>
                  ·{" "}
                  {mekan.fiyatSegmenti === "ucuz"
                    ? "₺"
                    : mekan.fiyatSegmenti === "orta"
                      ? "₺₺"
                      : "₺₺₺"}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4">
        <div className="flex items-center gap-4 text-small">
          {mekan.puan !== null ? (
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
              {mekan.puan.toFixed(1)}
              <span className="font-normal text-slate-400">
                ({mekan.degerlendirmeSayisi} değerlendirme)
              </span>
            </span>
          ) : (
            <span className="text-slate-500">Henüz değerlendirme yok</span>
          )}
        </div>

        {mekan.adres ? (
          <p className="flex items-start gap-2 text-small text-slate-300">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            {mekan.adres}
          </p>
        ) : null}

        {/* Hızlı iletişim şeridi */}
        <div className="grid grid-cols-4 gap-2">
          <a
            href={`/f/${mekan.slug}/giris/menu`}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/85 py-3 text-[11px] font-medium text-slate-200"
          >
            <ClipboardList className="h-5 w-5 text-[#818CF8]" aria-hidden="true" />
            QR Menü
          </a>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/85 py-3 text-[11px] font-medium text-slate-200"
            >
              <MessageCircle className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
              WhatsApp
            </a>
          ) : null}
          {mekan.telefon ? (
            <a
              href={`tel:${mekan.telefon}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/85 py-3 text-[11px] font-medium text-slate-200"
            >
              <Phone className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
              Ara
            </a>
          ) : null}
          {mekan.konum.enlem !== null ? (
            <YolTarifiButonu
              businessId={mekan.id}
              href={`https://www.google.com/maps/dir/?api=1&destination=${mekan.konum.enlem},${mekan.konum.boylam}`}
            />
          ) : null}
        </div>

        {mekan.etkinlikler.length > 0 ? (
          <section>
            <h2 className="text-base font-bold text-white">Bu haftaki etkinlikler</h2>
            <ul className="mt-2.5 flex flex-col gap-2">
              {mekan.etkinlikler.map((e) => (
                <li
                  key={e.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/85 p-3.5"
                >
                  <p className="font-semibold text-white">{e.baslik}</p>
                  {e.baslangic ? (
                    <p className="mt-0.5 text-caption text-[#818CF8]">
                      {new Date(e.baslangic).toLocaleDateString("tr-TR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  ) : null}
                  {e.aciklama ? (
                    <p className="mt-1 text-small text-slate-300">{e.aciklama}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {mekan.menu.bolumler.length > 0 ? (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Öne çıkan lezzetler</h2>
              <a href={`/f/${mekan.slug}/giris/menu`} className="text-caption font-medium text-[#818CF8]">
                Tüm menü →
              </a>
            </div>
            <div className="-mx-4 mt-2.5 flex gap-3 overflow-x-auto px-4 pb-1">
              {mekan.menu.bolumler
                .flatMap((b) => b.urunler)
                .filter((u) => !u.tukendi)
                .slice(0, 10)
                .map((urun) => (
                  <div
                    key={urun.id}
                    className="w-32 shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/85"
                  >
                    <div className="h-20 w-full bg-slate-800">
                      {urun.gorselUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urun.gorselUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-[12px] font-semibold text-white">{urun.ad}</p>
                      {urun.fiyatKurus !== null ? (
                        <p className="text-[11px] text-slate-400">
                          ₺{(urun.fiyatKurus / 100).toFixed(0)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
            ✅ %100 doğrulanmış masa yorumları
          </h2>
          <p className="mt-1 text-caption text-slate-500">
            Yalnızca masada oturup fiziksel QR okutan kişilerin yorumları.
          </p>
          {mekan.dogrulanmisYorumlar.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-800 p-4 text-center text-small text-slate-500">
              Henüz doğrulanmış bir yorum yok — ilk yorumu sen bırak!
            </p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {mekan.dogrulanmisYorumlar.map((yorum) => (
                <li
                  key={yorum.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/85 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{yorum.isim}</span>
                    <span className="flex items-center gap-1 text-[#F59E0B]">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      {yorum.puan}
                    </span>
                  </div>
                  <p className="mt-1.5 text-small text-slate-300">{yorum.yorum}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
