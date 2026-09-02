import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";
import type { BiyerlereIstatistik } from "@/lib/biyerlere-istatistik";

const SATIRLAR = (i: BiyerlereIstatistik) => [
  { emoji: "👁️", etiket: "görüntülenme", deger: i.goruntuleme },
  { emoji: "📍", etiket: "yol tarifi tıklaması", deger: i.yolTarifi },
  { emoji: "🎟️", etiket: "kupon kullanıldı", deger: i.kuponKullanildi },
  { emoji: "⭐", etiket: "yeni puan verildi", deger: i.puanVerildi },
];

/**
 * Biyerlere (B2C keşfet uygulaması) bu işletme için bu hafta ne yaptı —
 * panelin geri bildirim odaklı diğer kartlarından ayrı bir kanal: burada
 * ölçülen anket değil, uygulamadaki GÖRÜNÜRLÜK ve DAVRANIŞ (bkz.
 * lib/biyerlere-istatistik.ts). Yalnızca kesfet modülü açık kullanıcıya
 * gösteriliyor — modül kapalıysa sayılar hep sıfır olur, boş bir kart
 * göstermenin anlamı yok.
 */
export function BiyerlereIstatistikKarti({ istatistik }: { istatistik: BiyerlereIstatistik }) {
  return (
    <Card>
      <CardHeader
        title="Biyerlere bu hafta"
        description="Son 7 gün, tüketici uygulamasındaki görünürlük ve etkileşim"
        action={
          <Link href="/admin/isletmeler" className="text-caption font-medium text-accent-700 hover:underline">
            Ayarları düzenle
          </Link>
        }
      />
      <ul className="mt-4 flex flex-col gap-2.5">
        {SATIRLAR(istatistik).map((s) => (
          <li key={s.etiket} className="flex items-center justify-between gap-2 text-small">
            <span className="text-ink-soft">
              {s.emoji} {s.etiket}
            </span>
            <span className="font-semibold tabular text-ink">{s.deger.toLocaleString("tr-TR")}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
