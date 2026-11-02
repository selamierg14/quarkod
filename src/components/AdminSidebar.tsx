"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { aktifMi, grupAktifMi, type IkonAdi, type NavGrup } from "@/lib/kimlik/panel";
import { APP_VERSION } from "@/lib/cekirdek/constants";
import { BildirimZili } from "./BildirimZili";
import { ProfilAvatarButton } from "./ProfilAvatarButton";
import { CikisButonu } from "./CikisButonu";
import { komutPaletiniAc } from "./KomutPaleti";

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
  calismaAlani,
  cikisAction,
}: {
  gruplar: NavGrup[];
  kullaniciAdi: string;
  rolAdi: string;
  /** Tepedeki kart: "şu an kimin panelindeyim" (işletme / hesap / platform). */
  calismaAlani?: { ad: string; alt: string };
  /** Sunucu eylemi; burada mı ikon mu metinli buton mu göstereceğimize
   * karar veriyoruz, bu yüzden hazır JSX değil aksiyonun kendisi geçiyor. */
  cikisAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [genis, setGenis] = useState(true);
  const [mobilAcik, setMobilAcik] = useState(false);
  // Alt listesi olan satırlar (ör. Kullanıcılar > Listele/Ekle) akordiyon:
  // aynı anda yalnızca BİRİ açık kalır. Önceden her grubun kendi bağımsız
  // durumu vardı ve dört alt liste birden açık kalabiliyordu — kenar çubuğu
  // yirmi satıra çıkıp hangi bölümde olduğunuzu okumayı zorlaştırıyordu.
  //
  // null = "kullanıcı henüz bir şey açıp kapatmadı", o zaman içinde bulunulan
  // sayfanın grubu açık gelir. Bir kez dokunulduktan sonra tercih pathname
  // değişse de korunur; "" ise hepsi kapalı demektir.
  const [acikGrup, setAcikGrup] = useState<string | null>(null);

  function grupAcikMi(href: string, varsayilanAktif: boolean): boolean {
    return acikGrup === null ? varsayilanAktif : acikGrup === href;
  }

  function grupAc(href: string, suankiAcikMi: boolean) {
    // Açık olana tekrar basmak kapatır; başkasına basmak öncekini kapatır.
    setAcikGrup(suankiAcikMi ? "" : href);
  }

  const govde = (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-2 px-4 pt-5 pb-3 ${genis ? "" : "lg:justify-center lg:px-2"}`}>
        {/* Mobilde çekmeceyi kapatır; masaüstünde daraltma en altta. */}
        <button
          type="button"
          onClick={() => setMobilAcik(false)}
          aria-label="Menüyü kapat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-chip text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5 text-white" title="Quarkod">
          <MarkaIsareti />
          <span className={`truncate font-display text-[19px] font-semibold tracking-tight ${genis ? "" : "lg:hidden"}`}>
            Quarkod
          </span>
        </Link>
      </div>

      {/* Çalışma alanı kartı (referans tasarımdaki gibi): hangi işletmenin
          ya da hesabın panelinde olunduğu her ekranda aynı yerde. */}
      {calismaAlani && genis ? (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-control bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cta font-display text-small font-bold text-cta-ink"
          >
            {calismaAlani.ad.trim().slice(0, 2).toLocaleUpperCase("tr")}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-small font-semibold text-white">{calismaAlani.ad}</span>
            <span className="truncate text-[11px] text-kabuk-faint">{calismaAlani.alt}</span>
          </span>
        </div>
      ) : null}

      <nav aria-label="Panel" className="flex-1 overflow-y-auto px-3 py-3">
        {gruplar.map((grup) => (
          <div key={grup.baslik} className="mb-6 last:mb-0">
            {genis ? (
              <p className="px-2.5 pb-1.5 text-caption font-semibold text-kabuk-faint">
                {grup.baslik}
              </p>
            ) : (
              // Daraltılmış halde başlık yerine ince bir ayraç: gruplar
              // birbirine yapışmasın.
              <div className="mx-2 mb-2 border-t border-white/10" aria-hidden="true" />
            )}

            <ul className="flex flex-col gap-0.5">
              {grup.linkler.map((link) => {
                if (link.altLinkler) {
                  const grupAktif = grupAktifMi(link, pathname);
                  const acik = grupAcikMi(link.href, grupAktif);
                  return (
                    <li key={link.href}>
                      <button
                        type="button"
                        onClick={() => grupAc(link.href, acik)}
                        // Ekran okuyucu açık/kapalı bilgisini ancak bununla
                        // alıyor; ok ikonunun dönmesi görsel bir işaret.
                        aria-expanded={acik && genis}
                        title={genis ? undefined : link.label}
                        className={`flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-small font-medium transition ${
                          genis ? "" : "lg:justify-center"
                        } ${
                          grupAktif
                            ? "bg-white/5 text-white"
                            : "text-kabuk-ink hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Ikon ad={link.ikon} />
                        <span className={genis ? "flex-1 truncate text-left" : "lg:hidden"}>
                          {link.label}
                        </span>
                        {genis ? (
                          <svg
                            viewBox="0 0 24 24"
                            className={`h-4 w-4 shrink-0 transition-transform ${acik ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                          </svg>
                        ) : null}
                      </button>

                      {acik && genis ? (
                        <ul className="mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-white/15 pl-4">
                          {link.altLinkler.map((alt) => {
                            const altAktif = aktifMi(alt, pathname);
                            return (
                              <li key={alt.href}>
                                <Link
                                  href={alt.href}
                                  aria-current={altAktif ? "page" : undefined}
                                  onClick={() => setMobilAcik(false)}
                                  className={`flex items-center justify-between gap-2 rounded-chip px-2.5 py-1.5 text-small transition ${
                                    altAktif
                                      ? "bg-cta font-semibold text-cta-ink"
                                      : "text-kabuk-ink hover:bg-white/5 hover:text-white"
                                  }`}
                                >
                                  <span className="truncate">{alt.label}</span>
                                  {altAktif ? (
                                    <span
                                      aria-hidden="true"
                                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-success"
                                    />
                                  ) : null}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                }

                const aktif = aktifMi(link, pathname);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={aktif ? "page" : undefined}
                      title={genis ? undefined : link.label}
                      onClick={() => setMobilAcik(false)}
                      className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-small font-medium transition ${
                        genis ? "" : "lg:justify-center"
                      } ${
                        aktif
                          ? "bg-cta font-semibold text-cta-ink"
                          : "text-kabuk-ink hover:bg-white/5 hover:text-white"
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

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => setGenis((v) => !v)}
          className={`mb-2 hidden w-full items-center gap-3 rounded-control px-3 py-2 text-small text-kabuk-ink transition hover:bg-white/5 hover:text-white lg:flex ${
            genis ? "" : "justify-center px-0"
          }`}
          title={genis ? undefined : "Menüyü genişlet"}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
          {genis ? "Menüyü daralt" : <span className="sr-only">Menüyü genişlet</span>}
        </button>
        {/* Kullanıcı kartı profile götürür: tek satırlık "Hesabım" grubunu
            menüden çıkarıp buraya bağladık, menü bir kalem kısaldı. */}
        <Link
          href="/admin/profil"
          title={genis ? undefined : `${kullaniciAdi} — Profil`}
          className={`mb-2 flex items-center gap-2 rounded-chip px-1.5 py-1.5 transition hover:bg-white/5 ${
            genis ? "" : "justify-center"
          }`}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-caption font-semibold text-white"
          >
            {kullaniciAdi.trim().charAt(0).toLocaleUpperCase("tr")}
          </span>
          {genis ? (
            <span className="min-w-0 flex-1 truncate text-caption text-kabuk-faint">
              <span className="block truncate font-medium text-white">
                {kullaniciAdi}
              </span>
              {rolAdi}
            </span>
          ) : null}
        </Link>
        <CikisButonu
          action={cikisAction}
          title={genis ? undefined : "Çıkış"}
          className={`flex w-full items-center justify-center gap-2 rounded-chip border border-white/15 text-small text-kabuk-ink transition hover:bg-white/5 hover:text-white disabled:opacity-45 ${
            genis ? "px-3 py-1.5" : "px-0 py-2"
          }`}
        >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          {genis ? "Çıkış" : null}
        </CikisButonu>
        {genis ? (
          <p className="mt-2.5 text-center text-[11px] text-kabuk-faint tabular">
            Sürüm {APP_VERSION}
          </p>
        ) : null}
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
        <Link href="/admin" className="flex flex-1 items-center gap-2 font-semibold tracking-tight text-ink">
          <MarkaIsareti koyu />
          Quarkod
        </Link>
        <button
          type="button"
          onClick={komutPaletiniAc}
          aria-label="Sayfa ara"
          className="flex h-9 w-9 items-center justify-center rounded-chip text-ink-soft transition hover:bg-sunken"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
        <BildirimZili />
        <ProfilAvatarButton ad={kullaniciAdi} />
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
          <div className="absolute inset-y-0 left-0 w-[280px] bg-kabuk shadow-pop">{govde}</div>
        </div>
      ) : null}

      {/* Masaüstü sütunu */}
      <aside
        className={`print-hidden sticky top-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 overflow-hidden rounded-card bg-kabuk transition-[width] duration-200 lg:block ${
          genis ? "w-[264px]" : "w-[72px]"
        }`}
      >
        {govde}
      </aside>
    </>
  );
}

/**
 * Marka işareti: köşeli "Q". Ayrı bir logo dosyası olmadan da panelin
 * her yerde (kenar çubuğu, mobil başlık, personel kabuğu, giriş) aynı
 * kimliği taşıması için tek bileşen.
 */
export function MarkaIsareti({ koyu = false }: { koyu?: boolean }) {
  return (
    <span
      aria-hidden="true"
      // Tek kimlik: koyu ve açık zeminde aynı safran işaret. `koyu`
      // geriye dönük uyum için duruyor, görünümü değiştirmiyor.
      data-koyu={koyu || undefined}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cta font-display text-[14px] font-bold leading-none text-cta-ink"
    >
      Q
    </span>
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
    case "saat":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2" />
        </svg>
      );
    case "telefon":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2" />
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
    // Sponsorlar ve Plus aynı yıldızı kullanıyordu; menüde yan yana
    // durup hangisinin hangisi olduğu ancak yazı okunarak anlaşılıyordu.
    case "sponsor":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M4 10v4a1 1 0 001 1h2l5 4V5L7 9H5a1 1 0 00-1 1zM16 9a4 4 0 010 6M19 6.5a8 8 0 010 11" />
        </svg>
      );
    case "tac":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
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
    // Hesap ikonuyla (kart + şerit) neredeyse aynıydı; abonelik bir
    // döngü — yenilenen takvim.
    case "abonelik":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" />
          <path d="M12 8v4l2.5 1.5" />
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
    case "entegrasyon":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M9 3v4M15 3v4M6 7h12l-1 4a5 5 0 01-10 0z" />
          <path d="M12 15v3m-3 0h6" />
        </svg>
      );
    case "takvim":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "gorev":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M9 11l2 2 4-4" />
          <rect x="3" y="4" width="18" height="17" rx="2" />
        </svg>
      );
    case "duyuru":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M3 11v2a2 2 0 002 2h1l3 5V6L6 11H5a2 2 0 00-2 2z" />
          <path d="M11 8l7-3v14l-7-3M18 10v4" />
        </svg>
      );
    case "rezervasyon":
      // Masa + sandalye: rezervasyonun evrensel görseli.
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M3 10h18M5 10V7a2 2 0 012-2h10a2 2 0 012 2v3" />
          <path d="M6 10v9M18 10v9M3 14h18" />
        </svg>
      );
    case "biyerlere":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <path d="M12 21s7-6.5 7-11.5a7 7 0 10-14 0C5 14.5 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.3" />
        </svg>
      );
    case "rota":
      return (
        <svg viewBox="0 0 24 24" className={ortak} {...p}>
          <circle cx="5" cy="6" r="2" />
          <circle cx="19" cy="6" r="2" />
          <circle cx="12" cy="18" r="2" />
          <path d="M6.8 7.2L11 16M17.2 7.2L13 16" />
        </svg>
      );
  }
}
