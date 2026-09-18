import Link from "next/link";
import { Smartphone, Star, CalendarClock, ClipboardCheck } from "lucide-react";
import { requireUser, visibleBusinesses } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { gunBaslangici, gunEkle } from "@/lib/cekirdek/gun";
import { SHIFTS } from "@/lib/cekirdek/constants";
import { vardiyaHesapla } from "@/lib/personel/vardiya";
import { modulVarMi } from "@/lib/kimlik/moduller";
import { IsletmeSecici } from "../menu/MenuUst";
import { FlasIndirim } from "../biyerlere/FlasIndirim";
import { BekleyenTalepler, type BekleyenTalep } from "./BekleyenTalepler";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cep modu" };

/**
 * CEP MODU — salondayken açılan tek ekran.
 *
 * Panelin tamamı telefonda çalışıyor ama salonda kimse menüden gezinip
 * ekran aramıyor: kafe sahibi ayakta, garson elinde tepsiyle. Bu sayfa,
 * telefondan yapılan İŞLERİ bir araya getiriyor — ve yalnızca onları:
 *
 *   1. Az önce düşük puan geldi mi, hemen yanıtlayabilir miyim?
 *   2. Uygulamadan rezervasyon talebi var mı, onaylayayım.
 *   3. Bir şey duyurmam lazım (flaş duyuru) — masaüstüne oturmadan.
 *   4. Bugün kim çalışıyor, açılış listesi tamam mı?
 *
 * Raporlar, kullanıcı yönetimi ve kat planı bilerek YOK: onlar oturup
 * yapılan işler ve panelde zaten yerleri var. Buraya da koymak, sayfayı
 * "küçük bir panel"e çevirip asıl işini kaybettirirdi.
 */
export default async function CepPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireUser();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  // Modül kapalıysa bölüm hiç çizilmiyor: satın alınmamış bir özelliğin
  // boş kutusunu göstermek, panelin geri kalanındaki kuralla çelişirdi.
  const anketVar = modulVarMi(user.role, user.moduller, "anket");
  const kesfetVar = modulVarMi(user.role, user.moduller, "kesfet");
  const simdi = new Date();
  const bugun = gunBaslangici(simdi);

  const [isletme, dusukPuanlar, talepler, vardiyalar, gorevSayilari] = await Promise.all([
    prisma.business.findUnique({
      where: { id: secili.id },
      select: {
        name: true,
        notifyThreshold: true,
        pushKredisi: true,
        rezervasyonAcik: true,
        vardiyaSabahAktif: true,
        vardiyaSabahSaat: true,
        vardiyaOgleAktif: true,
        vardiyaOgleSaat: true,
        vardiyaAksamAktif: true,
        vardiyaAksamSaat: true,
        vardiyaGeceAktif: true,
        vardiyaGeceSaat: true,
      },
    }),
    /**
     * Açık kalmış düşük puanlar. Tarih sınırı YOK, durum sınırı var:
     * "üç gün önce gelmiş ama kimse dokunmamış" tam da görülmesi gereken
     * kayıt. Yediyle sınırlı çünkü bu bir liste ekranı değil, bir
     * hatırlatma.
     */
    prisma.feedback.findMany({
      where: { businessId: secili.id, status: "yeni" },
      orderBy: { createdAt: "desc" },
      take: 7,
      select: {
        id: true,
        overallRating: true,
        comment: true,
        createdAt: true,
        contactInfo: true,
      },
    }),
    prisma.rezervasyon.findMany({
      where: {
        businessId: secili.id,
        kanal: "biyerlere",
        durum: "bekliyor",
        baslangic: { gte: simdi },
      },
      orderBy: { baslangic: "asc" },
      take: 10,
      select: {
        id: true,
        misafirAdi: true,
        telefon: true,
        kisiSayisi: true,
        not: true,
        baslangic: true,
        masalar: { select: { masa: { select: { tableNumber: true } } } },
      },
    }),
    prisma.shiftAssignment.findMany({
      where: { businessId: secili.id, date: { gte: bugun, lt: gunEkle(bugun, 1) } },
      select: { shift: true, user: { select: { name: true } } },
    }),
    prisma.checklistItem.count({ where: { businessId: secili.id, active: true } }),
  ]);

  const esik = isletme?.notifyThreshold ?? 3;
  const bekleyenTalepler: BekleyenTalep[] = talepler.map((t) => ({
    id: t.id,
    misafirAdi: t.misafirAdi,
    telefon: t.telefon,
    kisiSayisi: t.kisiSayisi,
    not: t.not,
    baslangic: t.baslangic.toISOString(),
    masaAdi: t.masalar[0] ? `Masa ${t.masalar[0].masa.tableNumber}` : null,
  }));

  // Vardiya saatleri işletmeye göre değişiyor (bkz. lib/personel/vardiya.ts);
  // sabit üçlü her mekana uymuyor.
  const suAnkiVardiya = isletme ? vardiyaHesapla(simdi, isletme) : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Cep modu"
        description="Salondayken telefondan yapılan işler tek ekranda."
      />

      {businesses.length > 1 ? (
        <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/cep" />
      ) : null}

      {anketVar ? (
      <SectionCard
        title={`Yanıt bekleyen geri bildirimler (${dusukPuanlar.length})`}
        description="Müşteri hâlâ oradayken dönmek, ertesi gün dönmekten kıyas kabul etmez şekilde değerli."
      >
        {dusukPuanlar.length === 0 ? (
          <p className="text-small text-ink-faint">Açık geri bildirim yok. 👌</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dusukPuanlar.map((geri) => (
              <li key={geri.id}>
                <Link
                  href={`/admin/geri-bildirimler/${geri.id}`}
                  className="flex items-start gap-3 rounded-card border border-line bg-surface p-3 hover:bg-sunken"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-small font-semibold ${
                      geri.overallRating <= esik
                        ? "bg-danger-soft text-danger-ink"
                        : "bg-sunken text-ink-soft"
                    }`}
                  >
                    {geri.overallRating}
                    <Star className="ml-0.5 h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small text-ink">
                      {geri.comment ?? "Yorum bırakılmamış"}
                    </span>
                    <span className="text-caption text-ink-faint">
                      {geri.createdAt.toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {geri.contactInfo ? " · yanıtlanabilir" : " · iletişim yok"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      ) : null}

      {isletme?.rezervasyonAcik ? (
        <SectionCard
          title={`Bekleyen rezervasyon talepleri (${bekleyenTalepler.length})`}
          description="Uygulamadan gelen talepler; onaylamazsanız misafir belirsizlikte kalır."
        >
          <BekleyenTalepler businessId={secili.id} talepler={bekleyenTalepler} />
        </SectionCard>
      ) : null}

      {kesfetVar ? (
        <SectionCard
          title="Flaş duyuru"
          description="Başlığı yaz, süreyi seç: çevredeki Biyerlere kullanıcılarına anlık bildirim gider."
        >
          <FlasIndirim businessId={secili.id} pushKredisi={isletme?.pushKredisi ?? 0} />
        </SectionCard>
      ) : null}

      <SectionCard title="Bugün" description="Vardiya ve açılış/kapanış listesi.">
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-soft">
            Şu anki vardiya: <strong>{suAnkiVardiya ? SHIFTS[suAnkiVardiya] : "tanımsız"}</strong> ·{" "}
            {vardiyalar.length > 0
              ? vardiyalar.map((v) => v.user.name).join(", ")
              : "bugün için atama yok"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/vardiyalarim"
              className="flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-small text-ink hover:bg-sunken"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Vardiyalarım
            </Link>
            {gorevSayilari > 0 ? (
              <Link
                href="/admin/gorevlerim"
                className="flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-small text-ink hover:bg-sunken"
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                Görevlerim ({gorevSayilari})
              </Link>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
