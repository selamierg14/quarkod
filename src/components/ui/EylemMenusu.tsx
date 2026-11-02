"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * Satır sonundaki "⋯" menüsü — seyrek kullanılan eylemler için.
 *
 * UI incelemesi menü düzenleme ekranında 376 düğme saydı; 367'si 28px'ten
 * alçaktı ve her ürün satırında altı küçük düğme fiyatın hemen yanında
 * duruyordu. Sık eylem (Tükendi, Düzenle) satırda kalıyor; sıralama,
 * gizleme ve silme bu menüye giriyor.
 *
 * İçerik genelde formlar (Server Action): menü yalnızca görünürlüğü
 * yönetiyor. Dışarı tıklayınca ve Esc ile kapanıyor.
 */
export function EylemMenusu({
  etiket,
  children,
}: {
  /** Ekran okuyucu için: "Latte — diğer işlemler". */
  etiket: string;
  children: ReactNode;
}) {
  const [acik, setAcik] = useState(false);
  const kutu = useRef<HTMLDivElement>(null);
  const kimlik = useId();

  useEffect(() => {
    if (!acik) return;
    function disari(e: MouseEvent) {
      if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false);
    }
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") setAcik(false);
    }
    document.addEventListener("mousedown", disari);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("mousedown", disari);
      document.removeEventListener("keydown", tus);
    };
  }, [acik]);

  return (
    <div className="relative" ref={kutu}>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-label={etiket}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-controls={kimlik}
        className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted ring-1 ring-line transition hover:bg-sunken hover:text-ink"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {acik ? (
        <div
          id={kimlik}
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 flex min-w-44 flex-col rounded-control bg-surface p-1 shadow-pop ring-1 ring-line"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Menü satırı için ortak düğme görünümü (form içindeki submit'ler dahil). */
export const EYLEM_SATIRI =
  "flex w-full items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-small text-ink-soft transition hover:bg-sunken hover:text-ink";
