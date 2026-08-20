import Link from "next/link";
import { TabLink } from "@/components/ui";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/constants";

/**
 * İşletme ekranlarının ortak başlığı ve sekmeleri.
 *
 * Önceden ayarlar, anket kategorileri ve masalar tek bir uzun sayfada alt
 * alta duruyordu: kullanıcı "neyi nereden değiştiriyorum" sorusunu ancak
 * sayfayı baştan sona okuyarak cevaplayabiliyordu. Sekmeler her ekranı tek
 * bir işe indiriyor.
 */
export type IsletmeSekmesi = "ayarlar" | "kategoriler" | "masalar" | "qr";

export function IsletmeUst({
  business,
  aktif,
}: {
  business: { id: string; name: string; type: string; slug: string; brandColor: string };
  aktif: IsletmeSekmesi;
}) {
  const taban = `/admin/isletmeler/${business.id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-chip text-lg text-white shadow-sm"
            style={{ backgroundColor: business.brandColor }}
          >
            🏪
          </span>
          <div>
            <Link
              href="/admin/isletmeler"
              className="text-caption font-medium text-ink-muted hover:text-ink"
            >
              ← İşletmeler
            </Link>
            <h1 className="mt-0.5 text-title font-semibold text-ink">{business.name}</h1>
            <p className="text-small text-ink-muted">
              {BUSINESS_TYPES[business.type as BusinessType] ?? business.type} ·{" "}
              <code className="rounded bg-sunken px-1.5 py-0.5 text-caption text-ink-soft">
                /f/{business.slug}/…
              </code>
            </p>
          </div>
        </div>
      </div>

      <div className="print-hidden flex gap-1 overflow-x-auto border-b border-line">
        <TabLink href={taban} active={aktif === "ayarlar"}>
          Ayarlar
        </TabLink>
        <TabLink href={`${taban}/kategoriler`} active={aktif === "kategoriler"}>
          Anket kategorileri
        </TabLink>
        <TabLink href={`${taban}/masalar`} active={aktif === "masalar"}>
          Masalar &amp; QR noktaları
        </TabLink>
        <TabLink href={`${taban}/qr`} active={aktif === "qr"}>
          QR kodlarını yazdır
        </TabLink>
      </div>
    </div>
  );
}
