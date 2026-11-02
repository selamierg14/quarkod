import { Store } from "lucide-react";
import Link from "next/link";
import { requireTenant, requireUser, visibleBusinesses } from "@/lib/kimlik/auth";
import { effectiveAccountId } from "@/lib/kimlik/impersonation";
import { PlatformOzeti } from "./PlatformOzeti";
import { getBusinessStats, type BusinessStats } from "@/lib/rapor/stats";
import { biyerlereIstatistikGetir } from "@/lib/biyerlere/biyerlere-istatistik";
import { prisma } from "@/lib/cekirdek/db";
import { gunBaslangici, gunEkle } from "@/lib/cekirdek/gun";
import { vardiyaAraligi } from "@/lib/personel/vardiya";
import { masaEtiketi } from "@/lib/isletme/masa";
import { trSirala } from "@/lib/cekirdek/text";
import { BiyerlereIstatistikKarti } from "./BiyerlereIstatistikKarti";
import { EmptyState, SegmentGroup, SegmentLink, TabLink, buttonClass } from "@/components/ui";
import { OnboardingKarti } from "./OnboardingKarti";
import {
  BuAksam,
  GununAkisi,
  KategoriKarnesi,
  SayiSatiri,
  ServisFisleri,
  VardiyaAkisi,
  ondalikSaat,
  saatMetni,
  type Fis,
  type VardiyaSatiri,
} from "./OzetParcalari";

export const dynamic = "force-dynamic";

export const metadata = { title: "Özet" };

/** Kategori ortalamalarını işletmeler arasında kayıt sayısıyla birleştirir. */
function kategorileriBirlestir(stats: BusinessStats[]) {
  const kova = new Map<string, { toplam: number; adet: number }>();
  for (const s of stats) {
    for (const k of s.weakCategories) {
      const mevcut = kova.get(k.name) ?? { toplam: 0, adet: 0 };
      mevcut.toplam += k.average * k.count;
      mevcut.adet += k.count;
      kova.set(k.name, mevcut);
    }
  }
  return [...kova.entries()]
    .filter(([, v]) => v.adet > 0)
    .map(([name, v]) => ({ name, average: v.toplam / v.adet, count: v.adet }))
    .sort((a, b) => a.average - b.average);
}

/** Birden çok işletme seçiliyse sorun alanlarını tek listede toplar. */
function sorunlariBirlestir(stats: BusinessStats[]) {
  const kova = new Map<string, { kategori: string; alan: string; count: number }>();
  for (const s of stats) {
    for (const p of s.topProblems) {
      const anahtar = `${p.kategori}\u0000${p.alan}`;
      const mevcut = kova.get(anahtar) ?? { kategori: p.kategori, alan: p.alan, count: 0 };
      mevcut.count += p.count;
      kova.set(anahtar, mevcut);
    }
  }
  return [...kova.values()].sort(
    (a, b) => b.count - a.count || a.kategori.localeCompare(b.kategori, "tr"),
  );
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  // Hesap seçmemiş platform yöneticisi kendi özetini görüyor. Önceden
  // requireTenant onu Hesaplar'a yönlendiriyordu: önce bu sayfanın
  // iskeleti görünüyor, sonra başka bir sayfa açılıyordu.
  const oturum = await requireUser();
  if (oturum.role === "superadmin" && !(await effectiveAccountId(oturum))) {
    return <PlatformOzeti />;
  }
  const user = await requireTenant();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  const secili =
    query.isletme && businesses.some((b) => b.id === query.isletme)
      ? businesses.filter((b) => b.id === query.isletme)
      : businesses;

  const stats = await getBusinessStats(secili.map((b) => b.id));
  const biyerlereGoster = user.moduller.includes("kesfet");
  const biyerlereIstatistik = biyerlereGoster
    ? await biyerlereIstatistikGetir(secili.map((b) => b.id))
    : null;

  const toplam = stats.reduce((a, s) => a + s.total, 0);
  const acik = stats.reduce((a, s) => a + s.openComplaints, 0);
  const son7 = stats.reduce((a, s) => a + s.last7Days, 0);
  const googleShown = stats.reduce((a, s) => a + s.googleShown, 0);
  const googleClicked = stats.reduce((a, s) => a + s.googleClicked, 0);
  /**
   * Kart "son 30 gün"ü gösteriyor, eğilim de aynı dönemi önceki 30 günle
   * kıyaslıyor. Önceden etiket "Bu haftaki ortalama", değer TÜM ZAMANLARIN
   * ortalaması, eğilim ise 30/30 karşılaştırmasıydı — üç ayrı dönem. QA
   * ekranda "ortalama 3.8" yanında "son 7 günde 0" görünce yakaladı.
   * Dönemde kayıt yoksa ortalama gösterilmiyor.
   */
  const son30 = stats.reduce((a, s) => a + s.last30Count, 0);
  const ortalama =
    son30 > 0
      ? stats.reduce((a, s) => a + (s.last30Average ?? 0) * s.last30Count, 0) / son30
      : null;

  // Değişim: işletme başına delta'ların kayıt ağırlıklı ortalaması.
  const deltali = stats.filter((s) => s.delta !== null && s.total > 0);
  const delta = deltali.length
    ? deltali.reduce((a, s) => a + (s.delta ?? 0) * s.total, 0) /
      deltali.reduce((a, s) => a + s.total, 0)
    : null;

  // Yalnızca en zayıf altı başlık: liste uzadıkça "önce şuna bak" mesajı
  // kayboluyor, kırılım ekranı zaten tamamını gösteriyor.
  const kategoriler = kategorileriBirlestir(stats).slice(0, 6);
  const sorunlar = sorunlariBirlestir(stats).slice(0, 5);

  // "Ateş var mı?" ekranı: eşiğin altında kalmış ve hâlâ çözülmemiş kayıtlar.
  // Eşik işletmeye göre değiştiği için filtre işletme başına kuruluyor.
  const acilKayitlar = stats.length
    ? await prisma.feedback.findMany({
        where: {
          status: { not: "cozuldu" },
          OR: stats.map((s) => ({
            businessId: s.id,
            overallRating: { lte: s.notifyThreshold },
          })),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { business: true, table: true },
      })
    : [];

  if (businesses.length === 0) {
    return (
      <EmptyState baslik="Henüz işletme yok" ikon={<Store className="h-5 w-5" aria-hidden="true" />}>
        Bir işletme ekleyip masalarını tanımladıktan sonra özet burada oluşur.
      </EmptyState>
    );
  }

  const anketVar = user.moduller.includes("anket");
  const personelVar = user.moduller.includes("personel") || user.moduller.includes("mesai");
  const rezervasyonVar = user.moduller.includes("rezervasyon");
  const seciliIdler = secili.map((b) => b.id);
  const tekIsletme = secili.length === 1 ? secili[0] : null;

  const simdi = new Date();
  const bugun = gunBaslangici(simdi);
  const yarin = gunEkle(bugun, 1);

  // Bugüne ait parçalar paralel; modülü kapalı olan sorgulanmıyor.
  const [bugunGeriBildirim, atamalar, mesailer, rezervasyonlar] = await Promise.all([
    anketVar
      ? prisma.feedback.findMany({
          where: { businessId: { in: seciliIdler }, createdAt: { gte: bugun, lt: yarin } },
          select: { id: true, createdAt: true, overallRating: true, table: { select: { tableNumber: true, isEntrance: true } } },
          orderBy: { createdAt: "asc" },
          take: 200,
        })
      : Promise.resolve([]),
    // Vardiya şeması tek işletmede anlamlı: iki şubenin kadrosu aynı
    // eksende karışır.
    personelVar && tekIsletme
      ? prisma.shiftAssignment.findMany({
          where: { businessId: tekIsletme.id, date: { gte: bugun, lt: yarin } },
          select: { userId: true, shift: true, user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    personelVar && tekIsletme && user.moduller.includes("mesai")
      ? prisma.mesaiKaydi.findMany({
          where: { businessId: tekIsletme.id, giris: { gte: bugun, lt: yarin } },
          select: { userId: true, giris: true, cikis: true, user: { select: { name: true } } },
          orderBy: { giris: "asc" },
        })
      : Promise.resolve([]),
    rezervasyonVar
      ? prisma.rezervasyon.findMany({
          where: {
            businessId: { in: seciliIdler },
            baslangic: { gte: simdi, lt: yarin },
            durum: { notIn: ["iptal", "gelmedi", "tamamlandi"] },
          },
          orderBy: { baslangic: "asc" },
          take: 8,
          select: {
            id: true,
            misafirAdi: true,
            kisiSayisi: true,
            baslangic: true,
            durum: true,
            masalar: { select: { masa: { select: { tableNumber: true, isEntrance: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Şube karşılaştırma yalnızca birden fazla işletmesi olan sahip/platform
  // yöneticisi için anlamlı; anket modülü kapalıysa sekme de görünmemeli.
  const kiyaslamaGoster =
    businesses.length > 1 &&
    (user.role === "owner" || user.role === "superadmin") &&
    anketVar;

  const gunAdi = simdi.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long" });
  const tarih = simdi.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" });
  const dusukBugun = bugunGeriBildirim.filter((f) => f.overallRating <= 2).length;
  const simdiSaat = ondalikSaat(simdi);

  // --- Servis fişleri: eşiğin altında, çözülmemiş
  const fisler: Fis[] = acilKayitlar.map((f) => {
    const puanlar: Record<string, number> = f.categoryRatings ? JSON.parse(f.categoryRatings) : {};
    const zayif = Object.entries(puanlar)
      .filter(([, v]) => v <= 2)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([ad, v]) => `${ad.toLocaleLowerCase("tr")} ${v}`)
      .join(" · ");
    const gun = f.createdAt >= bugun ? "" : f.createdAt >= gunEkle(bugun, -1) ? "dün " : `${f.createdAt.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short" })} `;
    return {
      id: f.id,
      masa: f.table ? masaEtiketi(f.table) : "Masa —",
      puan: f.overallRating,
      zaman: `${gun}${saatMetni(f.createdAt)}`,
      isletme: secili.length > 1 ? f.business.name : undefined,
      yorum: f.comment,
      zayif,
    };
  });

  // --- Vardiya akışı: atama + mesai okutması, kişi başına bir satır
  const vardiyaSatirlari: VardiyaSatiri[] = [];
  if (tekIsletme) {
    const kisiler = new Map<string, VardiyaSatiri>();
    for (const a of atamalar) {
      const aralik = vardiyaAraligi(a.shift as Parameters<typeof vardiyaAraligi>[0], tekIsletme);
      const mevcut = kisiler.get(a.userId);
      kisiler.set(a.userId, {
        ad: a.user.name,
        planBas: Math.min(mevcut?.planBas ?? 99, aralik?.bas ?? 99),
        planSon: Math.max(mevcut?.planSon ?? -1, aralik?.son ?? -1),
        giris: null,
        cikis: null,
        durum: "",
        durumTonu: "notr",
      });
    }
    for (const m of mesailer) {
      const k =
        kisiler.get(m.userId) ??
        ({ ad: m.user.name, planBas: null, planSon: null, giris: null, cikis: null, durum: "", durumTonu: "notr" } as VardiyaSatiri);
      // İlk giriş, son çıkış; açık kayıt varsa çıkış yok (uydurma saat yok).
      if (k.giris === null) k.giris = ondalikSaat(m.giris);
      k.cikis = m.cikis ? ondalikSaat(m.cikis) : null;
      kisiler.set(m.userId, k);
    }
    for (const k of kisiler.values()) {
      if (k.planBas === 99) k.planBas = null;
      if (k.planSon === -1) k.planSon = null;
      if (k.giris !== null) {
        const gec = k.planBas !== null && k.giris - k.planBas > 10 / 60;
        k.durum = k.cikis !== null ? `çıktı · ${saatMetinOndalik(k.cikis)}` : `${gec ? "geç" : "içeride"} · ${saatMetinOndalik(k.giris)}`;
        k.durumTonu = k.cikis !== null ? "notr" : gec ? "uyari" : "iyi";
      } else if (k.planBas !== null && simdiSaat > k.planBas + 0.25) {
        k.durum = "giriş yapmadı";
        k.durumTonu = "kotu";
      } else if (k.planBas !== null) {
        k.durum = `${saatMetinOndalik(k.planBas)} gelecek`;
        k.durumTonu = "notr";
      }
      vardiyaSatirlari.push(k);
    }
  }
  const vardiyaSirali = trSirala(vardiyaSatirlari, (k) => k.ad).sort(
    (a, b) => (a.planBas ?? a.giris ?? 99) - (b.planBas ?? b.giris ?? 99),
  );

  return (
    <div className="flex flex-col gap-10">
      {kiyaslamaGoster ? (
        <div className="print-hidden -mb-4 flex gap-1 border-b border-line">
          <TabLink href="/admin" active>
            Genel
          </TabLink>
          <TabLink href="/admin/kiyaslama" active={false}>
            Şube karşılaştırma
          </TabLink>
        </div>
      ) : null}

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-small text-ink-faint">{secili.length === 1 ? secili[0].name : "Tüm işletmeler"}</p>
            <h1 className="mt-1 font-display text-[36px] leading-none font-medium tracking-[-0.03em] text-ink">
              <span className="capitalize">{gunAdi}</span>, <span className="font-bold">{tarih}</span>
            </h1>
            {anketVar ? (
              <p className="mt-2.5 text-ink-muted">
                Bugün <strong className="text-ink">{bugunGeriBildirim.length} geri bildirim</strong>
                {dusukBugun > 0 ? (
                  <>
                    , <strong className="text-danger">{dusukBugun} düşük puan</strong>
                  </>
                ) : null}
                .
              </p>
            ) : null}
          </div>
          {tekIsletme && user.role !== "garson" ? (
            <Link href={`/admin/isletmeler/${tekIsletme.id}/qr`} className={buttonClass({ size: "md" })}>
              QR kodlarını yazdır
            </Link>
          ) : null}
        </div>

        {businesses.length > 1 ? (
          <SegmentGroup label="İşletme">
            <SegmentLink href="/admin" active={secili.length > 1}>
              Tümü
            </SegmentLink>
            {businesses.map((b) => (
              <SegmentLink key={b.id} href={`/admin?isletme=${b.id}`} active={secili.length === 1 && secili[0].id === b.id}>
                {b.name}
              </SegmentLink>
            ))}
          </SegmentGroup>
        ) : null}

        {anketVar ? (
          <>
            <GununAkisi
              simdi={simdiSaat}
              noktalar={bugunGeriBildirim.map((f) => ({
                saat: ondalikSaat(f.createdAt),
                puan: f.overallRating,
                etiket: `${saatMetni(f.createdAt)} · ${f.table ? masaEtiketi(f.table) : "Masa —"} · ${f.overallRating} puan`,
                href: `/admin/geri-bildirimler/${f.id}`,
              }))}
            />
            <SayiSatiri
              sayilar={[
                {
                  etiket: "Ortalama, son 30 gün",
                  deger: ortalama !== null ? ortalama.toFixed(1).replace(".", ",") : "—",
                  not:
                    ortalama === null
                      ? "veri yok"
                      : delta === null || Math.abs(delta) < 0.1
                        ? "sabit"
                        : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1).replace(".", ",")}`,
                  tonu: ortalama === null || delta === null || Math.abs(delta) < 0.1 ? "notr" : delta > 0 ? "iyi" : "kotu",
                },
                { etiket: "Geri bildirim", deger: String(toplam), not: `son 7 gün ${son7}` },
                {
                  etiket: "Yanıt bekleyen",
                  deger: String(acik),
                  not: acik > 0 ? "eşiğin altında" : "bekleyen yok",
                  tonu: acik > 0 ? "dikkat" : "notr",
                },
                {
                  etiket: "Google'a yönlenen",
                  deger: googleShown ? `%${Math.round((googleClicked / googleShown) * 100)}` : "—",
                  not: `${googleClicked} / ${googleShown}`,
                },
              ]}
            />
          </>
        ) : null}
      </section>

      <OnboardingKarti user={user} businesses={businesses} />

      {anketVar ? (
        <ServisFisleri
          fisler={fisler}
          eylem={
            <Link href="/admin/geri-bildirimler" className="font-semibold text-ink hover:text-accent-700">
              Tüm geri bildirimler →
            </Link>
          }
        />
      ) : null}

      {anketVar || (personelVar && tekIsletme) ? (
        <div className="flex flex-wrap items-start gap-x-12 gap-y-10">
          {anketVar ? (
            <div className="min-w-0 flex-[1_1_320px]">
              <KategoriKarnesi
                kategoriler={kategoriler.map((k) => ({ ad: k.name, ortalama: k.average, adet: k.count }))}
                sorunlar={sorunlar.map((p) => ({ kategori: p.kategori, alan: p.alan, adet: p.count }))}
              />
            </div>
          ) : null}
          {personelVar && tekIsletme ? (
            <div className="min-w-0 flex-[1.4_1_420px]">
              <VardiyaAkisi
                satirlar={vardiyaSirali}
                simdi={simdiSaat}
                eylem={
                  user.moduller.includes("mesai") ? (
                    <Link href="/admin/mesai" className="font-semibold text-ink hover:text-accent-700">
                      Mesai raporu →
                    </Link>
                  ) : (
                    <Link href="/admin/vardiya-planlama" className="font-semibold text-ink hover:text-accent-700">
                      Çizelge →
                    </Link>
                  )
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {rezervasyonVar ? (
        <BuAksam
          rezervasyonlar={rezervasyonlar.map((r) => ({
            id: r.id,
            saat: saatMetni(r.baslangic),
            ad: r.misafirAdi,
            kisi: r.kisiSayisi,
            masa: r.masalar.length ? r.masalar.map((m) => masaEtiketi(m.masa)).join(" + ") : "masa atanmadı",
            durum: r.durum === "bekliyor" ? "Onay bekliyor" : r.durum === "oturdu" ? "Oturdu" : "Onaylı",
            bekliyor: r.durum === "bekliyor",
          }))}
          eylem={
            <Link href="/admin/rezervasyon" className="font-semibold text-ink hover:text-accent-700">
              Masa durumu →
            </Link>
          }
        />
      ) : null}

      {biyerlereIstatistik ? <BiyerlereIstatistikKarti istatistik={biyerlereIstatistik} /> : null}
    </div>
  );
}

/** 16.5 → "16:30" */
function saatMetinOndalik(saat: number): string {
  const s = Math.floor(saat);
  const d = Math.round((saat - s) * 60);
  return `${String(s).padStart(2, "0")}:${String(d).padStart(2, "0")}`;
}
