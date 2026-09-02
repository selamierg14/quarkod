"use client";

import { useEffect, useState } from "react";
import { MapPinned } from "lucide-react";
import { appAuthGet } from "../../lib/api-istemci";
import { KartListesiIskeleti } from "../../components/Skeleton";

export type RotaDurakOzet = { id: string; businessId: string; slug: string; ad: string; logoUrl: string | null };
export type RotaOzet = {
  id: string;
  slug: string;
  ad: string;
  aciklama: string | null;
  duraklar: RotaDurakOzet[];
  ziyaretEdilenler: string[];
  tamamlandiMi: boolean;
};

export function RotaKarti({ rota }: { rota: RotaOzet }) {
  const ilerleme = rota.ziyaretEdilenler.length;
  const toplam = rota.duraklar.length;
  const yuzde = toplam > 0 ? Math.round((ilerleme / toplam) * 100) : 0;

  return (
    <a
      href={`/rotalar/${rota.slug}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900/85 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-white">{rota.ad}</h3>
          {rota.aciklama ? (
            <p className="mt-0.5 line-clamp-2 text-small text-slate-400">{rota.aciklama}</p>
          ) : null}
        </div>
        {rota.tamamlandiMi ? (
          <span className="shrink-0 rounded-full bg-[#10B981]/15 px-2.5 py-1 text-[11px] font-semibold text-[#10B981]">
            ✓ Tamamlandı
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex -space-x-2">
        {rota.duraklar.slice(0, 6).map((d) => (
          <div
            key={d.id}
            className={`h-8 w-8 overflow-hidden rounded-full border-2 bg-slate-800 ${
              rota.ziyaretEdilenler.includes(d.businessId) ? "border-[#10B981]" : "border-slate-900"
            }`}
          >
            {d.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-[#818CF8] transition-[width]"
            style={{ width: `${yuzde}%` }}
          />
        </div>
        <p className="mt-1.5 text-caption text-slate-500">
          {ilerleme}/{toplam} durak gezildi
        </p>
      </div>
    </a>
  );
}

export function RotalarIcerik() {
  const [rotalar, setRotalar] = useState<RotaOzet[] | null>(null);

  useEffect(() => {
    let iptal = false;
    appAuthGet<{ rotalar: RotaOzet[] }>("/api/app/rotalar").then((sonuc) => {
      if (!iptal && sonuc.ok) setRotalar(sonuc.veri.rotalar);
    });
    return () => {
      iptal = true;
    };
  }, []);

  if (!rotalar) return <KartListesiIskeleti adet={3} />;

  if (rotalar.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-dashed border-slate-800 p-6 text-center text-small text-slate-500">
        <MapPinned className="mx-auto mb-2 h-6 w-6 text-slate-600" aria-hidden="true" />
        Henüz bir rota yok — yakında burada olacak!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rotalar.map((rota) => (
        <RotaKarti key={rota.id} rota={rota} />
      ))}
    </div>
  );
}
