"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOturum } from "../../lib/OturumSaglayici";

/**
 * `?ref=KOD` ile açılırsa davet kodu alanı önceden doludur — arkadaşının
 * paylaştığı linke tıklayan kişi kodu elle yazmak zorunda kalmaz. Yine de
 * değiştirilebilir: belki farklı bir arkadaşının kodunu hatırlıyordur.
 */
function KayitFormu() {
  const router = useRouter();
  const { girisYap } = useOturum();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [sifre, setSifre] = useState("");
  const [davetKodu, setDavetKodu] = useState(searchParams.get("ref")?.toUpperCase() ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setGonderiliyor(true);
    try {
      const response = await fetch("/api/app/kayit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, sifre, davetKodu }),
      });
      const govde = await response.json();
      if (!response.ok) {
        setHata(govde.hata ?? "Kayıt oluşturulamadı.");
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
      <h1 className="text-2xl font-bold text-white">Biyerlere&apos;ye katıl</h1>
      <p className="mt-1 text-small text-gray-400">
        Ücretsiz kaydol, puan biriktir, rozet ve kupon kazan.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-gray-300">Adın</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="rounded-control border border-white/15 bg-[#24262E] px-4 py-3 text-white outline-none focus:border-[#6366F1]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-gray-300">Kullanıcı adı</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoComplete="username"
            required
            className="rounded-control border border-white/15 bg-[#24262E] px-4 py-3 text-white outline-none focus:border-[#6366F1]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-gray-300">Şifre</span>
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            autoComplete="new-password"
            required
            className="rounded-control border border-white/15 bg-[#24262E] px-4 py-3 text-white outline-none focus:border-[#6366F1]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-gray-300">
            Davet kodu <span className="text-gray-400">(isteğe bağlı)</span>
          </span>
          <input
            value={davetKodu}
            onChange={(e) => setDavetKodu(e.target.value.toUpperCase())}
            placeholder="Bir arkadaşın davet etti mi?"
            className="rounded-control border border-white/15 bg-[#24262E] px-4 py-3 text-white outline-none placeholder:text-gray-400 focus:border-[#6366F1]"
          />
        </label>

        {hata ? <p className="text-small text-[#FF6B4A]">{hata}</p> : null}

        <button
          type="submit"
          disabled={gonderiliyor}
          className="mt-2 rounded-control bg-[#6366F1] px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.97] duration-150 ease-out disabled:opacity-60"
        >
          {gonderiliyor ? "Kaydolunuyor…" : "Ücretsiz kaydol"}
        </button>
      </form>

      <p className="mt-6 text-center text-small text-gray-400">
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className="font-semibold text-[#818CF8]">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}

export default function KayitPage() {
  return (
    <Suspense>
      <KayitFormu />
    </Suspense>
  );
}
