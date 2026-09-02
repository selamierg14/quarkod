"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOturum } from "../../lib/OturumSaglayici";

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
      <p className="mt-1 text-small text-slate-400">
        Şehrindeki mekanları keşfetmeye devam et.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-slate-300">Kullanıcı adı</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="rounded-control border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-[#6366F1]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-slate-300">Şifre</span>
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            autoComplete="current-password"
            required
            className="rounded-control border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-[#6366F1]"
          />
        </label>

        {hata ? <p className="text-small text-[#FF5A36]">{hata}</p> : null}

        <button
          type="submit"
          disabled={gonderiliyor}
          className="mt-2 rounded-control bg-[#6366F1] px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {gonderiliyor ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>

      <p className="mt-6 text-center text-small text-slate-400">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-[#818CF8]">
          Ücretsiz kaydol
        </Link>
      </p>
    </div>
  );
}
