"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { appAuthGet } from "../../../lib/api-istemci";
import type { RotaDurakOzet, RotaOzet } from "../RotalarIcerik";

/** Server'dan gelen, kimliksiz temel şekil — ilk boyama bunu kullanıyor. */
type RotaTemel = { id: string; slug: string; ad: string; aciklama: string | null; duraklar: RotaDurakOzet[] };

/**
 * İlk boyama sunucuda, GERÇEK durak listesiyle olur (bkz. page.tsx) — bir
 * rota paylaşılabilir bir içerik, boş iskelet göstermek yerine linki açan
 * herkes (girişli olmasa bile) hangi mekanları içerdiğini hemen görsün.
 * İlerleme (hangi durak ziyaret edilmiş) SADECE girişliyken anlamlı, o
 * yüzden o kısım istemcide `/api/app/rotalar`'dan üzerine biniyor —
 * Favoriler/Bildirimler'deki aynı ilke: kişiye özel veri her zaman
 * istemci tarafı jetonla çekilir (bkz. OturumSaglayici).
 */
export function RotaDetayIcerik({ slug, baslangicVerisi }: { slug: string; baslangicVerisi: RotaTemel }) {
  const [rota, setRota] = useState<RotaOzet>({
    ...baslangicVerisi,
    ziyaretEdilenler: [],
    tamamlandiMi: false,
  });

  useEffect(() => {
    let iptal = false;
    appAuthGet<{ rotalar: RotaOzet[] }>("/api/app/rotalar").then((sonuc) => {
      if (iptal || !sonuc.ok) return;
      const guncel = sonuc.veri.rotalar.find((r) => r.slug === slug);
      if (guncel) setRota(guncel);
    });
    return () => {
      iptal = true;
    };
  }, [slug]);

  const ilerleme = rota.ziyaretEdilenler.length;
  const toplam = rota.duraklar.length;
  const yuzde = toplam > 0 ? Math.round((ilerleme / toplam) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-white">{rota.ad}</h1>
        {rota.aciklama ? <p className="mt-1 text-small text-gray-400">{rota.aciklama}</p> : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#24262E]/85 p-4">
        <div className="flex items-center justify-between text-small">
          <span className="font-semibold text-white">İlerleme</span>
          <span className="text-gray-400">
            {ilerleme}/{toplam} durak
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-[#818CF8] transition-[width]" style={{ width: `${yuzde}%` }} />
        </div>
        <p className="mt-2 text-caption text-gray-400">
          {rota.tamamlandiMi
            ? "✓ Bu rotayı tamamladın, bonus puanın hesabına geçti."
            : "Tüm durakları doğrulanmış ziyaretle gez, bonus puan kazan."}
        </p>
      </div>

      <ol className="flex flex-col gap-2.5">
        {rota.duraklar.map((durak, i) => {
          const ziyaretEdildi = rota.ziyaretEdilenler.includes(durak.businessId);
          return (
            <li key={durak.id}>
              <a
                href={`/mekan/${durak.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#24262E]/85 p-3.5 transition active:scale-[0.97] duration-150 ease-out"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                    ziyaretEdildi ? "bg-[#10B981] text-white" : "bg-white/5 text-gray-400"
                  }`}
                >
                  {ziyaretEdildi ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {durak.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={durak.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="min-w-0 flex-1 truncate font-medium text-white">{durak.ad}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
