"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appAuthPost } from "../../lib/api-istemci";
import { Alan, AnaDugme, Bilgi, Hata } from "../../components/Form";

/**
 * "Şifremi unuttum" — dört ekran:
 *
 *   kimlik  → kullanıcı adı
 *   kod     → SMS kodu (yalnızca kod; şifre burada sorulmuyor)
 *   sifre   → yeni şifre, iki kez
 *   bitti   → giriş ekranına dönüş
 *
 * Bu ekran olmadan şifresini unutan kişi hesabını KALICI olarak
 * kaybediyordu; puanı, rozetleri ve ziyaret geçmişi onunla birlikte.
 *
 * KOD İLE ŞİFRE NEDEN AYRI EKRANDA: ikisi bir aradayken kullanıcı altı
 * haneyi yazarken kodun doğru olup olmadığını öğrenemiyordu. Yanlış kodu
 * ancak yeni şifresini de yazıp gönderdikten sonra fark ediyor, dönen
 * hatayla birlikte iki alanı birden yeniden dolduruyordu. Ayrıldığında
 * kod adımı kendi geri bildirimini veriyor; şifre ekranına gelen kişi
 * doğrulanmış demektir.
 *
 * İKİNCİ ADIMA HER DURUMDA GEÇİLİYOR. Sunucu "böyle bir kullanıcı yok",
 * "numarası yok" ve "numarası doğrulanmamış" durumlarının üçüne de aynı
 * yanıtı veriyor; arayüz de öyle davranmalı. Aksi halde bu ekran, bir
 * kullanıcı adının kayıtlı olup olmadığını sorgulama aracına dönerdi:
 * yazıp "kod gönderildi" görürsen kayıtlı, hata görürsen değil.
 */

type Adim = "kimlik" | "kod" | "sifre" | "bitti";

export default function SifremiUnuttumPage() {
  const router = useRouter();
  const [adim, setAdim] = useState<Adim>("kimlik");
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [kod, setKod] = useState("");
  const [bilet, setBilet] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  /** Adım 1 — kullanıcı adı. */
  async function kodIste(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    const sonuc = await appAuthPost("/api/app/sifre-kurtar", { kullaniciAdi });
    setBekliyor(false);

    // Hız sınırı (429) ve biçim hatası (400) gerçek hatalar — gösteriliyor.
    // Bunun dışında sonuç ne olursa olsun ikinci adıma geçiliyor.
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    setAdim("kod");
  }

  /** Adım 2 — kodu doğrula, bileti al. */
  async function kodDogrula(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    const sonuc = await appAuthPost<{ bilet: string }>(
      "/api/app/sifre-kurtar",
      { kullaniciAdi, kod },
      "PUT",
    );
    setBekliyor(false);

    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    setBilet(sonuc.veri.bilet);
    setAdim("sifre");
  }

  /** Adım 3 — yeni şifre (iki kez). */
  async function sifreyiYaz(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);

    // Sunucu da aynı kontrolü yapıyor; buradaki yalnızca daha hızlı ve
    // gereksiz bir ağ turunu önlüyor.
    if (yeniSifre !== yeniSifreTekrar) {
      setHata("Şifreler birbiriyle uyuşmuyor.");
      return;
    }

    setBekliyor(true);
    const sonuc = await appAuthPost<{ degistirildi: boolean }>(
      "/api/app/sifre-kurtar",
      { bilet, yeniSifre, yeniSifreTekrar },
      "PATCH",
    );
    setBekliyor(false);

    if (!sonuc.ok) {
      setHata(sonuc.hata);
      return;
    }
    setAdim("bitti");
  }

  if (adim === "bitti") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Şifren değişti</h1>
        <p className="mt-1 text-small text-gray-400">
          Yeni şifrenle giriş yapabilirsin. Açık kalmış diğer oturumların
          güvenlik için kapatıldı.
        </p>
        <button
          type="button"
          onClick={() => router.push("/giris")}
          className="mt-8 w-full rounded-control bg-[#6366F1] px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          Giriş yap
        </button>
      </div>
    );
  }

  if (adim === "sifre") {
    const uyusmazlik = yeniSifreTekrar.length > 0 && yeniSifre !== yeniSifreTekrar;

    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Yeni şifreni belirle</h1>
        <p className="mt-1 text-small text-gray-400">
          Kodun doğrulandı. Yeni şifreni iki kez yaz.
        </p>

        <form onSubmit={sifreyiYaz} className="mt-8 flex flex-col gap-4">
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

          <AnaDugme
            bekliyor={bekliyor}
            bekleyenMetin="Kaydediliyor…"
            disabled={uyusmazlik}
          >
            Şifremi kaydet
          </AnaDugme>
        </form>
      </div>
    );
  }

  if (adim === "kod") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Kodu gir</h1>
        <Bilgi>
          {/**
           * Numara BURADA GÖSTERİLMİYOR — "kod +90 5•• ••• 99 11'e gitti"
           * demek, girilen kullanıcı adının kayıtlı olduğunu söylemek
           * olurdu. Bu ekranı açan kişinin hesabın sahibi olduğuna dair
           * henüz hiçbir kanıt yok; kanıt zaten koda ulaşabilmesi.
           */}
          Kullanıcı adına kayıtlı doğrulanmış bir numara varsa 6 haneli kodu o
          numaraya gönderdik. Kod 3 dakika geçerli.
        </Bilgi>

        <form onSubmit={kodDogrula} className="mt-8 flex flex-col gap-4">
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

          <Hata mesaj={hata} />

          <AnaDugme bekliyor={bekliyor} bekleyenMetin="Doğrulanıyor…">
            Kodu doğrula
          </AnaDugme>
        </form>

        <p className="mt-6 text-center text-caption text-gray-400">
          Kod gelmediyse hesabında doğrulanmış bir numara olmayabilir.{" "}
          <button
            type="button"
            onClick={() => {
              setAdim("kimlik");
              setHata(null);
              setKod("");
            }}
            className="font-semibold text-[#818CF8] underline underline-offset-2"
          >
            Kullanıcı adını düzelt
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Şifreni mi unuttun?</h1>
      <p className="mt-1 text-small text-gray-400">
        Kullanıcı adını yaz; hesabına kayıtlı numaraya bir kod gönderelim.
      </p>

      <form onSubmit={kodIste} className="mt-8 flex flex-col gap-4">
        <Alan
          id="kullanici-adi"
          etiket="Kullanıcı adı"
          tur="girisKimligi"
          zorunlu
          autoComplete="username"
          value={kullaniciAdi}
          onChange={(e) => setKullaniciAdi(e.target.value.toLowerCase())}
          disabled={bekliyor}
        />

        <Hata mesaj={hata} />

        <AnaDugme bekliyor={bekliyor} bekleyenMetin="Gönderiliyor…">
          Kod gönder
        </AnaDugme>
      </form>

      <p className="mt-6 text-center text-small text-gray-400">
        Hatırladın mı?{" "}
        <Link href="/giris" className="font-semibold text-[#818CF8]">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
