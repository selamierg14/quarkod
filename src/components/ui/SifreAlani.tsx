"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { alanOzellikleri } from "@/lib/cekirdek/desenler";

/**
 * Yöneticinin başkası için belirlediği şifre (yeni kullanıcı, sıfırlama).
 *
 * Önceden alan bilerek `type="text"`'ti — "yönetici şifreyi kullanıcıya
 * iletecek" diye. QA haklı olarak işaretledi: omzunun üstünden bakan,
 * ekran paylaşımı, ekran görüntüsü. Artık varsayılan gizli; göz düğmesi
 * açıyor. "Üret" tahmin edilemez bir şifre koyup GÖSTERİYOR, çünkü o anda
 * yöneticinin onu okuyup iletmesi gerekiyor.
 */
export function SifreAlani({
  name = "password",
  className,
  placeholder = "en az 8 karakter",
}: {
  name?: string;
  className: string;
  placeholder?: string;
}) {
  const [gorunur, setGorunur] = useState(false);
  // Kontrolsüz: form başarıdan sonra `reset()` edildiğinde (KorunanForm)
  // şifre de temizlensin. Kontrollü olsaydı React durumu eski değeri tutardı.
  const alan = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-1.5">
      <input
        name={name}
        {...alanOzellikleri("sifre")}
        type={gorunur ? "text" : "password"}
        autoComplete="new-password"
        ref={alan}
        placeholder={placeholder}
        className={`${className} min-w-0 flex-1 font-mono`}
      />
      <button
        type="button"
        onClick={() => setGorunur((v) => !v)}
        aria-label={gorunur ? "Şifreyi gizle" : "Şifreyi göster"}
        aria-pressed={gorunur}
        title={gorunur ? "Gizle" : "Göster"}
        className="flex w-9 shrink-0 items-center justify-center rounded-chip border border-line bg-surface text-ink-muted hover:bg-canvas hover:text-ink"
      >
        {gorunur ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          if (alan.current) alan.current.value = sifreUret();
          setGorunur(true);
        }}
        title="Güçlü bir şifre üret"
        className="flex shrink-0 items-center gap-1 rounded-chip border border-line bg-surface px-2.5 text-caption text-ink-soft hover:bg-canvas hover:text-ink"
      >
        <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
        Üret
      </button>
    </div>
  );
}

/**
 * 12 karakter, karışması kolay olanlar çıkarılmış (0/O, 1/l/I): şifre
 * çoğu zaman sesli ya da mesajla iletiliyor. `crypto.getRandomValues` —
 * Math.random tahmin edilebilir.
 */
const ALFABE = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function sifreUret(uzunluk = 12): string {
  const rastgele = new Uint32Array(uzunluk);
  crypto.getRandomValues(rastgele);
  let sonuc = "";
  for (const sayi of rastgele) sonuc += ALFABE[sayi % ALFABE.length];
  // En az bir harf ve bir rakam: sunucu yalnızca rakamdan oluşan şifreyi
  // reddediyor, rakamsız şifre de okuyup iletirken daha çok karışıyor.
  if (!/\d/.test(sonuc)) sonuc = sonuc.slice(0, -1) + "7";
  if (!/[a-zA-Z]/.test(sonuc)) sonuc = "k" + sonuc.slice(1);
  return sonuc;
}
