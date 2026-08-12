"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Onay/düzenleme penceresi.
 *
 * Native <dialog> kullanıyoruz: odak tuzağı, Esc ile kapanma ve arka planın
 * erişilemez olması tarayıcıdan geliyor; kendi elimizle yazdığımız her
 * modal bu üçünden birini eninde sonunda kaçırıyor.
 */
export function Dialog({
  acik,
  onClose,
  baslik,
  aciklama,
  children,
  aksiyonlar,
  gorsel,
}: {
  acik: boolean;
  onClose: () => void;
  baslik: ReactNode;
  aciklama?: ReactNode;
  children?: ReactNode;
  aksiyonlar?: ReactNode;
  /** Başlığın üstüne, kutunun kenarına kadar taşan görsel (ürün fotoğrafı vb.). */
  gorsel?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (acik && !el.open) el.showModal();
    if (!acik && el.open) el.close();
  }, [acik]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Karartıya tıklayınca kapansın: <dialog> tıklaması kutunun dışında
        // da kendisine geldiği için hedefi karşılaştırıyoruz.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto max-h-[88vh] w-[min(28rem,calc(100vw-2rem))] overflow-hidden overflow-y-auto rounded-card bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40 backdrop:backdrop-blur-[3px]"
    >
      {gorsel}
      <div className="p-5">
        <h2 className="text-heading font-semibold">{baslik}</h2>
        {aciklama ? <p className="mt-1.5 text-small text-ink-muted">{aciklama}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
      {aksiyonlar ? (
        <div className="flex justify-end gap-2 border-t border-line bg-sunken px-5 py-3">
          {aksiyonlar}
        </div>
      ) : null}
    </dialog>
  );
}
