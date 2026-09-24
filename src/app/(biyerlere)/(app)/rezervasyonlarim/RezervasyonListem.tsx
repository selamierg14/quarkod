"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { appAuthGet, appAuthPost } from "../../lib/api-istemci";
import { useOturum } from "../../lib/OturumSaglayici";

type Kayit = {
  id: string;
  baslangic: string;
  kisiSayisi: number;
  durum: string;
  durumMetni: string;
  not: string | null;
  gecmisMi: boolean;
  iptalEdilebilir: boolean;
  mekan: { slug: string; ad: string; telefon: string | null };
};

export function RezervasyonListem() {
  const { oturum } = useOturum();
  const [kayitlar, setKayitlar] = useState<Kayit[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [islenen, setIslenen] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    const yanit = await appAuthGet<{ rezervasyonlar: Kayit[] }>("/api/app/rezervasyon");
    if (yanit.ok) setKayitlar(yanit.veri.rezervasyonlar);
    else setHata(yanit.hata);
  }, []);

  /**
   * Efekt `yukle`'yi çağırmıyor, isteği kendisi başlatıyor: durum
   * güncellemesi `then` içinde, yani yanıt geldiğinde oluyor. Aradaki
   * fark görünürde küçük ama `react-hooks/set-state-in-effect` kuralı
   * tam olarak bunu ayırt ediyor (aynı kalıp: FavoriButonu).
   */
  useEffect(() => {
    if (oturum.durum !== "girisli") return;
    let iptal = false;
    appAuthGet<{ rezervasyonlar: Kayit[] }>("/api/app/rezervasyon").then((yanit) => {
      if (iptal) return;
      if (yanit.ok) setKayitlar(yanit.veri.rezervasyonlar);
      else setHata(yanit.hata);
    });
    return () => {
      iptal = true;
    };
  }, [oturum.durum]);

  async function iptalEt(kayit: Kayit) {
    // Geri alınamayan işlem: onaysız iptal, yanlış dokunuşla masanın
    // kaybedilmesi demek (bkz. diğer silme akışlarındaki aynı kural).
    if (!confirm(`${kayit.mekan.ad} rezervasyonun iptal edilecek. Emin misin?`)) return;

    setIslenen(kayit.id);
    const yanit = await appAuthPost<{ iptalEdildi: boolean }>(
      "/api/app/rezervasyon",
      { rezervasyonId: kayit.id },
      "DELETE",
    );
    setIslenen(null);
    if (!yanit.ok) setHata(yanit.hata);
    await yukle();
  }

  if (oturum.durum !== "girisli") {
    return (
      <p className="rounded-2xl border border-white/10 bg-[#24262E]/85 px-4 py-6 text-center text-small text-gray-300">
        Rezervasyonlarını görmek için{" "}
        <Link href="/giris" className="font-semibold text-[#FF6B4A]">
          giriş yap
        </Link>
        .
      </p>
    );
  }

  if (!kayitlar) {
    return <p className="text-small text-gray-400">Yükleniyor…</p>;
  }

  if (kayitlar.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-[#24262E]/85 px-4 py-6 text-center text-small text-gray-300">
        Henüz rezervasyonun yok. Bir mekan sayfasında &quot;Masa ayırt&quot; diyerek yer
        ayırtabilirsin.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {hata ? (
        <p className="text-caption text-[#F87171]" role="alert">
          {hata}
        </p>
      ) : null}

      {kayitlar.map((kayit) => (
        <div
          key={kayit.id}
          className={`flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-[#24262E]/85 p-4 ${
            kayit.gecmisMi || kayit.durum === "iptal" ? "opacity-60" : ""
          }`}
        >
          <Link href={`/mekan/${kayit.mekan.slug}`} className="text-small font-semibold text-white">
            {kayit.mekan.ad}
          </Link>
          <p className="text-caption text-gray-300">
            {tarihMetni(kayit.baslangic)} · {kayit.kisiSayisi} kişi
          </p>
          <span
            className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              kayit.durum === "onaylandi" || kayit.durum === "oturdu"
                ? "bg-[#10B981]/15 text-[#34D399]"
                : kayit.durum === "bekliyor"
                  ? "bg-[#F59E0B]/15 text-[#FBBF24]"
                  : "bg-white/5 text-gray-300"
            }`}
          >
            {kayit.durumMetni}
          </span>
          {kayit.not ? <p className="text-caption text-gray-400">Not: {kayit.not}</p> : null}

          <div className="mt-1 flex gap-2">
            {kayit.mekan.telefon ? (
              <a
                href={`tel:${kayit.mekan.telefon}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-caption text-gray-200"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Mekanı ara
              </a>
            ) : null}
            {kayit.iptalEdilebilir ? (
              <button
                type="button"
                onClick={() => void iptalEt(kayit)}
                disabled={islenen === kayit.id}
                className="flex-1 rounded-xl border border-white/10 py-2 text-caption font-medium text-[#F87171] disabled:opacity-50"
              >
                {islenen === kayit.id ? "İptal ediliyor…" : "İptal et"}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function tarihMetni(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
