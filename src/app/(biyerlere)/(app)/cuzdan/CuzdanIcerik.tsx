"use client";

import { useEffect, useState } from "react";
import { appAuthGet } from "../../lib/api-istemci";
import { useOturum } from "../../lib/OturumSaglayici";
import { KuponKarti, type Kupon } from "./KuponKarti";

type SadakatKarti = {
  mekan: { id: string; slug: string; ad: string; logoUrl: string | null };
  toplamZiyaret: number;
  damgaSayisi: number;
  esik: number;
  kalanZiyaret: number;
};

type GecmisKupon = {
  id: string;
  indirim: string;
  kullanildi: boolean;
  kullanilmaTarihi: string | null;
  sonKullanma: string | null;
  mekan: { id: string; slug: string; ad: string; logoUrl: string | null };
};

type CuzdanVerisi = {
  kuponlar: Kupon[];
  gecmisKuponlar: GecmisKupon[];
  sadakatKartlari: SadakatKarti[];
};

function DamgaKarti({ kart }: { kart: SadakatKarti }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-800">
          {kart.mekan.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kart.mekan.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-small font-semibold text-white">{kart.mekan.ad}</p>
          <p className="text-[11px] text-slate-400">
            {kart.kalanZiyaret} ziyaret sonra ücretsiz kahve!
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: kart.esik }, (_, i) => (
          <span
            key={i}
            className={`flex h-6 flex-1 items-center justify-center rounded-full text-[13px] ${
              i < kart.damgaSayisi ? "bg-[#F59E0B]" : "bg-slate-800"
            }`}
          >
            {i < kart.damgaSayisi ? "☕" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CuzdanIcerik() {
  const { oturum } = useOturum();
  const [veri, setVeri] = useState<CuzdanVerisi | null>(null);
  const [gecmisAcik, setGecmisAcik] = useState(false);

  useEffect(() => {
    if (oturum.durum !== "girisli") return;
    let iptal = false;

    async function getir() {
      const sonuc = await appAuthGet<CuzdanVerisi>("/api/app/cuzdan");
      if (!iptal && sonuc.ok) setVeri(sonuc.veri);
    }

    getir();
    // Kupon kodu 15 dakikalık bir pencereye bağlı (bkz. lib/kupon-kod.ts);
    // dakikada bir tazelemek, geri sayım sıfırlandığında kodu otomatik
    // güncel tutuyor — kullanıcı elle "yenile" demek zorunda kalmıyor.
    const zamanlayici = setInterval(getir, 60_000);
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
    };
  }, [oturum.durum]);

  if (oturum.durum === "yukleniyor") {
    return <p className="text-center text-small text-slate-500">Yükleniyor…</p>;
  }
  if (oturum.durum === "cikisli") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center">
        <p className="text-small text-slate-300">Cüzdanını görmek için giriş yapmalısın.</p>
        <a
          href="/giris"
          className="mt-3 inline-block rounded-control bg-[#6366F1] px-5 py-2.5 text-small font-semibold text-white"
        >
          Giriş yap
        </a>
      </div>
    );
  }
  if (!veri) {
    return <p className="text-center text-small text-slate-500">Yükleniyor…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-base font-bold text-white">Aktif kuponlar</h2>
        {veri.kuponlar.length === 0 ? (
          <p className="mt-2 text-small text-slate-500">
            Henüz kuponun yok. Mekanları keşfet, ziyaret et, kazan.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-3">
            {veri.kuponlar.map((k) => (
              <KuponKarti key={k.id} kupon={k} />
            ))}
          </div>
        )}
      </section>

      {veri.sadakatKartlari.length > 0 ? (
        <section>
          <h2 className="text-base font-bold text-white">Sadakat kartların</h2>
          <div className="mt-2.5 flex flex-col gap-3">
            {veri.sadakatKartlari.map((kart) => (
              <DamgaKarti key={kart.mekan.id} kart={kart} />
            ))}
          </div>
        </section>
      ) : null}

      {veri.gecmisKuponlar.length > 0 ? (
        <section>
          <button
            type="button"
            onClick={() => setGecmisAcik((v) => !v)}
            className="text-base font-bold text-white"
          >
            Geçmiş kuponlar {gecmisAcik ? "▲" : "▼"}
          </button>
          {gecmisAcik ? (
            <ul className="mt-2.5 flex flex-col gap-2">
              {veri.gecmisKuponlar.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5 text-small"
                >
                  <span className="text-slate-300">
                    {k.mekan.ad} — {k.indirim}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {k.kullanildi ? "kullanıldı" : "süresi doldu"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
