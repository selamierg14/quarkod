"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Kısa bildirim. Kaydetme gibi işlemlerden sonra sayfayı kaydırmadan
 * "oldu/olmadı" demek için; kalıcı bilgi Alert'e, form hatası Field'a ait.
 */
export type ToastTone = "basari" | "hata" | "bilgi";

type Toast = { id: number; tone: ToastTone; mesaj: string };

const ToastContext = createContext<{
  bildir: (mesaj: string, tone?: ToastTone) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, ToastProvider içinde kullanılmalı.");
  return ctx;
}

const TONES: Record<ToastTone, string> = {
  basari: "bg-ink-button text-white",
  hata: "bg-danger text-white",
  bilgi: "bg-ink-button text-white",
};

const IKON: Record<ToastTone, string> = { basari: "✓", hata: "⚠", bilgi: "i" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<Toast[]>([]);

  const bildir = useCallback((mesaj: string, tone: ToastTone = "basari") => {
    const id = Date.now() + Math.random();
    setListe((prev) => [...prev, { id, tone, mesaj }]);
    // Otomatik kapanma; kullanıcı okumayı bitirmeden kaybolmasın diye 4 sn.
    setTimeout(() => setListe((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ bildir }), [bildir]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {liste.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-control px-4 py-2.5 text-small font-medium shadow-pop ${TONES[t.tone]}`}
            style={{ animation: "mm-fade 0.2s ease-out both" }}
          >
            <span aria-hidden="true" className="opacity-80">
              {IKON[t.tone]}
            </span>
            {t.mesaj}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
