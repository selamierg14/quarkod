import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SHIFTS } from "@/lib/constants";
import { gunAdi, gunBaslangici, gunEkle } from "@/lib/gun";
import { EmptyState } from "@/components/ui";
import { DegisimTalebi } from "./DegisimTalebi";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vardiyalarım" };

/**
 * Kendi vardiya çizelgesi — yalnızca oturum sahibinin kendi atamaları.
 * `requireTenant` değil `requireUser` kullanıyor: garson zaten buraya
 * requireTenant'ın kendisinden yönlendiriliyor, bu sayfa döngüye
 * girmemeli.
 */
export default async function VardiyalarimPage() {
  const user = await requireUser();

  const bugun = gunBaslangici();
  const baslangic = gunEkle(bugun, -1);
  const bitis = gunEkle(bugun, 13);

  const atamalar = await prisma.shiftAssignment.findMany({
    where: { userId: user.id, date: { gte: baslangic, lte: bitis } },
    orderBy: [{ date: "asc" }, { shift: "asc" }],
    include: { business: { select: { name: true, brandColor: true } } },
  });

  const bekleyenTalepler = atamalar.length
    ? await prisma.shiftSwapRequest.findMany({
        where: { assignmentId: { in: atamalar.map((a) => a.id) }, status: "bekliyor" },
        select: { assignmentId: true },
      })
    : [];
  const bekleyenSet = new Set(bekleyenTalepler.map((t) => t.assignmentId));

  const gunler = new Map<string, typeof atamalar>();
  for (const atama of atamalar) {
    const anahtar = atama.date.toISOString().slice(0, 10);
    const liste = gunler.get(anahtar) ?? [];
    liste.push(atama);
    gunler.set(anahtar, liste);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title font-semibold">Vardiyalarım</h1>
        <p className="mt-1 text-small text-ink-muted">
          Önümüzdeki iki hafta içinde size atanan vardiyalar.
        </p>
      </div>

      {atamalar.length === 0 ? (
        <EmptyState>
          Şu an size atanmış bir vardiya yok. Yöneticiniz çizelgeyi
          güncelleyince burada görünecek.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...gunler.entries()].map(([anahtar, gunAtamalari]) => {
            const tarih = new Date(anahtar);
            const bugunMu = anahtar === bugun.toISOString().slice(0, 10);
            return (
              <li
                key={anahtar}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-control p-4 ring-1 ${
                  bugunMu ? "bg-ink text-white ring-ink" : "bg-surface ring-line"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {gunAdi(tarih)}
                    {bugunMu ? " · bugün" : ""}
                  </p>
                  <p className={`text-caption ${bugunMu ? "text-white/70" : "text-ink-faint"}`}>
                    {tarih.toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gunAtamalari.map((a) => (
                    <DegisimTalebi
                      key={a.id}
                      assignmentId={a.id}
                      label={`${SHIFTS[a.shift as keyof typeof SHIFTS] ?? a.shift} · ${a.business.name}`}
                      bekliyor={bekleyenSet.has(a.id)}
                      koyu={bugunMu}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
