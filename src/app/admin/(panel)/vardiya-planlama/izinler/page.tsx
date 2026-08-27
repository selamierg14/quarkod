import { CalendarOff } from "lucide-react";
import { requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { IZIN_TURLERI, gecerliIzinTuru } from "@/lib/izin";
import { gunBaslangici, gunEkle } from "@/lib/gun";
import { IsletmeSecici } from "../../menu/MenuUst";
import { izinKararVer, izniGeriAl } from "./actions";
import { IzinEkleForm } from "./IzinFormlari";
import { VardiyaSekmeleri } from "../VardiyaSekmeleri";

export const dynamic = "force-dynamic";

export const metadata = { title: "İzin & müsaitlik" };

/** Geçmişe doğru bu kadar geriye bakılır; eski izinler listeyi şişirmesin. */
const GERIYE_GUN = 30;

function tarihAraligi(baslangic: Date, bitis: Date): string {
  const bicim = (d: Date) => d.toLocaleDateString("tr-TR");
  return baslangic.getTime() === bitis.getTime()
    ? bicim(baslangic)
    : `${bicim(baslangic)} – ${bicim(bitis)}`;
}

export default async function IzinlerPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requirePersonelYonetimi();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  const esik = gunEkle(gunBaslangici(), -GERIYE_GUN);

  const [personel, izinler] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: secili.id, active: true, role: { in: ["manager", "garson"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.leaveRequest.findMany({
      // Bekleyen talepler tarihi ne olursa olsun görünmeli: geçmişe düşmüş
      // ama karara bağlanmamış bir talep sessizce kaybolmasın.
      where: {
        businessId: secili.id,
        OR: [{ status: "bekliyor" }, { bitis: { gte: esik } }],
      },
      orderBy: [{ status: "asc" }, { baslangic: "desc" }],
      include: {
        user: { select: { name: true } },
        decidedBy: { select: { name: true } },
      },
    }),
  ]);

  const bekleyenler = izinler.filter((i) => i.status === "bekliyor");
  const digerleri = izinler.filter((i) => i.status !== "bekliyor");

  return (
    <div className="flex flex-col gap-5">
      <VardiyaSekmeleri aktif="izinler" />

      <PageHeader
        ikon={<CalendarOff className="h-4 w-4" aria-hidden="true" />}
        renk="rose"
        title="İzin & müsaitlik"
        description="Onaylanan izinler çizelgede o kişinin hücresinde görünür; izinli birine vardiya yazmaya çalışırsanız uyarır. Personel kendi ekranından talep açabilir, siz buradan doğrudan da girebilirsiniz."
      />

      <IsletmeSecici
        businesses={businesses}
        seciliId={secili.id}
        taban="/admin/vardiya-planlama/izinler"
      />

      {bekleyenler.length > 0 ? (
        <SectionCard
          ikon={<CalendarOff className="h-4 w-4" aria-hidden="true" />}
          renk="amber"
          title={`Bekleyen talepler (${bekleyenler.length})`}
          description="Onaylanana kadar çizelgeye yansımaz."
          padded={false}
        >
          <ul className="divide-y divide-line">
            {bekleyenler.map((izin) => (
              <li
                key={izin.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span className="min-w-0">
                  <span className="font-medium text-ink">{izin.user.name}</span>
                  <span className="ml-2 text-small text-ink-muted">
                    {tarihAraligi(izin.baslangic, izin.bitis)}
                  </span>
                  <span className="ml-2 rounded-chip bg-sunken px-2 py-0.5 text-caption text-ink-soft">
                    {gecerliIzinTuru(izin.tur) ? IZIN_TURLERI[izin.tur] : izin.tur}
                  </span>
                  {izin.aciklama ? (
                    <span className="mt-0.5 block text-caption text-ink-faint">
                      &quot;{izin.aciklama}&quot;
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <form action={izinKararVer}>
                    <input type="hidden" name="id" value={izin.id} />
                    <input type="hidden" name="karar" value="onayla" />
                    <button
                      type="submit"
                      className="rounded-chip bg-success px-3 py-1.5 text-caption font-medium text-white transition hover:brightness-110"
                    >
                      Onayla
                    </button>
                  </form>
                  <form action={izinKararVer}>
                    <input type="hidden" name="id" value={izin.id} />
                    <input type="hidden" name="karar" value="reddet" />
                    <button
                      type="submit"
                      className="rounded-chip border border-line px-3 py-1.5 text-caption text-ink-soft transition hover:bg-canvas"
                    >
                      Reddet
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <IzinEkleForm businessId={secili.id} personel={personel} />

      <SectionCard
        ikon={<CalendarOff className="h-4 w-4" aria-hidden="true" />}
        renk="slate"
        title="İzin kayıtları"
        description={`Son ${GERIYE_GUN} gün ve ilerisi.`}
        padded={false}
      >
        {digerleri.length === 0 ? (
          <p className="px-5 py-6 text-center text-small text-ink-muted">
            Henüz kayıtlı izin yok.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {digerleri.map((izin) => {
              const onayli = izin.status === "onaylandi";
              return (
                <li
                  key={izin.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <span className="min-w-0">
                    <span
                      className={`font-medium ${onayli ? "text-ink" : "text-ink-faint line-through"}`}
                    >
                      {izin.user.name}
                    </span>
                    <span className="ml-2 text-small text-ink-muted">
                      {tarihAraligi(izin.baslangic, izin.bitis)}
                    </span>
                    <span className="ml-2 rounded-chip bg-sunken px-2 py-0.5 text-caption text-ink-soft">
                      {gecerliIzinTuru(izin.tur) ? IZIN_TURLERI[izin.tur] : izin.tur}
                    </span>
                    <span className="mt-0.5 block text-caption text-ink-faint">
                      {onayli ? "Onaylandı" : "Reddedildi / geri alındı"}
                      {izin.decidedBy ? ` · ${izin.decidedBy.name}` : ""}
                      {izin.aciklama ? ` · "${izin.aciklama}"` : ""}
                    </span>
                  </span>
                  {onayli ? (
                    <form action={izniGeriAl} className="shrink-0">
                      <input type="hidden" name="id" value={izin.id} />
                      <button
                        type="submit"
                        title="Kayıt silinmez, geri alındı olarak işaretlenir"
                        className="rounded-chip border border-line px-3 py-1.5 text-caption text-ink-soft transition hover:bg-danger-soft hover:text-danger-ink"
                      >
                        Geri al
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
