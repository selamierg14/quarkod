"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { alanOzellikleri, type AlanTuru } from "@/lib/cekirdek/desenler";

/**
 * Biyerlere formlarının ortak parçaları.
 *
 * Giriş, kayıt, şifre kurtarma ve şifre değiştirme ekranları aynı üç şeyi
 * tekrarlıyordu: etiketli bir alan, bekleyen durumu olan bir ana düğme ve
 * bir hata satırı. Her biri ~6 satırlık bir className taşıyordu ve
 * kopyalar kaçınılmaz olarak ayrışıyordu — bir ekranda `disabled` varken
 * diğerinde yoktu, birinde hata `role="alert"` ile duyuruluyordu diğerinde
 * sessizce beliriyordu.
 *
 * `tur` verildiğinde alan biçim kurallarını `lib/cekirdek/desenler.ts`ten
 * alıyor: tarayıcı geçersiz değeri formu göndermeden reddediyor, sunucu da
 * AYNI desenle yeniden doğruluyor (nitelikler silinebilir; güvenlik sınırı
 * her zaman sunucu).
 */

type AlanProps = {
  etiket: string;
  /** Desen kaydındaki tür — nitelikler buradan geliyor. */
  tur?: AlanTuru;
  zorunlu?: boolean;
  /** Alanın altında görünen açıklama; `aria-describedby` ile bağlanıyor. */
  ipucu?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function Alan({ etiket, tur, zorunlu, ipucu, id, ...girdi }: AlanProps) {
  const nitelikler = tur ? alanOzellikleri(tur, { zorunlu }) : {};
  const ipucuId = ipucu && id ? `${id}-ipucu` : undefined;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-gray-300">{etiket}</span>
      <input
        id={id}
        aria-describedby={ipucuId}
        {...nitelikler}
        {...girdi}
        className={`rounded-control border border-white/15 bg-[#24262E] px-4 py-3 text-white outline-none placeholder:text-gray-400 focus:border-[#6366F1] disabled:opacity-60 ${
          girdi.className ?? ""
        }`}
      />
      {ipucu ? (
        <span id={ipucuId} className="text-caption text-gray-400">
          {ipucu}
        </span>
      ) : null}
    </label>
  );
}

export function AnaDugme({
  bekliyor,
  bekleyenMetin,
  children,
  ...dugme
}: {
  bekliyor?: boolean;
  /** Bekleyen durumda yazılacak metin — "Gönderiliyor…" gibi. */
  bekleyenMetin?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      // Serpme ÖNCE, hesaplanan nitelikler SONRA: tersi olsaydı çağıranın
      // hiç vermediği bir `disabled` (yani `undefined`) aşağıdaki hesabı
      // ezer ve düğme beklerken de tıklanabilir kalırdı.
      {...dugme}
      type={dugme.type ?? "submit"}
      // Çift gönderimi engelleyen yer burası. Şifre değiştirme gibi
      // akışlarda ikinci tıklama ikinci bir SMS demek.
      disabled={bekliyor || dugme.disabled}
      aria-busy={bekliyor || undefined}
      className={`mt-2 rounded-control bg-[#6366F1] px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.97] duration-150 ease-out disabled:opacity-60 ${
        dugme.className ?? ""
      }`}
    >
      {bekliyor && bekleyenMetin ? bekleyenMetin : children}
    </button>
  );
}

/**
 * Hata satırı.
 *
 * `role="alert"` şart: ekran okuyucu kullanan biri, formun altında sessizce
 * beliren kırmızı yazıyı fark edemez — odak hâlâ gönder düğmesindedir ve
 * hiçbir şey olmamış gibi görünür.
 */
export function Hata({ mesaj }: { mesaj: string | null }) {
  if (!mesaj) return null;
  return (
    <p role="alert" className="text-small text-[#FF6B4A]">
      {mesaj}
    </p>
  );
}

/** Nötr bilgi satırı (ör. "Kod 5** ** 67 numarasına gönderildi"). */
export function Bilgi({ children }: { children: ReactNode }) {
  return (
    <p aria-live="polite" className="text-small text-gray-300">
      {children}
    </p>
  );
}
