"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOturum } from "../../lib/OturumSaglayici";
import { Alan, AnaDugme, Hata } from "../../components/Form";

export default function GirisPage() {
  const router = useRouter();
  const { girisYap } = useOturum();
  const [username, setUsername] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setGonderiliyor(true);
    try {
      const response = await fetch("/api/app/giris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sifre }),
      });
      const govde = await response.json();
      if (!response.ok) {
        setHata(govde.hata ?? "Giriş yapılamadı.");
        return;
      }
      girisYap(govde.jeton, govde.kullanici);
      router.push("/kesfet");
    } catch {
      setHata("Bağlantı kurulamadı. İnternetini kontrol et.");
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Tekrar hoş geldin</h1>
      <p className="mt-1 text-small text-gray-400">
        Şehrindeki mekanları keşfetmeye devam et.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Alan
          id="giris-kullanici"
          etiket="Kullanıcı adı"
          tur="girisKimligi"
          zorunlu
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={gonderiliyor}
        />
        <Alan
          id="giris-sifre"
          etiket="Şifre"
          tur="girisSifresi"
          zorunlu
          autoComplete="current-password"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          disabled={gonderiliyor}
        />

        {/**
         * Bağlantı formun İÇİNDE ve şifre alanının hemen altında: şifresini
         * hatırlamadığını anladığı an tam burası. Formun dışına, sayfanın
         * en altına konsaydı, hata mesajını gören kullanıcı onu aramak
         * yerine aynı şifreyi tekrar denerdi.
         */}
        <Link
          href="/sifremi-unuttum"
          className="-mt-1 self-start text-caption font-medium text-[#818CF8]"
        >
          Şifremi unuttum
        </Link>

        <Hata mesaj={hata} />

        <AnaDugme bekliyor={gonderiliyor} bekleyenMetin="Giriş yapılıyor…">
          Giriş yap
        </AnaDugme>
      </form>

      <p className="mt-6 text-center text-small text-gray-400">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-[#818CF8]">
          Ücretsiz kaydol
        </Link>
      </p>
    </div>
  );
}
