import { Sparkles } from "lucide-react";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, SectionCard } from "@/components/ui";
import { gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { sponsorMu } from "@/lib/sponsorluk";
import { krediEkle, sponsorKaldir, sponsorYap } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sponsorlar" };

/**
 * Biyerlere'nin gelir getiren iki platform kontrolü tek sayfada:
 * haftalık sponsor bannerı ve bölgesel push bildirim kredisi.
 *
 * İkisi de superadmin'e özel: sponsorluk PARA KARŞILIĞI satılan, kıt bir
 * yer (tek mekan olmalı); push kredisi de manuel ödeme karşılığı verilen
 * bir hak (bkz. hesaplar/actions.ts'teki ödeme kaydı ile aynı ilke — gerçek
 * bir ödeme sağlayıcısı entegre edilmedi, kredi burada elle tanımlanıyor).
 */
export default async function SponsorlarPage() {
  await requireSuperadmin();
  const simdi = new Date();

  const isletmeler = await prisma.business.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, sponsorHaftasi: true, pushKredisi: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        renk="amber"
        title="Sponsorlar ve push kredisi"
        description={`Bu haftanın pazartesisi: ${gunGirdisi(haftaBaslangici(simdi))} — hero banner'da yalnızca bu haftanın sponsoru görünür.`}
      />

      <SectionCard
        ikon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        renk="violet"
        title="İşletmeler"
        description="Sponsor bannerı ve push kredisi tek listede."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-line text-caption text-ink-faint uppercase">
                <th className="py-2 text-left font-medium">İşletme</th>
                <th className="py-2 text-left font-medium">Sponsor (bu hafta)</th>
                <th className="py-2 text-left font-medium">Push kredisi</th>
              </tr>
            </thead>
            <tbody>
              {isletmeler.map((b) => {
                const buHaftaSponsor = sponsorMu(b.sponsorHaftasi, simdi);
                return (
                  <tr key={b.id} className="border-b border-line last:border-b-0">
                    <td className="py-2.5 pr-3 font-medium text-ink">{b.name}</td>
                    <td className="py-2.5 pr-3">
                      <form action={buHaftaSponsor ? sponsorKaldir : sponsorYap}>
                        <input type="hidden" name="businessId" value={b.id} />
                        <button
                          type="submit"
                          className={`rounded-chip px-2.5 py-1 text-caption font-medium ${
                            buHaftaSponsor
                              ? "bg-success-soft text-success-ink"
                              : "border border-line text-ink-soft hover:bg-canvas"
                          }`}
                        >
                          {buHaftaSponsor ? "✓ Bu haftanın sponsoru" : "Sponsor yap"}
                        </button>
                      </form>
                    </td>
                    <td className="py-2.5">
                      <form action={krediEkle} className="flex items-center gap-2">
                        <input type="hidden" name="businessId" value={b.id} />
                        <span className="font-semibold tabular text-ink">{b.pushKredisi}</span>
                        <input
                          type="number"
                          name="adet"
                          min={1}
                          placeholder="adet"
                          className="w-20 rounded-chip border border-line bg-surface px-2 py-1 text-caption outline-none focus:border-line-strong"
                        />
                        <button
                          type="submit"
                          className="rounded-chip border border-line px-2.5 py-1 text-caption font-medium text-ink-soft hover:bg-canvas"
                        >
                          Kredi ekle
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
