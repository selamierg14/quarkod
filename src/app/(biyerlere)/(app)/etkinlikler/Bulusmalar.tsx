"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { appAuthGet, appAuthPost } from "../../lib/api-istemci";
import { useOturum } from "../../lib/OturumSaglayici";

type Bulusma = {
  id: string;
  baslik: string;
  aciklama: string | null;
  baslangic: string;
  acan: string;
  benimMi: boolean;
  mekan: { id: string; slug: string; ad: string; logoUrl: string | null };
  ilgiSayisi: number;
  ilgilendimMi: boolean;
};

/**
 * Kullanıcıların açtığı buluşmalar — web.
 *
 * Özellik ilk olarak mobilde yazıldı ve web'deki "Etkinlikler" sayfası
 * yalnızca İŞLETME DUYURULARINI gösteriyordu; web kullanıcısı buluşmaları
 * hiç göremiyordu. Aynı uç (/api/app/etkinlikler) iki tarafı da besliyor.
 *
 * İŞLETME DUYURULARINDAN AYRI BÖLÜM ve her kartta "… açtı" satırı var:
 * duyuruyu mekan yazıyor ve mekan adına söz veriyor, buluşmayı bir müşteri
 * açıyor. Karıştırılırlarsa mekan, haberi olmadığı bir sözün altında kalır.
 */
export function Bulusmalar() {
  const router = useRouter();
  const { oturum } = useOturum();
  const [liste, setListe] = useState<Bulusma[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    // Oturum netleşmeden istek atılmıyor: jetonla gelen yanıt "benim mi" /
    // "ilgilendim mi" bilgisini taşıyor, jetonsuz gelen taşımıyor.
    if (oturum.durum === "yukleniyor") return;
    let iptal = false;
    appAuthGet<{ etkinlikler: Bulusma[] }>("/api/app/etkinlikler").then((sonuc) => {
      if (iptal) return;
      if (sonuc.ok) setListe(sonuc.veri.etkinlikler);
      else setHata(sonuc.hata);
    });
    return () => {
      iptal = true;
    };
  }, [oturum.durum]);

  async function ilgi(b: Bulusma) {
    if (oturum.durum !== "girisli") {
      router.push("/giris");
      return;
    }
    const sonuc = await appAuthPost<{ ilgilendimMi: boolean; ilgiSayisi: number }>(
      "/api/app/etkinlikler",
      { etkinlikId: b.id },
      "PUT",
    );
    if (sonuc.ok) {
      setListe((l) => l?.map((x) => (x.id === b.id ? { ...x, ...sonuc.veri } : x)) ?? l);
    } else {
      setHata(sonuc.hata);
    }
  }

  async function iptalEt(b: Bulusma) {
    if (!window.confirm(`"${b.baslik}" iptal edilsin mi? İlgilenenler artık göremeyecek.`)) return;
    const sonuc = await appAuthPost("/api/app/etkinlikler", { etkinlikId: b.id }, "DELETE");
    if (sonuc.ok) setListe((l) => l?.filter((x) => x.id !== b.id) ?? l);
    else setHata(sonuc.hata);
  }

  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
        <Users className="h-4 w-4 text-[#818CF8]" aria-hidden="true" />
        Buluşmalar
      </h2>
      <p className="mt-1 text-small text-gray-400">
        Kullanıcıların açtığı buluşma çağrıları. Açmak için Biyerlere uygulamasında bir mekan
        sayfasına git.
      </p>

      {hata ? (
        <p role="alert" className="mt-3 text-small text-[#FF6B4A]">
          {hata}
        </p>
      ) : null}

      {liste === null ? (
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />
      ) : liste.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-5 text-center text-small text-gray-400">
          Şu an açık bir buluşma yok.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {liste.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-white/10 bg-[#24262E]/85 p-3.5"
            >
              <a href={`/mekan/${b.mekan.slug}`} className="block">
                <p className="text-[11px] font-medium text-[#818CF8]">{tarihMetni(b.baslangic)}</p>
                <p className="mt-0.5 font-semibold text-white">{b.baslik}</p>
                <p className="truncate text-caption text-gray-400">{b.mekan.ad}</p>
                {b.aciklama ? (
                  <p className="mt-1 line-clamp-3 text-small text-gray-300">{b.aciklama}</p>
                ) : null}
              </a>
              <div className="mt-3 flex items-center gap-3">
                <p className="flex-1 truncate text-[11px] text-gray-500">
                  {b.benimMi ? "Sen açtın" : `${b.acan} açtı`}
                </p>
                {b.benimMi ? (
                  <button
                    type="button"
                    onClick={() => void iptalEt(b)}
                    className="rounded-full bg-[#FF6B4A]/15 px-3 py-1.5 text-caption font-semibold text-[#FF6B4A]"
                  >
                    İptal et
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void ilgi(b)}
                    aria-pressed={b.ilgilendimMi}
                    aria-label={`${b.ilgilendimMi ? "İlgilenmekten vazgeç" : "İlgileniyorum"}, ${b.ilgiSayisi} kişi ilgileniyor`}
                    className={`rounded-full px-3 py-1.5 text-caption font-semibold tabular-nums ${
                      b.ilgilendimMi ? "bg-[#6366F1]/25 text-[#A5B4FC]" : "bg-white/10 text-gray-200"
                    }`}
                  >
                    {b.ilgilendimMi ? "★" : "☆"} {b.ilgiSayisi}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function tarihMetni(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
