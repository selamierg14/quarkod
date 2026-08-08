import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { canAccessBusiness, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { qrCardText } from "@/lib/constants";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "QR kodları" };

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export default async function QrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  if (!canAccessBusiness(user, id)) notFound();

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
    business.tables.map(async (table) => {
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
      };
    }),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/admin/isletmeler/${business.id}`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← {business.name}
          </Link>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">QR kodları</h1>
          <p className="text-sm text-slate-500">
            {codes.length} QR · renk işletmenin marka renginden alınır
          </p>
        </div>
        <PrintButton />
      </div>

      {base.includes("localhost") ? (
        <p className="print-hidden rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          QR&apos;lar <code>{base}</code> adresini gösteriyor. Baskıya vermeden
          önce <code>.env</code> içindeki <code>NEXT_PUBLIC_APP_URL</code> değerini
          gerçek alan adınızla değiştirin.
        </p>
      ) : null}

      {codes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Aktif masa yok. Önce işletme sayfasından masa ekleyin.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-0">
          {codes.map((code) => (
            <div
              key={code.id}
              className="print-break flex flex-col items-center rounded-xl bg-white p-4 text-center ring-1 ring-slate-200 print:rounded-none print:p-5 print:ring-0 print:outline print:outline-1 print:outline-dashed print:outline-slate-300"
            >
              <p
                className="text-base font-bold tracking-tight"
                style={{ color: business.brandColor }}
              >
                {business.name}
              </p>
              <p className="mt-1 text-[13px] leading-snug font-medium text-slate-700">
                {cardText}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={code.dataUrl}
                alt={`${code.label} QR kodu`}
                className="my-2.5 aspect-square w-full max-w-40"
              />
              <p className="text-[11px] text-slate-400">
                Kamerayı karekoda tutmanız yeterli
              </p>
              <p className="mt-2 border-t border-slate-100 pt-2 text-xs font-medium text-slate-500">
                {code.label}
              </p>
              <a
                href={code.dataUrl}
                download={code.fileName}
                className="print-hidden mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
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
