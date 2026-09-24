"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { appAuthGet, appAuthPost } from "../../../lib/api-istemci";
import { useOturum } from "../../../lib/OturumSaglayici";

type Musaitlik = {
  mekan: { ad: string; telefon: string | null };
  sureDakika: number;
  saatler: { etiket: string; baslangic: string }[];
};

/**
 * Mekan sayfasındaki masa ayırtma kutusu — mobildeki ekranın web eşi.
 *
 * Aynı uç, aynı kurallar: kişi/gün/saat seçiliyor, masayı sunucu buluyor
 * ve talep mekanın onayına düşüyor (bkz. api/app/rezervasyon/route.ts).
 *
 * KAPALI BAŞLIYOR. Mekan sayfası aynı zamanda menü, yorum ve yol tarifi
 * sayfası; her ziyarete açık bir rezervasyon formu göstermek sayfanın
 * asıl içeriğini aşağı iter. Düğmeye dokunan kişi zaten niyetini
 * belirtmiş oluyor.
 */
export function RezervasyonKutusu({ slug }: { slug: string }) {
  const { oturum } = useOturum();
  const router = useRouter();

  const [acik, setAcik] = useState(false);
  const [kisi, setKisi] = useState(2);
  const [gun, setGun] = useState(() => gunler()[0].anahtar);
  const [secilenSaat, setSecilenSaat] = useState<string | null>(null);
  const [not, setNot] = useState("");
  const [musaitlik, setMusaitlik] = useState<Musaitlik | null>(null);
  // İlk açılışta liste zaten isteniyor: `false` başlarsa bir kare
  // boyunca "uygun saat yok" yazısı görünüyordu.
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  /**
   * ESLINT NOTU: `react-hooks/set-state-in-effect` efekt İÇİNDE senkron
   * durum güncellemesini işaretliyor ve haklı — o yüzden "yükleniyor" ile
   * "seçimi sıfırla" efektte değil, seçimi DEĞİŞTİREN yerlerde
   * (`seciminiDegistir`) yapılıyor. Efektte kalan tek güncelleme
   * `await`ten sonra, yanıt geldiğinde çalışıyor.
   */
  useEffect(() => {
    if (!acik || oturum.durum !== "girisli") return;
    let iptal = false;

    appAuthGet<Musaitlik>(
      `/api/app/rezervasyon?mekan=${encodeURIComponent(slug)}&tarih=${gun}&kisi=${kisi}`,
    ).then((yanit) => {
      if (iptal) return;
      setYukleniyor(false);
      if (yanit.ok) setMusaitlik(yanit.veri);
      else setHata(yanit.hata);
    });

    return () => {
      iptal = true;
    };
  }, [acik, oturum.durum, slug, gun, kisi]);

  /** Kişi/gün değişince eski saat seçimi ve liste artık geçerli değil. */
  function seciminiDegistir(degistir: () => void) {
    degistir();
    setSecilenSaat(null);
    setYukleniyor(true);
  }

  async function gonder() {
    if (!secilenSaat) return;
    setHata(null);
    setGonderiliyor(true);
    const yanit = await appAuthPost<{ durumMetni: string }>("/api/app/rezervasyon", {
      mekanSlug: slug,
      baslangic: secilenSaat,
      kisiSayisi: kisi,
      not: not.trim(),
    });
    setGonderiliyor(false);
    if (!yanit.ok) {
      setHata(yanit.hata);
      return;
    }
    setSonuc(yanit.veri.durumMetni);
  }

  if (sonuc) {
    return (
      <div className="rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3.5">
        <p className="text-small font-semibold text-white">Talebin iletildi</p>
        <p className="mt-1 text-caption text-gray-300">
          Mekan onayladığında profilindeki rezervasyon listesinde görünecek.
        </p>
      </div>
    );
  }

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => {
          if (oturum.durum !== "girisli") {
            router.push("/giris");
            return;
          }
          setAcik(true);
        }}
        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#24262E]/85 px-4 py-3 text-small font-semibold text-white transition active:scale-[0.99]"
      >
        <CalendarClock className="h-4 w-4 text-[#818CF8]" aria-hidden="true" />
        Masa ayırt
      </button>
    );
  }

  const saatler = musaitlik?.saatler ?? [];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#24262E]/85 p-4">
      <p className="text-small font-semibold text-white">Masa ayırt</p>
      <p className="text-caption text-gray-400">
        Talebin mekanın onayına düşer; adın ve varsa doğrulanmış numaran mekanla
        paylaşılır.
      </p>

      <Grup etiket="Kaç kişi">
        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((sayi) => (
          <Secenek
            key={sayi}
            secili={sayi === kisi}
            onClick={() => seciminiDegistir(() => setKisi(sayi))}
            metin={String(sayi)}
          />
        ))}
      </Grup>

      <Grup etiket="Hangi gün">
        {gunler().map((g) => (
          <Secenek
            key={g.anahtar}
            secili={g.anahtar === gun}
            onClick={() => seciminiDegistir(() => setGun(g.anahtar))}
            metin={g.etiket}
          />
        ))}
      </Grup>

      <Grup etiket="Saat">
        {yukleniyor ? (
          <span className="text-caption text-gray-400">Müsait saatler alınıyor…</span>
        ) : saatler.length === 0 ? (
          <span className="text-caption text-gray-400">
            Bu gün için uygun saat yok. Başka bir gün seçebilir ya da mekanı
            arayabilirsin.
          </span>
        ) : (
          saatler.map((s) => (
            <Secenek
              key={s.baslangic}
              secili={s.baslangic === secilenSaat}
              onClick={() => setSecilenSaat(s.baslangic)}
              metin={s.etiket}
            />
          ))
        )}
      </Grup>

      <label className="flex flex-col gap-1.5">
        <span className="text-caption text-gray-400">Not (isteğe bağlı)</span>
        <textarea
          value={not}
          onChange={(e) => setNot(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Doğum günü kutlaması, bahçe tarafı olursa seviniriz."
          className="rounded-xl border border-white/10 bg-[#18191E] px-3 py-2 text-small text-white placeholder:text-gray-500"
        />
      </label>

      {hata ? (
        <p className="text-caption text-[#F87171]" role="alert">
          {hata}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void gonder()}
        disabled={!secilenSaat || gonderiliyor}
        className="rounded-xl bg-[#FF6B4A] px-4 py-3 text-small font-semibold text-white disabled:opacity-50"
      >
        {gonderiliyor ? "Gönderiliyor…" : "Rezervasyon iste"}
      </button>
    </div>
  );
}

function Grup({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption text-gray-400">{etiket}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Secenek({
  metin,
  secili,
  onClick,
}: {
  metin: string;
  secili: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={secili}
      className={`rounded-full px-3 py-1.5 text-caption font-medium transition ${
        secili
          ? "bg-[#FF6B4A] text-white"
          : "border border-white/10 bg-[#18191E] text-gray-200"
      }`}
    >
      {metin}
    </button>
  );
}

/** Önümüzdeki 14 gün — mobil şeridiyle aynı pencere. */
function gunler(): { anahtar: string; etiket: string }[] {
  const adlar = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const p = (n: number) => String(n).padStart(2, "0");
  const bugun = new Date();

  return Array.from({ length: 14 }, (_, i) => {
    const t = new Date(bugun);
    t.setDate(t.getDate() + i);
    return {
      anahtar: `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`,
      etiket: i === 0 ? "Bugün" : i === 1 ? "Yarın" : `${adlar[t.getDay()]} ${t.getDate()}`,
    };
  });
}
