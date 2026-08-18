import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { abonelikKademe, kalanGun, type AbonelikKademe } from "@/lib/abonelik";
import { formatPrice } from "@/lib/menu";
import { formatDateTime, PageHeader } from "@/components/ui";
import { PaymentForm } from "./PaymentForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Abonelikler" };

/** Takip listesinde gösterilecek kademeler ve başlıkları — sakin/süresiz hariç. */
const GRUPLAR: { kademe: AbonelikKademe; baslik: string; renk: string }[] = [
  { kademe: "dolmus", baslik: "Süresi dolmuş", renk: "text-danger-ink" },
  { kademe: "kritik", baslik: "7 gün içinde dolacak", renk: "text-danger-ink" },
  { kademe: "yakin", baslik: "Yaklaşıyor (14 gün)", renk: "text-warning-ink" },
];

export default async function AboneliklerPage() {
  await requireSuperadmin();

  const hesaplar = await prisma.account.findMany({
    where: { active: true },
    orderBy: { expiresAt: "asc" },
    select: {
      id: true,
      name: true,
      expiresAt: true,
      active: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, amountKurus: true, note: true, createdAt: true, recordedBy: true, extendedTo: true },
      },
    },
  });

  const kademeli = hesaplar.map((h) => ({ ...h, kademe: abonelikKademe(h) }));

  // Toplam alınan ödeme (bilgi amaçlı üst şerit).
  const toplam = await prisma.payment.aggregate({ _sum: { amountKurus: true } });
  const toplamGelir = toplam._sum.amountKurus ?? 0;

  const takipEdilen = kademeli.filter((h) =>
    GRUPLAR.some((g) => g.kademe === h.kademe),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Abonelikler"
        description="Süresi dolan ve yaklaşan hesaplar. Ödeme geldiğinde kaydedip aynı yerden süreyi uzatabilirsin."
      />

      <div className="rounded-control bg-surface px-4 py-3 text-small ring-1 ring-line">
        <span className="text-ink-muted">Bugüne dek kaydedilen toplam ödeme: </span>
        <span className="font-semibold text-ink tabular">{formatPrice(toplamGelir)}</span>
      </div>

      {takipEdilen.length === 0 ? (
        <p className="rounded-control border border-dashed border-line-strong bg-surface p-8 text-center text-small text-ink-muted">
          Yaklaşan ya da dolmuş abonelik yok. Hepsi güncel. 👌
        </p>
      ) : (
        GRUPLAR.map((grup) => {
          const satirlar = kademeli.filter((h) => h.kademe === grup.kademe);
          if (satirlar.length === 0) return null;
          return (
            <section key={grup.kademe} className="flex flex-col gap-3">
              <h2 className={`text-heading font-semibold ${grup.renk}`}>
                {grup.baslik}{" "}
                <span className="text-caption font-normal text-ink-faint">
                  ({satirlar.length})
                </span>
              </h2>

              {satirlar.map((h) => {
                const gun = kalanGun(h);
                return (
                  <div
                    key={h.id}
                    className="rounded-control bg-surface p-4 ring-1 ring-line"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-ink">{h.name}</span>
                      <span className="text-caption text-ink-muted">
                        {h.expiresAt
                          ? h.kademe === "dolmus"
                            ? `${h.expiresAt.toLocaleDateString("tr-TR")} — süresi doldu`
                            : `${h.expiresAt.toLocaleDateString("tr-TR")} — ${gun} gün kaldı`
                          : "Süresiz"}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-line pt-3">
                      <PaymentForm accountId={h.id} />
                    </div>

                    {h.payments.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                        {h.payments.map((p) => (
                          <li
                            key={p.id}
                            className="flex flex-wrap items-baseline justify-between gap-2 text-caption text-ink-muted"
                          >
                            <span>
                              <span className="font-medium text-ink-soft tabular">
                                {formatPrice(p.amountKurus)}
                              </span>
                              {p.note ? ` · ${p.note}` : ""}
                              {p.extendedTo
                                ? ` · → ${p.extendedTo.toLocaleDateString("tr-TR")}`
                                : ""}
                            </span>
                            <span className="text-ink-faint">
                              {formatDateTime(p.createdAt)} · {p.recordedBy}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
