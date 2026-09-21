import Link from "next/link";
import type { ReactNode } from "react";
import { SayfaBoyutu } from "./SayfaBoyutu";
import type { SayfaBoyutu as SayfaBoyutuDegeri } from "@/lib/cekirdek/sayfalama";

/**
 * Filtre/dönem seçici (segment). Bağlantı tabanlı: sunucu bileşeninde de
 * çalışsın, geri tuşu filtreyi hatırlasın.
 */
export function SegmentGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 rounded-control bg-sunken p-1 ring-1 ring-line"
    >
      {children}
    </div>
  );
}

export function SegmentLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-[0.5rem] px-3 py-1.5 text-small font-medium whitespace-nowrap transition ${
        active
          ? "bg-surface text-ink shadow-card ring-1 ring-line"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Sekme çubuğu — panelin alt modül gezinmesi (Çizelge / Görev şablonu /
 * Performans gibi).
 *
 * Aktif sekme yalnızca altındaki çizgiyle değil, üstüne oturan soluk bir
 * renk geçişiyle de belli oluyor: tek başına 2px'lik bir çizgi, ekranın
 * üstünde tabloya bakan birinin gözünden kaçıyordu. Çizgi de düz değil
 * geçişli — panelin geri kalanıyla (modül rozetleri, kart şeritleri) aynı
 * dili konuşsun.
 */
export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative rounded-t-chip px-3.5 py-2.5 text-small font-medium whitespace-nowrap transition ${
        active
          ? "bg-gradient-to-b from-accent-50 to-transparent text-accent-700"
          : "text-ink-muted hover:bg-sunken hover:text-ink-soft"
      }`}
    >
      {children}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-accent-600 to-accent-400"
        />
      ) : null}
    </Link>
  );
}

/** Müşteri menüsündeki kategori hapları. Aktif olan marka rengini alır. */
export function ChipLink({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 text-small font-medium whitespace-nowrap shadow-card ring-1 transition ${
        active
          ? "bg-brand text-brand-ink ring-transparent"
          : "bg-surface/95 text-ink-soft ring-line"
      }`}
    >
      {children}
    </a>
  );
}

/**
 * Sayfalama çubuğu: solda "neredeyim", sağda gezinme + sayfa boyutu.
 *
 * Boyut seçici burada, çubuğun SAĞ ALTINDA: listeyi okuyup "bu kadarı az
 * geldi" diyen kişi tam o noktada duruyor. Listenin üstüne koymak, kararı
 * daha veri görülmeden vermeyi gerektirirdi.
 *
 * Tek sayfalık listede de çiziliyor (eskiden gizleniyordu): boyutu
 * büyüten kullanıcının seçimini geri alabilmesi gerekiyor, yoksa çubuk
 * kaybolduğu için 100'de kilitli kalıyordu. Çubuğun hiç gerekmediği kısa
 * listelerde kararı çağıran veriyor (bkz. cubukGosterilsinMi).
 */
export function Pagination({
  sayfa,
  toplamSayfa,
  href,
  toplamKayit,
  boyut,
  aralik,
}: {
  sayfa: number;
  toplamSayfa: number;
  /** Sayfa numarasını alıp adres üreten fonksiyon. */
  href: (sayfa: number) => string;
  toplamKayit?: number;
  /** Verilirse sağda sayfa boyutu açılır listesi çizilir. */
  boyut?: SayfaBoyutuDegeri;
  /** "11–20 / 137" — verilmezse "Sayfa 2 / 14" yazılır. */
  aralik?: string;
}) {
  const stil =
    "inline-flex h-9 items-center rounded-control px-3 text-small font-medium ring-1 ring-line transition";
  const pasif = "text-ink-faint bg-sunken cursor-not-allowed";
  const aktif = "bg-surface text-ink-soft hover:bg-sunken";

  return (
    <nav
      aria-label="Sayfalama"
      className="flex flex-wrap items-center justify-between gap-3 text-small text-ink-muted"
    >
      <span className="tabular">
        {aralik ?? `Sayfa ${sayfa} / ${toplamSayfa}`}
        {aralik === undefined && toplamKayit !== undefined
          ? ` · ${toplamKayit} kayıt`
          : ""}
      </span>
      <span className="flex items-center gap-2">
        {sayfa > 1 ? (
          <Link href={href(sayfa - 1)} className={`${stil} ${aktif}`}>
            ← Önceki
          </Link>
        ) : (
          <span className={`${stil} ${pasif}`} aria-disabled="true">
            ← Önceki
          </span>
        )}
        {sayfa < toplamSayfa ? (
          <Link href={href(sayfa + 1)} className={`${stil} ${aktif}`}>
            Sonraki →
          </Link>
        ) : (
          <span className={`${stil} ${pasif}`} aria-disabled="true">
            Sonraki →
          </span>
        )}
        {boyut !== undefined ? <SayfaBoyutu boyut={boyut} /> : null}
      </span>
    </nav>
  );
}
