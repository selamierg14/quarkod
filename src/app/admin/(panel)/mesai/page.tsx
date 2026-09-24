import Link from "next/link";
import { headers } from "next/headers";
import { Clock } from "lucide-react";
import QRCode from "qrcode";
import { requireMesaiErisim, visibleBusinesses } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { appUrl } from "@/lib/cekirdek/constants";
import { gunBaslangici, gunEkle, gunGirdisi, gunGirdisindenTarih } from "@/lib/cekirdek/gun";
import { istemciIp } from "@/lib/kimlik/istemci-ip";
import {
  duzeltilmesiGerekenler,
  gunlukTablo,
  ipleriCoz,
  sureMetni,
} from "@/lib/personel/mesai";
import { IsletmeSecici } from "../menu/MenuUst";
import { MesaiKurulum } from "./MesaiKurulum";
import { MesaiTablosu, type TabloSatiri } from "./MesaiTablosu";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mesai takibi" };

/**
 * MESAİ TAKİBİ — "kim saat kaçta geldi, kaçta çıktı".
 *
 * Tek ekranda üç iş: kurulum (karekod + izinli ağlar), günün tablosu ve
 * eksik kayıtların düzeltilmesi.
 *
 * Rapor PLANLA BİRLİKTE okunuyor: vardiya çizelgesi zaten sistemde
 * (ShiftAssignment), dolayısıyla "planlıydı ama hiç okutmadı" satırı
 * ancak ikisi yan yana geldiğinde oluşuyor. Yalnızca kayıtlara bakan bir
 * rapor, gelmeyeni hiç göstermezdi — oysa sorulan soru tam olarak o.
 */
export default async function MesaiPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; tarih?: string }>;
}) {
  const user = await requireMesaiErisim();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  const tarih =
    query.tarih && /^\d{4}-\d{2}-\d{2}$/.test(query.tarih)
      ? query.tarih
      : gunGirdisi(new Date());

  const gunBasi = gunBaslangici(gunGirdisindenTarih(tarih));
  const gunSonu = gunEkle(gunBasi, 1);
  const simdi = new Date();

  const [isletme, kayitlar, atamalar] = await Promise.all([
    prisma.business.findUnique({
      where: { id: secili.id },
      select: { mesaiQrToken: true, mesaiIpleri: true },
    }),
    prisma.mesaiKaydi.findMany({
      where: { businessId: secili.id, giris: { gte: gunBasi, lt: gunSonu } },
      orderBy: { giris: "asc" },
      select: {
        id: true,
        userId: true,
        giris: true,
        cikis: true,
        user: { select: { name: true } },
      },
    }),
    prisma.shiftAssignment.findMany({
      where: { businessId: secili.id, date: { gte: gunBasi, lt: gunSonu } },
      select: { userId: true, shift: true, user: { select: { name: true } } },
    }),
  ]);

  const satirlar = gunlukTablo({
    kayitlar: kayitlar.map((k) => ({
      id: k.id,
      userId: k.userId,
      giris: k.giris,
      cikis: k.cikis,
      ad: k.user.name,
    })),
    planlananlar: atamalar.map((a) => ({
      userId: a.userId,
      ad: a.user.name,
      vardiya: a.shift,
    })),
    // Gün bittiyse açık kayıt "çıkış yapmadı"; bugünse "içeride".
    gunBitti: gunSonu <= simdi,
  });

  // Satır içi düzeltme için: kişinin o günkü TEK kaydının kimliği.
  const kayitKimlikleri = new Map<string, string[]>();
  for (const k of kayitlar) {
    kayitKimlikleri.set(k.userId, [...(kayitKimlikleri.get(k.userId) ?? []), k.id]);
  }

  const tablo: TabloSatiri[] = satirlar.map((s) => ({
    userId: s.userId,
    ad: s.ad,
    vardiya: s.vardiya,
    ilkGiris: s.ilkGiris?.toISOString() ?? null,
    sonCikis: s.sonCikis?.toISOString() ?? null,
    toplamDakika: s.toplamDakika,
    durum: s.durum,
    kayitSayisi: s.kayitSayisi,
    kayitId: (kayitKimlikleri.get(s.userId) ?? [])[0] ?? null,
  }));

  const eksikler = duzeltilmesiGerekenler(satirlar);
  const toplamDakika = satirlar.reduce((t, s) => t + (s.toplamDakika ?? 0), 0);

  const qrAdresi = isletme?.mesaiQrToken
    ? `${appUrl()}/admin/mesai/okut/${isletme.mesaiQrToken}`
    : null;
  const qrGorsel = qrAdresi
    ? await QRCode.toDataURL(qrAdresi, { errorCorrectionLevel: "M", margin: 1, width: 512 })
    : null;

  /**
   * Sunucu gerçek istemci IP'sini görebiliyor mu — göremiyorsa modül
   * çalışmaz ve bunu kurulum ekranı söylemeli.
   *
   * İki farklı "göremiyorum" değeri var (bkz. lib/kimlik/istemci-ip.ts):
   * üretimde güvenilir başlık yoksa "guvenilmez", geliştirmede başlık
   * hiç gelmediyse BOŞ metin. İkisi de aynı sonucu doğuruyor.
   */
  const gorulenIp = istemciIp(await headers());
  const ipTespitCalisiyor = gorulenIp !== "" && gorulenIp !== "guvenilmez";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<Clock className="h-4 w-4" aria-hidden="true" />}
        renk="emerald"
        title="Mesai takibi"
        description="Personel mekandaki karekodu okutarak giriş/çıkış yapar; kayıt yalnızca işletmenin ağından alınır."
      />

      {businesses.length > 1 ? (
        <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/mesai" />
      ) : null}

      <SectionCard title="Kurulum" description="Karekod ve izinli ağlar.">
        <MesaiKurulum
          businessId={secili.id}
          qrAdresi={qrAdresi}
          ipler={ipleriCoz(isletme?.mesaiIpleri)}
          ipTespitCalisiyor={ipTespitCalisiyor}
        />

        {qrGorsel ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-4 print:border-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrGorsel} alt="Mesai karekodu" className="w-44" />
            <p className="text-center text-caption text-ink-faint">
              Personel girişine asın. Okutan kişi panele girişli olmalı.
            </p>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Gün seçimi">
        <form method="get" className="flex flex-wrap items-end gap-3">
          {query.isletme ? <input type="hidden" name="isletme" value={query.isletme} /> : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-ink">Tarih</span>
            <input
              type="date"
              name="tarih"
              defaultValue={tarih}
              className="rounded-control border border-line px-3 py-2 text-body text-ink-strong"
            />
          </label>
          <button
            type="submit"
            className="rounded-control border border-line px-4 py-2 text-small font-semibold text-ink hover:bg-sunken"
          >
            Göster
          </button>
          <Link
            href={`/admin/mesai/disa-aktar?isletme=${secili.id}&tarih=${tarih}`}
            className="ml-auto text-small font-semibold text-brand hover:underline"
          >
            CSV indir →
          </Link>
        </form>
      </SectionCard>

      {eksikler.length > 0 ? (
        <p className="rounded-control bg-warning-soft px-4 py-3 text-small text-warning-ink">
          <strong>{eksikler.length} kayıt eksik:</strong>{" "}
          {eksikler.map((e) => `${e.ad} (${e.durum === "giris-yapmadi" ? "giriş yok" : "çıkış yok"})`).join(", ")}.
          Bordroya gitmeden önce düzeltin — sistem kendiliğinden saat yazmıyor.
        </p>
      ) : null}

      <SectionCard
        title={`${tarih} mesaisi (${tablo.length} kişi)`}
        description={`Toplam çalışma: ${sureMetni(toplamDakika || null)}`}
      >
        <MesaiTablosu businessId={secili.id} gun={tarih} satirlar={tablo} />
      </SectionCard>
    </div>
  );
}
