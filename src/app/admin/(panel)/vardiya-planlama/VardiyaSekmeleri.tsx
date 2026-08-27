import { TabLink } from "@/components/ui";

/**
 * Vardiya modülünün sekmeleri.
 *
 * Sekme çubuğu dört sayfada elle tekrarlanıyordu ve zamanla ayrışmıştı:
 * Çizelge ile Görev şablonu sayfalarında "Performans" sekmesi hiç yoktu,
 * yani o ekrana yalnızca sol menüden ulaşılabiliyordu. Tek yerden
 * üretilince yeni sekme eklemek de tek satır.
 */
export type VardiyaSekmesi = "cizelge" | "izinler" | "sablon" | "performans";

const SEKMELER: { anahtar: VardiyaSekmesi; href: string; label: string }[] = [
  { anahtar: "cizelge", href: "/admin/vardiya-planlama", label: "Çizelge" },
  { anahtar: "izinler", href: "/admin/vardiya-planlama/izinler", label: "İzin & müsaitlik" },
  { anahtar: "sablon", href: "/admin/vardiya-planlama/sablon", label: "Görev şablonu" },
  { anahtar: "performans", href: "/admin/vardiya-planlama/performans", label: "Performans" },
];

export function VardiyaSekmeleri({ aktif }: { aktif: VardiyaSekmesi }) {
  return (
    <div className="print-hidden -mb-2 flex gap-1 overflow-x-auto border-b border-line">
      {SEKMELER.map((s) => (
        <TabLink key={s.anahtar} href={s.href} active={s.anahtar === aktif}>
          {s.label}
        </TabLink>
      ))}
    </div>
  );
}
