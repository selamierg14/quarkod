"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { aktifMi, type IkonAdi, type NavGrup } from "@/lib/panel";

/**
 * Panelin sol gezinme çubuğu.
 *
 * Sekmeler üstte yan yana dizilince on bir başlık tek satıra sığmıyor,
 * yatay kaydırma da neyin nerede olduğunu gizliyordu. Sol sütun hem
 * gruplamaya (Günlük / Analiz / Yönetim) izin veriyor hem de ekranın
 * tamamında sabit kalıyor.
 *
 * Masaüstünde daraltılabilir (yalnızca ikonlar), mobilde çekmece olarak
 * açılır. Durum layout'ta yaşadığı için sayfa değiştirince sıfırlanmıyor.
 */
export function AdminSidebar({
  gruplar,
  kullaniciAdi,
  rolAdi,
  cikis,
}: {
  gruplar: NavGrup[];
  kullaniciAdi: string;
  rolAdi: string;
  /** Sunucu eylemi olan çıkış formu; layout'tan geçiyor. */
  cikis: React.ReactNode;
}) {
  const pathname = usePathname();
  const [genis, setGenis] = useState(true);
  const [mobilAcik, setMobilAcik] = useState(false);

  const govde = (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center gap-2 border-b border-line px-3 py-3.5 ${
          genis ? "" : "lg:justify-center"
        }`}
      >
        {/* Üç çizgi: masaüstünde daraltır, mobilde çekmeceyi kapatır. */}
        <button
          type="button"
          onClick={() => {
            setGenis((v) => !v);
            setMobilAcik(false);
          }}
          aria-label={genis ? "Menüyü daralt" : "Menüyü genişlet"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-chip text-ink-soft transition hover:bg-sunken hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {genis ? (
          <Link href="/admin" className="truncate font-semibold tracking-tight text-ink">
            Memnuniyet Paneli
          </Link>
        ) : null}
      </div>

      <nav aria-label="Panel" className="flex-1 overflow-y-auto px-2 py-3">
        {gruplar.map((grup) => (
          <div key={grup.baslik} className="mb-4 last:mb-0">
            {genis ? (
              <p className="px-2 pb-1.5 text-overline font-semibold text-ink-faint uppercase">
                {grup.baslik}
              </p>
            ) : (
              // Daraltılmış halde başlık yerine ince bir ayraç: gruplar
              // birbirine yapışmasın.
              <div className="mx-2 mb-2 border-t border-line" aria-hidden="true" />
            )}

            <ul className="flex flex-col gap-0.5">
              {grup.linkler.map((link) => {
                const aktif = aktifMi(link, pathname);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={aktif ? "page" : undefined}
                      title={genis ? undefined : link.label}
                      onClick={() => setMobilAcik(false)}
                      className={`flex items-center gap-2.5 rounded-chip px-2.5 py-2 text-small font-medium transition ${
                        genis ? "" : "lg:justify-center"
                      } ${
                        aktif
                          ? "bg-ink text-white"
                          : "text-ink-soft hover:bg-sunken hover:text-ink"
                      }`}
                    >
                      <Ikon ad={link.ikon} />
                      <span className={genis ? "truncate" : "lg:hidden"}>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        {/* Kullanıcı kartı profile götürür: tek satırlık "Hesabım" grubunu
            menüden çıkarıp buraya bağladık, menü bir kalem kısaldı. */}
        <Link
          href="/admin/profil"
          title={genis ? undefined : `${kullaniciAdi} — Profil`}
          className={`mb-2 flex items-center gap-2 rounded-chip px-1 py-1.5 transition hover:bg-canvas ${
            genis ? "" : "justify-center"
          }`}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken text-caption font-semibold text-ink-soft"
          >
            {kullaniciAdi.trim().charAt(0).toLocaleUpperCase("tr")}
          </span>
          {genis ? (
            <span className="min-w-0 flex-1 truncate text-caption text-ink-muted">
              <span className="block truncate font-medium text-ink-soft">
                {kullaniciAdi}
              </span>
              {rolAdi}
            </span>
          ) : null}
        </Link>
        {cikis}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobil başlık: sol çubuk gizliyken tek giriş noktası. */}
      <div className="print-hidden flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMobilAcik(true)}
          aria-label="Menüyü aç"
          className="flex h-9 w-9 items-center justify-center rounded-chip text-ink-soft transition hover:bg-sunken"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/admin" className="font-semibold tracking-tight text-ink">
          Memnuniyet Paneli
        </Link>
      </div>

      {/* Mobil çekmece */}
      {mobilAcik ? (
        <div className="print-hidden fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setMobilAcik(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-surface shadow-pop">{govde}</div>
        </div>
      ) : null}

      {/* Masaüstü sütunu */}
      <aside
        className={`print-hidden sticky top-0 hidden h-dvh shrink-0 border-r border-line bg-surface transition-[width] duration-200 lg:block ${
          genis ? "w-64" : "w-16"
        }`}
      >
        {govde}
      </aside>
    </>
  );
}

/** Menü ikonları — dış bir ikon paketi yerine tek dosyada, ince çizgili set. */
function Ikon({ ad }: { ad: IkonAdi }) {
  const ortak = "h-[18px] w-[18px] shrink-0";
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (ad) {
    case "pano":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />
        </svg>
      );
    case "mesaj":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M21 12a8 8 0 01-8 8H7l-4 3 1-5.5A8 8 0 1121 12z" />
        </svg>
      );
    case "grafik":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "yildiz":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M12 3.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
        </svg>
      );
    case "menu":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M4 5h16M4 12h16M4 19h10" />
        </svg>
      );
    case "bina":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M3 21h18M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M15 21V11h4a2 2 0 012 2v8M9 7h2M9 11h2M9 15h2" />
        </svg>
      );
    case "kiyas":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M6 20V8M12 20V4M18 20v-8" />
        </svg>
      );
    case "izin":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M3 7l9 6 9-6M3 7v10a1 1 0 001 1h16a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
        </svg>
      );
    case "kisi":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20a6 6 0 0112 0M17 11h4M19 9v4" />
        </svg>
      );
    case "hesap":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </svg>
      );
    case "abonelik":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h3" />
          <circle cx="17" cy="15" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "denetim":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      );
    case "sistem":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M3 12h4l2-5 3 10 2-5h7" />
        </svg>
      );
    case "profil":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0114 0" />
        </svg>
      );
  }
}
