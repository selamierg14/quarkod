"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { appAuthGet, appAuthPost } from "../../../lib/api-istemci";
import { useOturum } from "../../../lib/OturumSaglayici";
import { Alan, AnaDugme, Bilgi, Hata } from "../../../components/Form";
import { KartListesiIskeleti } from "../../../components/Skeleton";

/**
 * Oturum İÇİNDE şifre değiştirme — mevcut şifre + SMS kodu.
 *
 * Neden kod da isteniyor: açık bırakılmış bir telefonu eline geçiren kişi,
 * yalnızca "yeni şifre" soran bir ekranla hesabı tek dokunuşta devralır.
 *
 * NUMARASI OLMAYAN KULLANICI NUMARASINI BURADA VERİYOR. Ayrı bir "kurtarma
 * numarası ekle" ekranı bilerek yok: kimse profil ayarlarına girip kendi
 * isteğiyle telefon numarası bırakmaz, kurtarma kanalı da kağıt üzerinde
 * kalırdı. Numarayı istemek için doğru an, kullanıcının zaten hesabının
 * güvenliğiyle ilgilendiği an — yani burası. Kod o numaraya gidiyor ve
 * doğrulandığında numara "doğrulanmış" olarak kaydediliyor; böylece bir
 * dahaki sefere şifresini unutursa hesabını geri alabiliyor.
 */

type Adim = "kimlik" | "kod" | "bitti";

export function SifreDegistirIcerik() {
  const router = useRouter();
  const { oturum, cikisYap } = useOturum();

  /** null: henüz bilinmiyor. `{maskeli: null}`: numara yok. */
  const [kayitli, setKayitli] = useState<{ maskeli: string | null } | null>(null);
  const [adim, setAdim] = useState<Adim>("kimlik");
  const [mevcutSifre, setMevcutSifre] = useState("");
  const [telefon, setTelefon] = useState("");
  const [maskeli, setMaskeli] = useState<string | null>(null);
  const [kod, setKod] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    if (oturum.durum !== "girisli") return;
    let iptal = false;
    appAuthGet<{ maskeli: string | null }>("/api/app/telefon").then((sonuc) => {
      if (iptal) return;
      // Sorgu düşerse akış yine de yürüsün: numara alanı gösterilir, sunucu
      // kayıtlı numara varsa onu zaten yok sayıyor.
      setKayitli(sonuc.ok ? sonuc.veri : { maskeli: null });
    });
    return () => {
      iptal = true;
    };
  }, [oturum.durum]);

  async function kodIste(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    const sonuc = await appAuthPost<{ maskeli: string; yeniNumaraMi: boolean }>(
      "/api/app/sifre-degistir",
      { mevcutSifre, telefon },
    );
    setBekliyor(false);
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    setMaskeli(sonuc.veri.maskeli);
    setAdim("kod");
  }

  async function sifreyiDegistir(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    const sonuc = await appAuthPost<{ degistirildi: boolean }>(
      "/api/app/sifre-degistir",
      { kod, yeniSifre, telefon },
      "PUT",
    );
    setBekliyor(false);
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    // Şifre değişince bu jeton da geçersiz — elde tutmanın anlamı yok.
    // Sessizce 401'e düşüp "bir şeyler ters gitti" demektense burada
    // temiz bir çıkış yapılıyor.
    cikisYap();
    setAdim("bitti");
  }

  if (oturum.durum === "yukleniyor" || (oturum.durum === "girisli" && kayitli === null)) {
    return <KartListesiIskeleti />;
  }

  if (oturum.durum === "cikisli" && adim !== "bitti") {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <p className="text-small text-gray-300">
          Şifreni değiştirmek için giriş yapmalısın.
        </p>
        <a
          href="/giris"
          className="mt-3 inline-block rounded-control bg-[#6366F1] px-5 py-2.5 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          Giriş yap
        </a>
      </div>
    );
  }

  if (adim === "bitti") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#24262E]/85 p-6 text-center">
        <ShieldCheck className="h-8 w-8 text-[#34D399]" aria-hidden="true" />
        <h1 className="text-lg font-bold text-white">Şifren değişti</h1>
        <p className="text-small text-gray-300">
          Güvenlik için tüm oturumların kapatıldı. Yeni şifrenle tekrar giriş yap.
        </p>
        <button
          type="button"
          onClick={() => router.push("/giris")}
          className="mt-2 w-full rounded-control bg-[#6366F1] px-5 py-3 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          Giriş yap
        </button>
      </div>
    );
  }

  const numarasiVar = kayitli?.maskeli != null;

  if (adim === "kod") {
    return (
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-white">Kodu gir</h1>
        <Bilgi>{maskeli} numarasına 6 haneli bir kod gönderdik.</Bilgi>

        <form onSubmit={sifreyiDegistir} className="mt-6 flex flex-col gap-4">
          <Alan
            id="kod"
            etiket="SMS kodu"
            tur="dogrulamaKodu"
            zorunlu
            value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            disabled={bekliyor}
          />
          <Alan
            id="yeni-sifre"
            etiket="Yeni şifre"
            tur="sifre"
            zorunlu
            autoComplete="new-password"
            value={yeniSifre}
            onChange={(e) => setYeniSifre(e.target.value)}
            disabled={bekliyor}
            ipucu="En az 8 karakter."
          />

          <Hata mesaj={hata} />

          <AnaDugme bekliyor={bekliyor} bekleyenMetin="Değiştiriliyor…">
            Şifremi değiştir
          </AnaDugme>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-lg font-bold text-white">Şifre değiştir</h1>
      <p className="text-small text-gray-400">
        {numarasiVar
          ? `Onay kodunu ${kayitli?.maskeli} numarasına göndereceğiz.`
          : "Hesabında kurtarma numarası yok. Bir cep telefonu ekle: onay kodu " +
            "oraya gelecek ve şifreni bir daha unutursan hesabını bu numarayla " +
            "geri alabileceksin."}
      </p>

      <form onSubmit={kodIste} className="mt-6 flex flex-col gap-4">
        <Alan
          id="mevcut-sifre"
          etiket="Mevcut şifren"
          tur="girisSifresi"
          zorunlu
          autoComplete="current-password"
          value={mevcutSifre}
          onChange={(e) => setMevcutSifre(e.target.value)}
          disabled={bekliyor}
        />

        {!numarasiVar ? (
          <Alan
            id="telefon"
            etiket="Cep telefonun"
            tur="telefon"
            zorunlu
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="0532 123 45 67"
            disabled={bekliyor}
            ipucu="Yalnızca hesap kurtarma için kullanılır."
          />
        ) : null}

        <Hata mesaj={hata} />

        <AnaDugme bekliyor={bekliyor} bekleyenMetin="Gönderiliyor…">
          Kod gönder
        </AnaDugme>
      </form>
    </div>
  );
}
