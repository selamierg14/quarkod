import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { canAccessBusiness, requireIsletmeSayfasi } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { appUrl, qrCardText } from "@/lib/cekirdek/constants";
import { PrintButton } from "./PrintButton";
import { EN_COK_KOPYA, girisKartiVarMi, kopyaCoz, kopyalariYay } from "@/lib/isletme/qr-kopya";
import { masaSirala } from "@/lib/isletme/masa";
import { IsletmeUst } from "../IsletmeUst";

export const dynamic = "force-dynamic";

export const metadata = { title: "QR kodları" };

export default async function QrPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kopya?: string }>;
}) {
  const user = await requireIsletmeSayfasi();
  const { id } = await params;
  const kopya = kopyaCoz((await searchParams).kopya);
  if (!await canAccessBusiness(user, id)) notFound();

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      tables: {
        where: { active: true },
        orderBy: [{ isEntrance: "desc" }, { tableNumber: "asc" }],
      },
    },
  });
  if (!business) notFound();

  const base = appUrl();
  const cardText = qrCardText(business.type, business.qrCardText);

  // QR'lar sunucuda üretilip data URI olarak gömülür: hem yazdırmada hem
  // tek tek indirmede ek istek gerekmez.
  const codes = await Promise.all(
    masaSirala(business.tables).map(async (table) => {
      const url = `${base}/f/${business.slug}/${encodeURIComponent(table.tableNumber)}`;
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 512,
        color: { dark: business.brandColor, light: "#ffffff" },
      });
      return {
        id: table.id,
        label: table.isEntrance ? "Giriş" : `Masa ${table.tableNumber}`,
        fileName: `${business.slug}-${table.tableNumber}.png`,
        url,
        dataUrl,
        girisMi: table.isEntrance,
      };
    }),
  );

  /**
   * Giriş (ortak) QR'ı istenen kadar çoğaltılıyor — hepsi AYNI kod.
   * Masa QR'ları benzersiz olduğu için onlara dokunulmuyor
   * (bkz. lib/isletme/qr-kopya.ts).
   */
  const basilacak = kopyalariYay(codes, kopya, (kart, sira, toplam) => ({
    ...kart,
    id: `${kart.id}-${sira}`,
    label: `${kart.label} (${sira}/${toplam})`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden">
        <IsletmeUst business={business} aktif="qr" />
      </div>

      <div className="print-hidden flex flex-wrap items-center justify-between gap-3 rounded-control bg-gradient-to-r from-accent-50 to-transparent px-5 py-4 ring-1 ring-accent-100">
        <p className="text-small text-ink-soft">
          <strong className="text-ink">{basilacak.length} QR kodu</strong> hazır —
          renkleri işletmenin marka renginden alınıyor. Matbaaya vereceksen
          PDF&apos;i indir; kendin basacaksan yazdırmaya bas.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {/* ORTAK QR'IN KOPYA SAYISI.
              Giriş QR'ı mekanda tek adresi gösteriyor ama fiziksel olarak
              birden çok yere asılıyor (kapı, kasa, masalar). Eskiden çıktıda
              bir tane vardı ve "şunu 30 kez basın" demek matbaacının elle
              yapacağı bir işti. Sayı adreste taşınıyor ki PDF bağlantısı da
              aynı sayıyı götürsün. */}
          {girisKartiVarMi(codes) ? (
            <form method="get" className="flex items-center gap-1.5">
              <label
                htmlFor="kopya"
                className="text-small text-ink-soft"
                title="Yalnızca ortak (giriş) QR'ı çoğaltılır; masa QR'ları benzersizdir."
              >
                Ortak QR kopyası
              </label>
              <input
                id="kopya"
                name="kopya"
                type="number"
                min={1}
                max={EN_COK_KOPYA}
                step={1}
                defaultValue={kopya}
                className="h-10 w-20 rounded-control border border-line bg-surface px-2 text-small text-ink"
              />
              <button
                type="submit"
                className="h-10 rounded-control border border-line px-3 text-small font-medium text-ink hover:bg-canvas"
              >
                Çoğalt
              </button>
            </form>
          ) : null}

          {/* Matbaaya gidecek dosya: A4 ızgara, kesim kılavuzlu, QR'lar
              vektörel. Tek tek PNG indirip Word'de dizme işini bitiriyor. */}
          <a
            href={`/admin/isletmeler/${business.id}/qr/pdf${kopya > 1 ? `?kopya=${kopya}` : ""}`}
            className="rounded-control bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2.5 text-small font-semibold text-white shadow-card transition hover:brightness-110"
          >
            Matbaa PDF&apos;i indir
          </a>
          <PrintButton />
        </div>
      </div>

      {base.includes("localhost") ? (
        <p className="print-hidden rounded-control bg-warning-soft px-4 py-3 text-small text-warning-ink">
          QR&apos;lar <code>{base}</code> adresini gösteriyor. Baskıya vermeden
          önce <code>.env</code> içindeki <code>NEXT_PUBLIC_APP_URL</code> değerini
          gerçek alan adınızla değiştirin.
        </p>
      ) : null}

      {codes.length === 0 ? (
        <p className="rounded-control border border-dashed border-line-strong bg-surface p-10 text-center text-small text-ink-muted">
          Aktif masa yok. Önce işletme sayfasından masa ekleyin.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-0">
          {basilacak.map((code) => (
            <div
              key={code.id}
              className="print-break flex flex-col items-center rounded-control bg-surface p-4 text-center ring-1 ring-line print:rounded-none print:p-5 print:ring-0 print:outline print:outline-1 print:outline-dashed print:outline-slate-300"
            >
              <p
                className="text-base font-bold tracking-tight"
                style={{ color: business.brandColor }}
              >
                {business.name}
              </p>
              <p className="mt-1 text-[13px] leading-snug font-medium text-ink-soft">
                {cardText}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={code.dataUrl}
                alt={`${code.label} QR kodu`}
                className="my-2.5 aspect-square w-full max-w-40"
              />
              <p className="text-[11px] text-ink-faint">
                Kamerayı karekoda tutmanız yeterli
              </p>
              <p className="mt-2 border-t border-line pt-2 text-caption font-medium text-ink-muted">
                {code.label}
              </p>
              <a
                href={code.dataUrl}
                download={code.fileName}
                className="print-hidden mt-3 rounded-chip border border-line px-3 py-1.5 text-caption text-ink-soft hover:bg-canvas"
              >
                PNG indir
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
