import { CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SHIFTS } from "@/lib/constants";
import { gunAdi, gunBaslangici, gunEkle, gunGirdisi, gunGirdisindenTarih } from "@/lib/gun";
import { etkinVardiyalar } from "@/lib/vardiya";
import { EmptyState, PageHeader } from "@/components/ui";
import { DegisimTalebi } from "./DegisimTalebi";
import { IzinTalebi } from "./IzinTalebi";
import { IZIN_TURLERI, gecerliIzinTuru } from "@/lib/izin";

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

  // Hedef vardiya seçimi için: garson/manager tek bir işletmeye bağlı
  // (businessId sabit), o yüzden tek sorgu yetiyor.
  const isletmeVardiyalari = user.businessId
    ? await prisma.business.findUnique({
        where: { id: user.businessId },
        select: {
          vardiyaSabahAktif: true,
          vardiyaSabahSaat: true,
          vardiyaOgleAktif: true,
          vardiyaOgleSaat: true,
          vardiyaAksamAktif: true,
          vardiyaAksamSaat: true,
          vardiyaGeceAktif: true,
          vardiyaGeceSaat: true,
        },
      })
    : null;
  const vardiyaSecenekleri = isletmeVardiyalari
    ? etkinVardiyalar(isletmeVardiyalari).map((deger) => [deger, SHIFTS[deger]] as const)
    : [];

  // Kendi izin talepleri — en yeniler üstte, geçmiş kayıtlar da görünsün ki
  // "talebim ne oldu" sorusu ekranı terk etmeden cevaplansın.
  const izinTalepleri = await prisma.leaveRequest.findMany({
    where: { userId: user.id },
    orderBy: { baslangic: "desc" },
    take: 10,
    select: { id: true, baslangic: true, bitis: true, tur: true, status: true },
  });

  const gunler = new Map<string, typeof atamalar>();
  for (const atama of atamalar) {
    // Yerel gün: toISOString() UTC verdiği için UTC+3'te her vardiya bir
    // gün erken gruplanıyordu — garson kendi çizelgesinde yanlış günü
    // görüyordu. Panelin geri kalanı zaten gunGirdisi kullanıyor.
    const anahtar = gunGirdisi(atama.date);
    const liste = gunler.get(anahtar) ?? [];
    liste.push(atama);
    gunler.set(anahtar, liste);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        renk="teal"
        title="Vardiyalarım"
        description="Önümüzdeki iki hafta içinde size atanan vardiyalar."
      />

      {/* İzin talebi bir işletmeye bağlı olmayı gerektiriyor (kayıt o
          işletmeye açılıyor). Sahip/bölge müdürü tek bir işletmeye bağlı
          değil — onlara hep hata verecek bir form göstermek yerine bölüm
          hiç çizilmiyor; onlar izni "İzin & müsaitlik" ekranından girer. */}
      {user.businessId ? (
        <IzinTalebi
          gecmisTalepler={izinTalepleri.map((t) => ({
            id: t.id,
            baslangic: t.baslangic.toLocaleDateString("tr-TR"),
            bitis: t.bitis.toLocaleDateString("tr-TR"),
            tur: gecerliIzinTuru(t.tur) ? IZIN_TURLERI[t.tur] : t.tur,
            status: t.status,
          }))}
        />
      ) : null}

      {atamalar.length === 0 ? (
        <EmptyState>
          Şu an size atanmış bir vardiya yok. Yöneticiniz çizelgeyi
          güncelleyince burada görünecek.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...gunler.entries()].map(([anahtar, gunAtamalari]) => {
            const tarih = gunGirdisindenTarih(anahtar);
            const bugunMu = anahtar === gunGirdisi(bugun);
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
                      vardiyaSecenekleri={vardiyaSecenekleri}
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
