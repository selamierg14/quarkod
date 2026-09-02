import { MapPinned } from "lucide-react";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { AktifButonu, DurakEkleForm, DurakSilButonu, NewRotaForm, RotaSilButonu } from "./RotaForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Rotalar" };

/**
 * Biyerlere "kahve pasaportu" rotalarının platform yönetimi.
 *
 * Superadmin'e özel: bir rota farklı hesaplardaki işletmeleri bir araya
 * getirebiliyor (bkz. Rota modeli yorumu, schema.prisma), bu yüzden tek
 * bir hesap sahibinin yetki alanına girmiyor.
 */
export default async function RotalarPage() {
  await requireSuperadmin();

  const [rotalar, mekanlar] = await Promise.all([
    prisma.rota.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        duraklar: {
          orderBy: { sira: "asc" },
          include: { business: { select: { id: true, name: true } } },
        },
        _count: { select: { tamamlamalar: true } },
      },
    }),
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<MapPinned className="h-4 w-4" aria-hidden="true" />}
        renk="violet"
        title="Rotalar"
        description="Biyerlere'deki 'kahve pasaportu' — birkaç mekanı tek bir rotada toplar, hepsini gezen kullanıcı bonus puan ve rozet kazanır."
      />

      <SectionCard
        ikon={<MapPinned className="h-4 w-4" aria-hidden="true" />}
        renk="amber"
        title="Yeni rota"
        description="Önce rotayı aç, sonra durakları (mekanları) ekle."
      >
        <NewRotaForm />
      </SectionCard>

      {rotalar.length === 0 ? (
        <EmptyState>Henüz bir rota yok.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {rotalar.map((rota) => (
            <li key={rota.id} className="rounded-control bg-surface p-4 ring-1 ring-line">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{rota.ad}</p>
                  {rota.aciklama ? (
                    <p className="mt-0.5 text-small text-ink-muted">{rota.aciklama}</p>
                  ) : null}
                  <p className="mt-1 text-caption text-ink-faint">
                    {rota.duraklar.length} durak · {rota._count.tamamlamalar} kişi tamamladı
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AktifButonu id={rota.id} aktif={rota.aktif} />
                  <RotaSilButonu id={rota.id} />
                </div>
              </div>

              {rota.duraklar.length > 0 ? (
                <ol className="mt-3 flex flex-col gap-1.5">
                  {rota.duraklar.map((durak, i) => (
                    <li
                      key={durak.id}
                      className="flex items-center justify-between gap-2 rounded-chip bg-canvas px-3 py-1.5 text-small"
                    >
                      <span className="text-ink-soft">
                        {i + 1}. {durak.business.name}
                      </span>
                      <DurakSilButonu id={durak.id} />
                    </li>
                  ))}
                </ol>
              ) : null}

              <div className="mt-3">
                <DurakEkleForm rotaId={rota.id} mekanlar={mekanlar} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
