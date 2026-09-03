import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { etkinlikleriGetir } from "@/lib/kesfet-veri";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Etkinlikler" };

function tarihEtiketi(baslangic: Date | null, bitis: Date | null): string | null {
  if (!baslangic) return null;
  const gunAy = baslangic.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const saat = baslangic.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  // Duyuru genelde tek saatlik bir çağrı ("21:00'de canlı müzik"); saat
  // 00:00 ise muhtemelen sadece gün seçilmiş, saat göstermenin anlamı yok.
  const saatVarMi = !(baslangic.getHours() === 0 && baslangic.getMinutes() === 0);
  const devam = bitis && bitis.getTime() !== baslangic.getTime();
  return `${gunAy}${saatVarMi ? `, ${saat}` : ""}${devam ? " itibarıyla" : ""}`;
}

export default async function EtkinliklerPage() {
  const etkinlikler = await etkinlikleriGetir();

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Etkinlikler</h1>
      <p className="mt-1 text-small text-gray-400">
        Şehirdeki mekanlardan bu haftaki canlı müzik, indirim ve özel geceler.
      </p>

      {etkinlikler.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center text-small text-gray-400">
          Şu an planlanmış bir etkinlik yok — yakında burada olacak!
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {etkinlikler.map((e) => (
            <li key={e.id}>
              <a
                href={`/mekan/${e.mekan.slug}`}
                className="flex gap-3 rounded-2xl border border-white/10 bg-[#24262E]/85 p-3.5"
              >
                <div
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5"
                  style={
                    e.gorselUrl
                      ? undefined
                      : { backgroundImage: `linear-gradient(155deg, ${e.mekan.markaRengi} 0%, #18191E 100%)` }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {e.gorselUrl ? <img src={e.gorselUrl} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-[#818CF8]">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                    {tarihEtiketi(e.baslangic, e.bitis) ?? "Devam ediyor"}
                  </p>
                  <p className="mt-0.5 font-semibold text-white">{e.baslik}</p>
                  <p className="truncate text-caption text-gray-400">{e.mekan.ad}</p>
                  {e.aciklama ? (
                    <p className="mt-1 line-clamp-2 text-small text-gray-300">{e.aciklama}</p>
                  ) : null}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
