"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { NavGrup } from "@/lib/panel";

/**
 * Klavyeden sayfa arama — Ctrl/Cmd + K.
 *
 * Panelde on beşten fazla ekran var ve aralarında geçmenin tek yolu sol
 * menüydü: doğru grubu açıp doğru satırı bulmak, gün içinde onlarca kez
 * tekrarlanan bir işti. Palet aynı menü ağacından besleniyor — yani yeni
 * bir ekran menüye eklendiğinde burada da otomatik çıkıyor, ayrıca
 * beslenmesi gereken ikinci bir liste yok.
 */
type Hedef = { href: string; label: string; grup: string };

/** Menü ağacını düz bir "gidilebilir sayfalar" listesine indirger. */
function hedefleriTopla(gruplar: NavGrup[]): Hedef[] {
  const hedefler: Hedef[] = [];
  const gorulen = new Set<string>();

  for (const grup of gruplar) {
    for (const link of grup.linkler) {
      // Alt listesi olan satır kendi başına da bir sayfa (ör. Kullanıcılar),
      // ama alt linkleriyle aynı adrese düşüyorsa iki kez listelenmesin.
      const adaylar = [
        { href: link.href, label: link.label },
        ...(link.altLinkler ?? []).map((alt) => ({
          href: alt.href,
          // "Kullanıcılar › Ekle" — tek başına "Ekle" hangi modülün
          // eklemesi olduğunu söylemiyordu.
          label: link.altLinkler ? `${link.label} › ${alt.label}` : alt.label,
        })),
      ];
      for (const aday of adaylar) {
        if (gorulen.has(aday.href)) continue;
        gorulen.add(aday.href);
        hedefler.push({ ...aday, grup: grup.baslik });
      }
    }
  }
  return hedefler;
}

/**
 * Türkçe'ye duyarlı, aksan toleranslı arama anahtarı.
 *
 * "isletme" yazan biri "İşletmeler"i bulabilmeli: Türkçe klavyesi olmayan
 * ya da hızlı yazan kullanıcı ı/i, ş/s, ğ/g ayrımını yapmıyor.
 */
function aramaAnahtari(metin: string): string {
  return metin
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[h] ?? h);
}

export function KomutPaleti({ gruplar }: { gruplar: NavGrup[] }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [secili, setSecili] = useState(0);
  const girdiRef = useRef<HTMLInputElement>(null);

  const hedefler = useMemo(() => hedefleriTopla(gruplar), [gruplar]);

  const sonuclar = useMemo(() => {
    const anahtar = aramaAnahtari(sorgu.trim());
    if (!anahtar) return hedefler.slice(0, 8);
    return hedefler
      .filter((h) => aramaAnahtari(`${h.grup} ${h.label}`).includes(anahtar))
      .slice(0, 8);
  }, [hedefler, sorgu]);

  // Ctrl/Cmd+K paleti açar; Escape kapatır.
  useEffect(() => {
    function dinle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAcik((v) => !v);
        setSorgu("");
        setSecili(0);
      } else if (e.key === "Escape") {
        setAcik(false);
      }
    }
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, []);

  useEffect(() => {
    if (acik) girdiRef.current?.focus();
  }, [acik]);

  function git(href: string) {
    setAcik(false);
    router.push(href);
  }

  if (!acik) return null;

  return (
    <div className="print-hidden fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => setAcik(false)}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sayfa ara"
        className="relative w-full max-w-lg overflow-hidden rounded-card bg-surface shadow-pop ring-1 ring-line"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
          <input
            ref={girdiRef}
            value={sorgu}
            onChange={(e) => {
              setSorgu(e.target.value);
              // Seçim başa dönmeli: aksi halde kısalan listede görünmeyen
              // bir satır seçili kalıyor ve Enter yanlış sayfayı açıyor.
              setSecili(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSecili((s) => (sonuclar.length ? (s + 1) % sonuclar.length : 0));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSecili((s) =>
                  sonuclar.length ? (s - 1 + sonuclar.length) % sonuclar.length : 0,
                );
              } else if (e.key === "Enter" && sonuclar[secili]) {
                e.preventDefault();
                git(sonuclar[secili].href);
              }
            }}
            placeholder="Sayfa ara — vardiya, menü, geri bildirim…"
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="shrink-0 rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink-faint">
            esc
          </kbd>
        </div>

        {sonuclar.length === 0 ? (
          <p className="px-4 py-6 text-center text-small text-ink-muted">
            &quot;{sorgu}&quot; için sayfa bulunamadı.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1.5">
            {sonuclar.map((h, i) => (
              <li key={h.href}>
                <button
                  type="button"
                  onMouseEnter={() => setSecili(i)}
                  onClick={() => git(h.href)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-small transition ${
                    i === secili
                      ? "bg-gradient-to-r from-accent-600 to-accent-500 text-white"
                      : "text-ink-soft hover:bg-sunken"
                  }`}
                >
                  <span className="truncate font-medium">{h.label}</span>
                  <span
                    className={`shrink-0 text-caption ${
                      i === secili ? "text-white/70" : "text-ink-faint"
                    }`}
                  >
                    {h.grup}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="border-t border-line bg-canvas px-4 py-2 text-caption text-ink-faint">
          ↑↓ gezin · Enter aç · Ctrl/⌘ K kapat
        </p>
      </div>
    </div>
  );
}
