import Link from "next/link";
import { SectionCard } from "@/components/ui";
import { masaSirala } from "@/lib/masa";
import { TableManager } from "../TableManager";
import { TekQrKurulum } from "../TekQrKurulum";
import { IsletmeUst } from "../IsletmeUst";
import { isletmeyiYukle } from "../_veri";

export const dynamic = "force-dynamic";

export const metadata = { title: "Masalar & QR noktaları" };

export default async function MasalarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { business } = await isletmeyiYukle(id);

  const masalar = masaSirala(business.tables);
  const masaliOlanlar = masalar.filter((t) => !t.isEntrance);
  const girisQr = masalar.find((t) => t.isEntrance);

  return (
    <div className="flex flex-col gap-5">
      <IsletmeUst business={business} aktif="masalar" />

      {/* Kurulumun en kritik kararı bu: masaya özel mi, tek ortak mı.
          Önceden bu tercih küçük bir onay kutusuna gömülüydü ve çoğu kişi
          fark etmiyordu. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          ikon="🪑"
          renk="indigo"
          title="Masaya özel QR"
          description="Her masanın kendi kodu olur."
        >
          <p className="text-small leading-relaxed text-ink-soft">
            Raporlarda <strong>hangi masadan</strong> geldiğini görürsünüz —
            &quot;masa 7 sürekli düşük puan alıyor, oradaki klima mı bozuk?&quot;
            gibi soruların cevabı ancak böyle çıkar. Restoran, kafe, bar için
            önerilen yol.
          </p>
          <div className="mt-4">
            <TableManager
              businessId={business.id}
              tables={masaliOlanlar.map((t) => ({
                id: t.id,
                tableNumber: t.tableNumber,
                isEntrance: t.isEntrance,
                active: t.active,
              }))}
            />
          </div>
        </SectionCard>

        <SectionCard
          ikon="🚪"
          renk="teal"
          title="Tek ortak QR"
          description="Tüm mekân için tek kod."
        >
          <p className="text-small leading-relaxed text-ink-soft">
            Masa kavramı olmayan yerler için: büfe, kuaför, gece kulübü, paket
            servis. Tek bir kod basıp kapıya, kasaya ya da her masaya
            dağıtabilirsiniz. Raporlarda masa kırılımı olmaz — puanlar tek
            havuzda toplanır.
          </p>
          <div className="mt-4">
            <TekQrKurulum businessId={business.id} mevcutMu={Boolean(girisQr?.active)} />
          </div>
        </SectionCard>
      </div>

      <div className="rounded-control bg-gradient-to-r from-accent-50 to-transparent px-5 py-4 ring-1 ring-accent-100">
        <p className="text-small text-ink-soft">
          <strong className="text-ink">İkisini birlikte de kullanabilirsiniz:</strong>{" "}
          masalara özel kodlar + girişe ortak bir kod. Kodları basmaya hazır
          olduğunuzda{" "}
          <Link
            href={`/admin/isletmeler/${business.id}/qr`}
            className="font-medium text-accent-700 underline underline-offset-2"
          >
            QR kodlarını yazdır
          </Link>{" "}
          sekmesinden hepsini tek PDF olarak indirin.
        </p>
      </div>
    </div>
  );
}
