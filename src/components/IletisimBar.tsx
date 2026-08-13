"use client";

import { useRef, useState } from "react";

/**
 * QR karşılama ekranındaki Instagram + Wi-Fi ikon satırı.
 *
 * Wi-Fi otomatik bağlanma (WIFI: QR profili) iOS/Android'de ayrı bir QR
 * gerektiriyor; burada tek QR zaten masaya bağlı olduğu için SSID/şifreyi
 * kopyalanabilir göstermek, ayrı bir Wi-Fi QR'ı basmaktan daha pratik.
 */
export function IletisimBar({
  instagramUrl,
  wifiSsid,
  wifiPassword,
}: {
  instagramUrl: string | null;
  wifiSsid: string | null;
  wifiPassword: string | null;
}) {
  const [acik, setAcik] = useState(false);
  const [kopyalanan, setKopyalanan] = useState<"ssid" | "sifre" | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const wifiVar = Boolean(wifiSsid && wifiPassword);
  if (!instagramUrl && !wifiVar) return null;

  async function kopyala(deger: string, hangi: "ssid" | "sifre") {
    try {
      await navigator.clipboard.writeText(deger);
      setKopyalanan(hangi);
      setTimeout(() => setKopyalanan((cur) => (cur === hangi ? null : cur)), 1500);
    } catch {
      // Panoya erişim engellenmiş olabilir (izin yok, http vb.); sessizce geç.
    }
  }

  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-sm transition active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>
      ) : null}

      {wifiVar ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setAcik((v) => !v)}
            aria-label="Wi-Fi bilgisi"
            aria-expanded={acik}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-sm transition active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M2.5 8.5a15 15 0 0 1 19 0" />
              <path strokeLinecap="round" d="M5.6 12a10.5 10.5 0 0 1 12.8 0" />
              <path strokeLinecap="round" d="M8.8 15.5a6 6 0 0 1 6.4 0" />
              <circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </button>

          {acik ? (
            <div
              ref={dialogRef}
              className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-card bg-surface p-3 text-left text-ink shadow-pop ring-1 ring-line"
            >
              <p className="text-caption font-medium text-ink-muted">Wi-Fi ağı</p>
              <button
                type="button"
                onClick={() => kopyala(wifiSsid as string, "ssid")}
                className="mt-1 flex w-full items-center justify-between rounded-chip bg-canvas px-2.5 py-2 text-left text-small"
              >
                <span className="truncate font-medium">{wifiSsid}</span>
                <span className="shrink-0 text-caption text-ink-faint">
                  {kopyalanan === "ssid" ? "Kopyalandı" : "Kopyala"}
                </span>
              </button>

              <p className="mt-2 text-caption font-medium text-ink-muted">Şifre</p>
              <button
                type="button"
                onClick={() => kopyala(wifiPassword as string, "sifre")}
                className="mt-1 flex w-full items-center justify-between rounded-chip bg-canvas px-2.5 py-2 text-left text-small"
              >
                <span className="truncate font-medium">{wifiPassword}</span>
                <span className="shrink-0 text-caption text-ink-faint">
                  {kopyalanan === "sifre" ? "Kopyalandı" : "Kopyala"}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
