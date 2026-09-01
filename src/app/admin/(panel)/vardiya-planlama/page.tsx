import { CalendarDays, Moon, StickyNote, Sun, Sunrise, Sunset, Users2 } from "lucide-react";
import Link from "next/link";
import { requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { getShiftBreakdown } from "@/lib/stats";
import { SHIFTS, type Shift } from "@/lib/constants";
import { gunAdi, gunBaslangici, gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { etkinVardiyalar } from "@/lib/vardiya";
import { IZIN_TURLERI, izinKumesiKur, izinliMi, type IzinTuru } from "@/lib/izin";
import { vardiyaUyarilariniHesapla } from "@/lib/vardiya-uyari";
import { IsletmeSecici } from "../menu/MenuUst";
import { degisimKararVer, vardiyaAta, vardiyaKaldir } from "./actions";
import { CizelgeAktarim } from "./CizelgeAktarim";
import { HaftaAraclari } from "./HaftaAraclari";
import { VardiyaAyarForm } from "./VardiyaAyarForm";
import { VardiyaSekmeleri } from "./VardiyaSekmeleri";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vardiya çizelgesi" };

export default async function VardiyaPlanlamaPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; baslangic?: string }>;
}) {
  const user = await requirePersonelYonetimi();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  const vardiyalar = etkinVardiyalar(secili).map(
    (deger) => [deger, SHIFTS[deger]] as const,
  );
  const haftaBasi = query.baslangic
    ? haftaBaslangici(new Date(query.baslangic))
    : haftaBaslangici(new Date());
  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasi, i));
  const haftaSonu = gunler[6];

  const [personel, atamalar, bekleyenTalepler, vardiyaKirilimi, izinler, devirNotlari] =
    await Promise.all([
    prisma.user.findMany({
      where: { businessId: secili.id, active: true, role: { in: ["manager", "garson"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        businessId: secili.id,
        date: { gte: haftaBasi, lte: haftaSonu },
        // Pasifleştirilen personel çizelgeden "kalkmalı" ama geçmiş
        // atamaları silinmemeli — geçen ay çalıştığı vardiyalar hâlâ
        // gerçek. Bu yüzden yalnızca BUGÜNDEN İLERİSİ aktiflik şartına
        // bağlı: geçmiş günler kim atanmışsa öyle kalıyor, gelecekteki
        // bir atama ise artık aktif olmayan biri için hiç görünmüyor —
        // sanki hiç atanmamış gibi, o hücre yeniden boş görünüyor.
        OR: [
          { date: { lt: gunBaslangici() } },
          { user: { active: true } },
        ],
      },
      include: { user: { select: { name: true } } },
    }),
    prisma.shiftSwapRequest.findMany({
      where: { status: "bekliyor", assignment: { businessId: secili.id } },
      include: { requestedBy: { select: { name: true } }, assignment: true },
      orderBy: { createdAt: "asc" },
    }),
    // Satır başlıklarındaki puan rozeti: TAM OLARAK görüntülenen haftanın
    // ortalaması. Sabit bir pencere (ör. son 30 gün) kullanılırsa, boş bir
    // haftaya gelen kullanıcı başka haftaların puanını o haftaya aitmiş gibi
    // görür — rozet haftaBasi/haftaSonu'na bağlı, bir gün sonrasına kadar.
    getShiftBreakdown([secili.id], { from: haftaBasi, to: gunEkle(haftaSonu, 1) }),
    // Bu haftaya değen onaylı izinler: aralık haftayla kesişiyorsa yeter.
    prisma.leaveRequest.findMany({
      where: {
        businessId: secili.id,
        status: "onaylandi",
        baslangic: { lte: haftaSonu },
        bitis: { gte: haftaBasi },
      },
      select: { userId: true, baslangic: true, bitis: true, tur: true, status: true },
    }),
    // Vardiya devir notları: personel bunları "Görevlerim" ekranından
    // yazıyordu ama çizelgeyi kuran kişi hiçbir yerde göremiyordu — yani
    // toplanan veri, ona göre davranacak kişiye hiç ulaşmıyordu.
    prisma.shiftNote.findMany({
      where: { businessId: secili.id, date: { gte: haftaBasi, lte: haftaSonu } },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
    }),
  ]);
  const kirilimByShift = new Map(vardiyaKirilimi.map((k) => [k.shift, k]));
  const izinKumesi = izinKumesiKur(izinler);

  // Notlar hücre bazında toplanıyor: "gün:vardiya" → o vardiyaya bırakılanlar.
  const notlarByHucre = new Map<string, { yazar: string; metin: string }[]>();
  for (const not of devirNotlari) {
    const anahtar = `${gunGirdisi(not.date)}:${not.shift}`;
    const liste = notlarByHucre.get(anahtar) ?? [];
    liste.push({ yazar: not.author.name, metin: not.text });
    notlarByHucre.set(anahtar, liste);
  }

  const uyarilar = vardiyaUyarilariniHesapla(
    atamalar.map((a) => ({
      userId: a.userId,
      ad: a.user.name,
      date: a.date,
      shift: a.shift,
    })),
    gunler,
    etkinVardiyalar(secili),
  );

  const haftaHref = (baslangic: Date) =>
    `/admin/vardiya-planlama?${new URLSearchParams({
      isletme: secili.id,
      baslangic: gunGirdisi(baslangic),
    }).toString()}`;

  /** Her vardiyanın kendi rengi: dört satırlık bir tabloda "hangi satırdayım"
   * hep göze bakarak, satır başlığını okumadan anlaşılsın. Rozet zemini
   * geçişli — panelin geri kalanıyla aynı dil (bkz. lib/modul-rengi.ts). */
  const VARDIYA_RENGI: Record<
    Shift,
    { serit: string; rozet: string; Ikon: typeof Sunrise }
  > = {
    sabah: {
      serit: "border-l-amber-400",
      rozet: "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800",
      Ikon: Sunrise,
    },
    ogle: {
      serit: "border-l-sky-400",
      rozet: "bg-gradient-to-r from-sky-100 to-sky-50 text-sky-800",
      Ikon: Sun,
    },
    aksam: {
      serit: "border-l-orange-400",
      rozet: "bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800",
      Ikon: Sunset,
    },
    gece: {
      serit: "border-l-indigo-400",
      rozet: "bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-800",
      Ikon: Moon,
    },
  };

  return (
    <div className="flex flex-col gap-5">
      <VardiyaSekmeleri aktif="cizelge" />

      {/* Başlık artık yalnızca kimlik: ne olduğu ve hangi hafta. Hafta
          gezinme + işletme seçici + kopyalama + uyarılar + vardiya saatleri
          önceden dört-beş ayrı kutuydu ("İşletme seç" kutusu, kopyalama
          satırı, uyarı şeridi, teal ayar barı) ve alt alta dizilince
          sayfanın üçte biri asıl işten (tablo) önce, birbirinden görsel
          olarak ayrışmayan bir yığın oluşturuyordu. Tek "Araçlar" kartında
          toplanıp aralarına ince bir çizgi konunca hem daha az yer
          kaplıyor hem hangi satırın ne işe yaradığı daha okunaklı. */}
      <PageHeader
        ikon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        renk="teal"
        title="Vardiya çizelgesi"
        description={`${haftaBasi.toLocaleDateString("tr-TR")} – ${haftaSonu.toLocaleDateString("tr-TR")}`}
      />

      <div className="flex flex-col divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          {businesses.length > 1 ? (
            <IsletmeSecici
              businesses={businesses}
              seciliId={secili.id}
              taban="/admin/vardiya-planlama"
            />
          ) : (
            <span />
          )}
          <div className="flex gap-1">
            <Link
              href={haftaHref(gunEkle(haftaBasi, -7))}
              className="rounded-control border border-line bg-surface px-3 py-1.5 text-small text-ink-soft transition hover:border-line-strong hover:bg-canvas"
            >
              ← Önceki hafta
            </Link>
            <Link
              href={haftaHref(gunEkle(haftaBasi, 7))}
              className="rounded-control border border-line bg-surface px-3 py-1.5 text-small text-ink-soft transition hover:border-line-strong hover:bg-canvas"
            >
              Sonraki hafta →
            </Link>
          </div>
        </div>

        <div className="px-4 py-3">
          <HaftaAraclari
            businessId={secili.id}
            baslangic={gunGirdisi(haftaBasi)}
            uyarilar={uyarilar}
          />
        </div>

        <VardiyaAyarForm
          businessId={secili.id}
          ayarlar={{
            vardiyaSabahAktif: secili.vardiyaSabahAktif,
            vardiyaSabahSaat: secili.vardiyaSabahSaat,
            vardiyaOgleAktif: secili.vardiyaOgleAktif,
            vardiyaOgleSaat: secili.vardiyaOgleSaat,
            vardiyaAksamAktif: secili.vardiyaAksamAktif,
            vardiyaAksamSaat: secili.vardiyaAksamSaat,
            vardiyaGeceAktif: secili.vardiyaGeceAktif,
            vardiyaGeceSaat: secili.vardiyaGeceSaat,
          }}
        />
      </div>

      {bekleyenTalepler.length > 0 ? (
        <section className="rounded-control bg-warning-soft p-4 ring-1 ring-warning/25">
          <h2 className="text-caption font-medium tracking-wide text-warning-ink uppercase">
            Bekleyen vardiya bırakma talepleri
          </h2>
          {/* Onaylamanın ne yaptığı belirsizdi: "değişim" kelimesi otomatik
              bir yer değiştirme çağrıştırıyor ama sistemde öyle bir şey yok —
              onay yalnızca hücreyi boşaltıyor, kimseyi otomatik atamıyor. */}
          <p className="mt-0.5 text-caption text-warning-ink/80">
            Onaylarsanız bu vardiya boşalır; yerine birini siz atamanız gerekir.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {bekleyenTalepler.map((talep) => (
              <li
                key={talep.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-chip bg-surface px-3 py-2 text-small"
              >
                <span>
                  <span className="font-medium">{talep.requestedBy.name}</span>
                  {" — "}
                  {SHIFTS[talep.assignment.shift as keyof typeof SHIFTS] ?? talep.assignment.shift}
                  {" · "}
                  {gunAdi(talep.assignment.date)}, {talep.assignment.date.toLocaleDateString("tr-TR")}
                  {talep.note ? (
                    <span className="block text-caption text-ink-faint">
                      &quot;{talep.note}&quot;
                    </span>
                  ) : null}
                </span>
                <span className="flex gap-1.5">
                  <form action={degisimKararVer}>
                    <input type="hidden" name="id" value={talep.id} />
                    <input type="hidden" name="karar" value="onayla" />
                    <button
                      type="submit"
                      className="rounded-chip bg-success px-2.5 py-1 text-caption font-medium text-white hover:opacity-90"
                    >
                      Onayla
                    </button>
                  </form>
                  <form action={degisimKararVer}>
                    <input type="hidden" name="id" value={talep.id} />
                    <input type="hidden" name="karar" value="reddet" />
                    <button
                      type="submit"
                      className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
                    >
                      Reddet
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {personel.length === 0 ? (
        <EmptyState
          baslik="Henüz personel yok"
          ikon={<Users2 className="h-4 w-4" aria-hidden="true" />}
          aksiyon={
            <Link
              href="/admin/kullanicilar/ekle"
              className="rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white hover:bg-accent-700"
            >
              + Personel ekle
            </Link>
          }
        >
          Çizelge kurmak için önce &quot;işletme sorumlusu&quot; veya &quot;saha
          personeli&quot; rolünde bir kullanıcı ekleyin.
        </EmptyState>
      ) : (
        <>
          {/* Masaüstünde gerçek bir takvim tablosu: gün sütun, vardiya satır —
              haftaya tek bakışta bakılabilsin diye. Mobilde aynı veri gün
              kartları olarak (aşağıda) tekrar ediyor; geniş tablo telefonda
              yatay kaydırma zorunlu kılardı. */}
          <div className="hidden overflow-x-auto rounded-card bg-surface shadow-card ring-1 ring-line lg:block">
            <table className="w-full min-w-[1050px] text-small">
              {/* table-auto: sütunlar içeriğe göre genişliyor. Önceden her
                  gün sabit 180px'ti — geniş bir monitörde tablo 4 gün
                  gösterip sayfanın kalanını boş bırakıyor, kalan 3 gün
                  kaydırmaya kalıyordu; table-fixed + eşit paylaşım bunu
                  çözdü ama bu sefer uzun personel isimleri hücre içinde
                  alt alta bölünmeye başladı. table-auto + isim rozetlerinde
                  whitespace-nowrap ikisini birden çözüyor: gün sütunları
                  hâlâ eşit ağırlıkla (w-full ile) genişliyor, isimler tek
                  satırda kalıyor, sığmazsa min-w-[1050px] tabanı yatay
                  kaydırmayı devreye sokuyor. */}
              <colgroup>
                <col className="w-36" />
                {gunler.map((gun) => (
                  <col key={gunGirdisi(gun)} className="w-[13%]" />
                ))}
              </colgroup>
              <thead className="border-b border-line text-left text-caption text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Vardiya</th>
                  {gunler.map((gun) => {
                    const bugunMu = gunGirdisi(new Date()) === gunGirdisi(gun);
                    return (
                      <th
                        key={gunGirdisi(gun)}
                        className={`px-4 py-3 font-medium ${bugunMu ? "text-accent-700" : ""}`}
                      >
                        <span className="flex items-center gap-1.5">
                          {gunAdi(gun)}
                          {bugunMu ? (
                            <span className="rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-white">
                              bugün
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-[11px] font-normal normal-case text-ink-faint">
                          {gun.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vardiyalar.map(([deger, etiket]) => (
                  <tr key={deger} className={`border-l-4 ${VARDIYA_RENGI[deger].serit}`}>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-small font-medium ${VARDIYA_RENGI[deger].rozet}`}
                      >
                        {(() => { const I = VARDIYA_RENGI[deger].Ikon; return <I className="h-3.5 w-3.5" aria-hidden="true" />; })()}
                        {etiket}
                      </span>
                      <VardiyaPuanRozeti kirilim={kirilimByShift.get(deger)} />
                    </td>
                    {gunler.map((gun) => (
                      <td key={gunGirdisi(gun)} className="px-4 py-4 align-top">
                        <VardiyaHucresi
                          businessId={secili.id}
                          gunAnahtari={gunGirdisi(gun)}
                          shift={deger}
                          atamalar={atamalar}
                          personel={personel}
                          izinKumesi={izinKumesi}
                          notlar={notlarByHucre.get(`${gunGirdisi(gun)}:${deger}`)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            {gunler.map((gun) => {
              const gunAnahtari = gunGirdisi(gun);
              const bugunMu = gunGirdisi(new Date()) === gunAnahtari;
              return (
                <div
                  key={gunAnahtari}
                  className={`overflow-hidden rounded-card bg-surface shadow-card ring-1 ${
                    bugunMu ? "ring-2 ring-accent-600" : "ring-line"
                  }`}
                >
                  <p className="flex items-center gap-2 border-b border-line bg-sunken px-4 py-2.5 font-medium">
                    {gunAdi(gun)}{" "}
                    <span className="text-caption font-normal text-ink-faint">
                      {gun.toLocaleDateString("tr-TR")}
                    </span>
                    {bugunMu ? (
                      <span className="ml-auto rounded-full bg-accent-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        bugün
                      </span>
                    ) : null}
                  </p>

                  <div className="flex flex-col divide-y divide-line">
                    {vardiyalar.map(([deger, etiket]) => (
                      <div key={deger} className={`border-l-4 p-4 ${VARDIYA_RENGI[deger].serit}`}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-caption font-medium ${VARDIYA_RENGI[deger].rozet}`}
                          >
                            {(() => { const I = VARDIYA_RENGI[deger].Ikon; return <I className="h-3.5 w-3.5" aria-hidden="true" />; })()}
                            {etiket}
                          </span>
                          <VardiyaPuanRozeti kirilim={kirilimByShift.get(deger)} />
                        </span>
                        <div className="mt-2">
                          <VardiyaHucresi
                            businessId={secili.id}
                            gunAnahtari={gunAnahtari}
                            shift={deger}
                            atamalar={atamalar}
                            personel={personel}
                            izinKumesi={izinKumesi}
                            notlar={notlarByHucre.get(`${gunAnahtari}:${deger}`)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <CizelgeAktarim businessId={secili.id} baslangic={gunGirdisi(haftaBasi)} />
        </>
      )}
    </div>
  );
}

/**
 * Vardiya satırındaki küçük puan rozeti — sahibi/yöneticiye "hangi vardiya
 * gerçekten iyi/kötü geçiyor" bilgisini isim bazlı değil vardiya bazlı
 * verir. Personel bu sayfaya hiç girmiyor (bkz. requirePersonelYonetimi +
 * requireTenant'ın garson'u ayrı moda düşürmesi), o yüzden burada başka
 * bir gizleme mantığına gerek yok.
 */
function VardiyaPuanRozeti({
  kirilim,
}: {
  kirilim: { average: number | null; count: number } | undefined;
}) {
  if (!kirilim || kirilim.average === null) return null;
  const renk =
    kirilim.average >= 4
      ? "bg-success-soft text-success-ink"
      : kirilim.average >= 3
        ? "bg-warning-soft text-warning-ink"
        : "bg-danger-soft text-danger-ink";
  return (
    <span
      title={`Bu hafta, ${kirilim.count} geri bildirim`}
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${renk}`}
    >
      ★ {kirilim.average.toFixed(1)}
    </span>
  );
}

type Atama = { id: string; date: Date; shift: string; userId: string; user: { name: string } };
type Personel = { id: string; name: string; role: string };

/** Bir gün×vardiya kesişimi: atanan personel + ekleme formu. Masaüstü
 * tablosu ve mobil kartlar aynı hücreyi kullanıyor ki iki görünüm
 * birbirinden sapmasın. */
function VardiyaHucresi({
  businessId,
  gunAnahtari,
  shift,
  atamalar,
  personel,
  izinKumesi,
  notlar,
}: {
  businessId: string;
  gunAnahtari: string;
  shift: string;
  atamalar: Atama[];
  personel: Personel[];
  izinKumesi: Map<string, IzinTuru>;
  /** O vardiyaya bırakılan devir notları; yoksa hiç çizilmez. */
  notlar?: { yazar: string; metin: string }[];
}) {
  const buVardiya = atamalar.filter(
    (a) => gunGirdisi(a.date) === gunAnahtari && a.shift === shift,
  );
  const atanmamis = personel.filter((p) => !buVardiya.some((a) => a.userId === p.id));

  // İzinli olanlar seçim listesinden çıkarılmıyor, sonuna ayrı ve işaretli
  // olarak konuyor: yönetici gerekirse yine de atayabilmeli (kişi gelmeyi
  // kabul etmiş olabilir), ama ne yaptığını bilerek yapsın.
  const musaitler = atanmamis.filter((p) => !izinliMi(izinKumesi, p.id, gunAnahtari));
  const izinliler = atanmamis.filter((p) => izinliMi(izinKumesi, p.id, gunAnahtari));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {buVardiya.map((a) => {
          const izinTuru = izinliMi(izinKumesi, a.userId, gunAnahtari);
          return (
            <form key={a.id} action={vardiyaKaldir}>
              <input type="hidden" name="id" value={a.id} />
              <button
                type="submit"
                title={
                  izinTuru
                    ? `Kaldır — DİKKAT: bu kişi ${IZIN_TURLERI[izinTuru].toLocaleLowerCase("tr")} kaydına rağmen atanmış`
                    : "Kaldır"
                }
                className={`flex items-center gap-1 whitespace-nowrap rounded-chip px-2 py-1 text-caption hover:bg-danger-soft hover:text-danger-ink ${
                  izinTuru
                    ? "bg-warning-soft text-warning-ink ring-1 ring-warning/30"
                    : "bg-sunken text-ink-soft"
                }`}
              >
                {izinTuru ? <span aria-hidden="true">⚠</span> : null}
                {a.user.name}
                <span aria-hidden="true">✕</span>
              </button>
            </form>
          );
        })}
        {buVardiya.length === 0 ? (
          <span className="text-caption text-ink-faint">—</span>
        ) : null}
      </div>

      {notlar && notlar.length > 0 ? (
        <ul className="mt-1.5 flex flex-col gap-1">
          {notlar.map((not, i) => (
            <li
              key={i}
              title={`${not.yazar}: ${not.metin}`}
              className="flex items-start gap-1 rounded-chip bg-info-soft px-1.5 py-1 text-[11px] leading-snug text-info-ink ring-1 ring-info/20"
            >
              <StickyNote className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{not.metin}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {atanmamis.length > 0 ? (
        <form action={vardiyaAta} className="mt-1.5 flex gap-1">
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="date" value={gunAnahtari} />
          <input type="hidden" name="shift" value={shift} />
          {/* Boş bir ilk seçenek olmadan tarayıcı listedeki ilk kişiyi
           * varsayılan gösteriyordu — kimse atanmamışken sanki biri
           * seçilmiş gibi duruyordu. required + boş value, hem görünüşte
           * hem "+" ile boş gönderilmeye karşı çift kilit. */}
          <select
            name="userId"
            required
            defaultValue=""
            className="min-w-0 flex-1 rounded-chip border border-line bg-canvas px-2 py-1 text-caption text-ink-muted outline-none focus:border-line-strong focus:text-ink"
          >
            <option value="" disabled>
              + Personel seç
            </option>
            {musaitler.map((p) => (
              <option key={p.id} value={p.id} className="text-ink">
                {p.name}
              </option>
            ))}
            {izinliler.length > 0 ? (
              <optgroup label="İzinli — yine de atanabilir">
                {izinliler.map((p) => {
                  const tur = izinliMi(izinKumesi, p.id, gunAnahtari)!;
                  return (
                    <option key={p.id} value={p.id} className="text-ink">
                      {p.name} ({IZIN_TURLERI[tur].toLocaleLowerCase("tr")})
                    </option>
                  );
                })}
              </optgroup>
            ) : null}
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-chip border border-line px-2 py-1 text-caption text-ink-soft hover:bg-canvas"
          >
            +
          </button>
        </form>
      ) : null}
    </div>
  );
}
