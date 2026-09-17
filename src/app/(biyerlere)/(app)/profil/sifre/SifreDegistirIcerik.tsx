"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { appAuthGet, appAuthPost } from "../../../lib/api-istemci";
import { useOturum } from "../../../lib/OturumSaglayici";
import { Alan, AnaDugme, Bilgi, Hata } from "../../../components/Form";
import { KartListesiIskeleti } from "../../../components/Skeleton";

/**
 * Hesap güvenliği ekranı — iki ayrı iş, tek sayfa.
 *
 *   1. ŞİFRE DEĞİŞTİRME: mevcut şifre + yeni şifre (iki kez). SMS yok;
 *      kimlik kanıtı mevcut şifrenin kendisi.
 *   2. KURTARMA NUMARASI: numarayı ekleme/doğrulama. Burada SMS ŞART,
 *      çünkü doğrulamanın tanımı "koda o numaradan ulaşabilmek".
 *
 * İkisinin aynı sayfada ama ayrı formlarda olması bilinçli. Bir süre tek
 * akışta birleşiktiler — şifre değiştirmek için SMS kodu isteniyor, numarası
 * olmayan kullanıcı numarasını o sırada veriyordu. Sadeleşince şifre
 * değiştirme SMS'siz kaldı ve numara toplama yeri kalmadı; oysa
 * "şifremi unuttum" akışının çalışması DOĞRULANMIŞ bir numaraya bağlı.
 * Numarası olmayan kullanıcı için o akış hiç açılmıyor.
 *
 * Bu yüzden numara bölümü burada duruyor: ayrı bir "kurtarma numarası ekle"
 * ekranı değil, kullanıcının zaten hesabının güvenliğine baktığı sayfanın
 * bir bölümü.
 */
export function SifreDegistirIcerik() {
  const router = useRouter();
  const { oturum, cikisYap } = useOturum();

  const [mevcutSifre, setMevcutSifre] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [bitti, setBitti] = useState(false);

  const uyusmazlik = yeniSifreTekrar.length > 0 && yeniSifre !== yeniSifreTekrar;

  async function sifreyiDegistir(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);

    // Sunucu da aynı kontrolü yapıyor; buradaki gereksiz bir ağ turunu
    // önlüyor.
    if (yeniSifre !== yeniSifreTekrar) {
      setHata("Şifreler birbiriyle uyuşmuyor.");
      return;
    }

    setBekliyor(true);
    const sonuc = await appAuthPost<{ degistirildi: boolean }>("/api/app/sifre-degistir", {
      mevcutSifre,
      yeniSifre,
      yeniSifreTekrar,
    });
    setBekliyor(false);

    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }

    // Şifre değişince bu jeton da geçersiz — elde tutmanın anlamı yok.
    // Sessizce 401'e düşüp "bir şeyler ters gitti" demektense burada
    // temiz bir çıkış yapılıyor.
    cikisYap();
    setBitti(true);
  }

  if (oturum.durum === "yukleniyor") return <KartListesiIskeleti />;

  if (bitti) {
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

  if (oturum.durum === "cikisli") {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <p className="text-small text-gray-300">Şifreni değiştirmek için giriş yapmalısın.</p>
        <a
          href="/giris"
          className="mt-3 inline-block rounded-control bg-[#6366F1] px-5 py-2.5 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          Giriş yap
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-lg font-bold text-white">Şifre değiştir</h1>
        <p className="mt-1 text-small text-gray-400">
          Güvenlik için mevcut şifreni de soruyoruz.
        </p>

        <form onSubmit={sifreyiDegistir} className="mt-6 flex flex-col gap-4">
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
          <Alan
            id="yeni-sifre-tekrar"
            etiket="Yeni şifre (tekrar)"
            tur="sifre"
            zorunlu
            autoComplete="new-password"
            value={yeniSifreTekrar}
            onChange={(e) => setYeniSifreTekrar(e.target.value)}
            disabled={bekliyor}
            aria-invalid={uyusmazlik || undefined}
            ipucu={
              uyusmazlik ? (
                <span role="alert" className="text-[#FF6B4A]">
                  İki şifre birbiriyle uyuşmuyor.
                </span>
              ) : undefined
            }
          />

          <Hata mesaj={hata} />

          <AnaDugme bekliyor={bekliyor} bekleyenMetin="Değiştiriliyor…" disabled={uyusmazlik}>
            Şifreyi değiştir
          </AnaDugme>
        </form>
      </section>

      <KurtarmaNumarasi />

      <HesabiSil
        onSilindi={() => {
          cikisYap();
          router.push("/kesfet");
        }}
      />
    </div>
  );
}

/**
 * Kurtarma numarası — şifresini unutursa hesabını geri alabilmesinin tek yolu.
 *
 * İki adım: numara girilir, o numaraya kod gider; kod doğrulanınca numara
 * DOĞRULANMIŞ olarak kaydedilir. Doğrulanmamış numara kaydedilmiyor, çünkü
 * kurtarma için işe yaramaz: yazım hatası varsa kullanıcı yine kilitli
 * kalır ve daha kötüsü, numara yanlışlıkla başkasınınsa o kişi hesabı
 * devralır.
 */
function KurtarmaNumarasi() {
  /** null: henüz okunmadı. `{maskeli: null}`: kayıtlı numara yok. */
  const [kayitli, setKayitli] = useState<{ maskeli: string | null } | null>(null);
  const [adim, setAdim] = useState<"numara" | "kod">("numara");
  const [telefon, setTelefon] = useState("");
  /**
   * Numarayı değiştirmek, şifreyi değiştirmekle aynı güçte bir yetki:
   * kurtarma numarasını eline geçiren kişi "şifremi unuttum" ile hesabı
   * devralabiliyor. Bu yüzden burada da mevcut şifre soruluyor.
   */
  const [mevcutSifre, setMevcutSifre] = useState("");
  const [maskeli, setMaskeli] = useState("");
  const [kod, setKod] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    let iptal = false;
    appAuthGet<{ maskeli: string | null }>("/api/app/telefon").then((sonuc) => {
      if (!iptal) setKayitli(sonuc.ok ? sonuc.veri : { maskeli: null });
    });
    return () => {
      iptal = true;
    };
  }, []);

  async function kodIste(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBilgi(null);
    setBekliyor(true);
    const sonuc = await appAuthPost<{ maskeli: string }>("/api/app/telefon", {
      telefon,
      mevcutSifre,
    });
    setBekliyor(false);
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    setMaskeli(sonuc.veri.maskeli);
    setAdim("kod");
  }

  async function kodDogrula(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    const sonuc = await appAuthPost<{ telefon: string }>(
      "/api/app/telefon",
      { telefon, kod },
      "PUT",
    );
    setBekliyor(false);
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    setKayitli({ maskeli: sonuc.veri.telefon });
    setAdim("numara");
    setTelefon("");
    setKod("");
    setMevcutSifre("");
    setBilgi("Numaran doğrulandı ve kaydedildi.");
  }

  if (kayitli === null) return null;

  return (
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-base font-bold text-white">Kurtarma numarası</h2>

      {kayitli.maskeli ? (
        <>
          <p className="mt-1 text-small text-gray-400">
            Şifreni unutursan hesabını{" "}
            <span className="text-white">{kayitli.maskeli}</span> numarasıyla geri
            alabilirsin.
          </p>
          {bilgi ? <Bilgi>{bilgi}</Bilgi> : null}
          <button
            type="button"
            onClick={() => {
              setAdim("numara");
              setKayitli({ maskeli: null });
              setBilgi(null);
            }}
            className="mt-3 text-caption font-semibold text-[#818CF8] underline underline-offset-2"
          >
            Numarayı değiştir
          </button>
        </>
      ) : adim === "kod" ? (
        <>
          <Bilgi>{maskeli} numarasına 6 haneli bir kod gönderdik. Kod 3 dakika geçerli.</Bilgi>
          <form onSubmit={kodDogrula} className="mt-4 flex flex-col gap-4">
            <Alan
              id="telefon-kod"
              etiket="SMS kodu"
              tur="dogrulamaKodu"
              zorunlu
              value={kod}
              onChange={(e) => setKod(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              disabled={bekliyor}
            />
            <Hata mesaj={hata} />
            <AnaDugme bekliyor={bekliyor} bekleyenMetin="Doğrulanıyor…">
              Numaramı doğrula
            </AnaDugme>
          </form>
        </>
      ) : (
        <>
          <p className="mt-1 text-small text-gray-400">
            Hesabında kurtarma numarası yok. Şifreni unutursan hesabını geri
            almanın başka bir yolu olmayacak.
          </p>
          <form onSubmit={kodIste} className="mt-4 flex flex-col gap-4">
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
            <Alan
              id="numara-mevcut-sifre"
              etiket="Mevcut şifren"
              tur="girisSifresi"
              zorunlu
              autoComplete="current-password"
              value={mevcutSifre}
              onChange={(e) => setMevcutSifre(e.target.value)}
              disabled={bekliyor}
            />
            <Hata mesaj={hata} />
            <AnaDugme bekliyor={bekliyor} bekleyenMetin="Gönderiliyor…">
              Kod gönder
            </AnaDugme>
          </form>
        </>
      )}
    </section>
  );
}

/**
 * Hesabı kalıcı silme.
 *
 * İKİ AŞAMALI: önce yalnızca açıklayıcı bir düğme, basılınca şifre alanı
 * ve kırmızı onay. Geri alınamayan tek işlem bu; sayfanın en altında, tek
 * dokunuşla ulaşılamayacak yerde duruyor. Şifre sunucuda da doğrulanıyor
 * (bkz. api/app/hesap).
 */
function HesabiSil({ onSilindi }: { onSilindi: () => void }) {
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function sil(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    const sonuc = await appAuthPost<{ silindi: boolean }>(
      "/api/app/hesap",
      { mevcutSifre: sifre },
      "DELETE",
    );
    setBekliyor(false);
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    onSilindi();
  }

  return (
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-base font-bold text-white">Hesabı sil</h2>
      <p className="mt-1 text-small text-gray-400">
        Puanların, rozetlerin, ziyaret geçmişin, favorilerin ve açtığın buluşmalar kalıcı olarak
        silinir. Bu işlem geri alınamaz.
      </p>

      {!acik ? (
        <button
          type="button"
          onClick={() => setAcik(true)}
          className="mt-4 rounded-control border border-[#FF6B4A]/40 px-4 py-2.5 text-small font-semibold text-[#FF6B4A] transition active:scale-[0.97] duration-150 ease-out"
        >
          Hesabımı silmek istiyorum
        </button>
      ) : (
        <form onSubmit={sil} className="mt-4 flex flex-col gap-4">
          <Alan
            id="hesap-sil-sifre"
            etiket="Onaylamak için şifreni yaz"
            tur="girisSifresi"
            zorunlu
            autoComplete="current-password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            disabled={bekliyor}
          />
          <Hata mesaj={hata} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setAcik(false);
                setSifre("");
                setHata(null);
              }}
              disabled={bekliyor}
              className="flex-1 rounded-control border border-white/15 px-4 py-3 text-small font-semibold text-gray-200"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={bekliyor || sifre.length === 0}
              className="flex-1 rounded-control bg-[#FF6B4A] px-4 py-3 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out disabled:opacity-60"
            >
              {bekliyor ? "Siliniyor…" : "Kalıcı olarak sil"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
