"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Açıklama metnini bir (i) rozetinin arkasına saklar.
 *
 * Önceki sürüm saf CSS'ti: `:hover` / `:focus-within` ile açılıyordu.
 * Masaüstünde çalışıyordu ama iPhone'da (Safari/WebKit) hiç açılmıyordu —
 * WebKit, dokunuşla tıklanan `<button>`'a normal tarayıcıların aksine
 * odak (focus) vermiyor, yani `:focus-within` hiç tetiklenmiyordu. Panel
 * çoğunlukla telefondan kullanıldığı için bu, ipucunun telefonda tamamen
 * görünmez olması demekti.
 *
 * Artık gerçek bir tık durumu (state) ile açılıp kapanıyor — dokunuşla da,
 * fareyle de, klavyeyle de çalışır. Konumu `position: fixed` ve butonun
 * gerçek ekran koordinatından hesaplanıyor: `SectionCard`'ın kendisi
 * `overflow-hidden` taşıyor, `absolute` bir ipucu kartın kenarında
 * kırpılabilirdi; `fixed` bu kırpmadan tamamen bağımsız.
 */
export function BilgiIpucu({ children }: { children: ReactNode }) {
  const [acik, setAcik] = useState(false);
  const [konum, setKonum] = useState({ top: 0, left: 0 });
  const butonRef = useRef<HTMLButtonElement>(null);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;

    function disariTikla(e: MouseEvent | TouchEvent) {
      const hedef = e.target as Node;
      if (butonRef.current?.contains(hedef) || kutuRef.current?.contains(hedef)) return;
      setAcik(false);
    }
    function kacTusu(e: KeyboardEvent) {
      if (e.key === "Escape") setAcik(false);
    }

    // "click" değil "mousedown"/"touchstart": aksi halde açan tıklamanın
    // kendisi aynı anda "dışarı tıklama" sayılıp kutuyu hemen kapatırdı.
    document.addEventListener("mousedown", disariTikla);
    document.addEventListener("touchstart", disariTikla);
    document.addEventListener("keydown", kacTusu);
    return () => {
      document.removeEventListener("mousedown", disariTikla);
      document.removeEventListener("touchstart", disariTikla);
      document.removeEventListener("keydown", kacTusu);
    };
  }, [acik]);

  function ac() {
    const dikdortgen = butonRef.current?.getBoundingClientRect();
    if (dikdortgen) {
      // Dar telefon ekranında sabit bir max-genişlik + sol kenardan
      // taşmayı önleyen bir alt sınır: ipucu her zaman ekranın içinde kalır.
      const genislik = 288;
      const sol = Math.min(
        Math.max(8, dikdortgen.left),
        window.innerWidth - genislik - 8,
      );
      setKonum({ top: dikdortgen.bottom + 6, left: sol });
    }
    setAcik((v) => !v);
  }

  return (
    <>
      <button
        ref={butonRef}
        type="button"
        aria-label="Açıklama"
        aria-expanded={acik}
        onClick={ac}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-sunken hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-600"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      {acik ? (
        <div
          ref={kutuRef}
          role="tooltip"
          style={{ top: konum.top, left: konum.left, width: 288 }}
          className="fixed z-50 rounded-control bg-ink-strong px-3 py-2.5 text-caption leading-relaxed text-white shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </>
  );
}
