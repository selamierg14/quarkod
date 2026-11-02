"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { appAuthGet, appAuthPost } from "../../lib/api-istemci";
import { useOturum } from "../../lib/OturumSaglayici";

type Tercih = { anahtar: string; ad: string; aciklama: string; acik: boolean };

/**
 * Bildirim tercihleri — bildirim merkezinin başında, katlanır bir bölüm.
 *
 * Ayarın yeri, ayarı değiştirmeyi düşündüren yer olmalı: "bu bildirimi
 * neden alıyorum" sorusu tam da bu listeye bakarken soruluyor. Profilin
 * dibinde ayrı bir sayfa, kimsenin aramadığı yerdir.
 *
 * Kapalı başlıyor: sayfanın asıl içeriği bildirimlerin kendisi.
 */
export function BildirimTercihleri() {
  const { oturum } = useOturum();
  const [acik, setAcik] = useState(false);
  const [tercihler, setTercihler] = useState<Tercih[] | null>(null);
  const [islenen, setIslenen] = useState<string | null>(null);

  useEffect(() => {
    if (!acik || oturum.durum !== "girisli") return;
    let iptal = false;
    appAuthGet<{ tercihler: Tercih[] }>("/api/app/bildirim-tercihleri").then((yanit) => {
      if (!iptal && yanit.ok) setTercihler(yanit.veri.tercihler);
    });
    return () => {
      iptal = true;
    };
  }, [acik, oturum.durum]);

  async function degistir(tercih: Tercih) {
    setIslenen(tercih.anahtar);
    const yanit = await appAuthPost<{ tercihler: Tercih[] }>(
      "/api/app/bildirim-tercihleri",
      { tercihler: { [tercih.anahtar]: !tercih.acik } },
      "PUT",
    );
    setIslenen(null);
    // Sunucunun listesi esas: ekranın tahmini ile ayrışırsa kullanıcı
    // kapattığını sanıp bildirim almaya devam eder.
    if (yanit.ok) setTercihler(yanit.veri.tercihler);
  }

  if (oturum.durum !== "girisli") return null;

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="flex items-center gap-2 self-start rounded-full border border-white/10 px-3 py-1.5 text-caption text-gray-300"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        Bildirim tercihleri
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#24262E]/85 p-4">
      <p className="text-small font-semibold text-white">Bildirim tercihleri</p>

      {!tercihler ? (
        <p className="text-caption text-gray-400">Yükleniyor…</p>
      ) : (
        tercihler.map((tercih) => (
          <div key={tercih.anahtar} className="flex items-center gap-3 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-small text-white">{tercih.ad}</p>
              <p className="text-caption text-gray-400">{tercih.aciklama}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={tercih.acik}
              aria-label={tercih.ad}
              disabled={islenen === tercih.anahtar}
              onClick={() => void degistir(tercih)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-caption font-semibold disabled:opacity-50 ${
                tercih.acik
                  ? "bg-[#FF6B4A]/15 text-[#FF6B4A]"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              {tercih.acik ? "Açık" : "Kapalı"}
            </button>
          </div>
        ))
      )}

      <p className="text-caption text-gray-500">
        Rezervasyon ve hesap güvenliği bildirimleri kapatılamaz: ikisi de senin
        başlattığın bir işlemin sonucunu taşıyor.
      </p>
    </div>
  );
}
