import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { markaStili } from "@/lib/marka";
import { EtkilesimliDemo } from "./StilDemo";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Overline,
  Pagination,
  ScoreBar,
  SegmentGroup,
  SegmentLink,
  Select,
  SkeletonCard,
  SkeletonRows,
  StatCard,
  Stars,
  StatusBadge,
  SystemBanner,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableShell,
  TabLink,
  formatDateTime,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stil kılavuzu",
  robots: { index: false, follow: false },
};

/** Beyaz etiket kurulumlarında karşılaşılan gerçek uçlar. */
const MARKALAR = [
  { ad: "Ege Cunda Balık", renk: "#2b6f86" },
  { ad: "Kırıntı Fırın & Kahve", renk: "#8a5a2b" },
  { ad: "Limon Nane Bistro", renk: "#f2c230" },
  { ad: "Rota 61 Kahve", renk: "#1f2933" },
];

const YUZEYLER = [
  { ad: "canvas", sinif: "bg-canvas", not: "Sayfa zemini" },
  { ad: "surface", sinif: "bg-surface", not: "Kart yüzeyi" },
  { ad: "sunken", sinif: "bg-sunken", not: "Girinti / tablo başlığı" },
  { ad: "line", sinif: "bg-line", not: "Ayraç" },
  { ad: "line-strong", sinif: "bg-line-strong", not: "Kenarlık" },
];

const MUREKKEPLER = [
  { ad: "ink", sinif: "text-ink", not: "Başlık ve rakam" },
  { ad: "ink-soft", sinif: "text-ink-soft", not: "Gövde metni" },
  { ad: "ink-muted", sinif: "text-ink-muted", not: "Yardımcı metin" },
  { ad: "ink-faint", sinif: "text-ink-faint", not: "Yer tutucu" },
];

// Sınıf adları statik yazılmalı: Tailwind kullanılmayan token'ı üretmiyor,
// `bg-accent-${n}` gibi kurulan adlar boş çıkıyor.
const ACCENT = [
  ["50", "bg-accent-50"],
  ["100", "bg-accent-100"],
  ["200", "bg-accent-200"],
  ["300", "bg-accent-300"],
  ["400", "bg-accent-400"],
  ["500", "bg-accent-500"],
  ["600", "bg-accent-600"],
  ["700", "bg-accent-700"],
  ["900", "bg-accent-900"],
] as const;

const DURUMLAR = [
  {
    ad: "success",
    not: "Çözüldü, onaylı, 4+ puan",
    kutu: "bg-success-soft text-success-ink",
    nokta: "bg-success",
  },
  {
    ad: "warning",
    not: "İncelendi, süre doluyor, 3–4 puan",
    kutu: "bg-warning-soft text-warning-ink",
    nokta: "bg-warning",
  },
  {
    ad: "danger",
    not: "Yeni şikayet, 3 altı puan, silme",
    kutu: "bg-danger-soft text-danger-ink",
    nokta: "bg-danger",
  },
  {
    ad: "info",
    not: "Nötr bilgi, KVKK notu",
    kutu: "bg-info-soft text-info-ink",
    nokta: "bg-info",
  },
];

const TIPOGRAFI = [
  { sinif: "text-display", ad: "display · 22px", ornek: "Memnuniyet Paneli" },
  { sinif: "text-metric tabular", ad: "metric · 26px", ornek: "4,3 / 128" },
  { sinif: "text-title", ad: "title · 18px", ornek: "Geri bildirimler" },
  { sinif: "text-heading", ad: "heading · 14px", ornek: "Açık şikayetler" },
  { sinif: "text-body", ad: "body · 15px", ornek: "Balık çok tazeydi, servis biraz yavaştı." },
  { sinif: "text-small", ad: "small · 14px", ornek: "Son 30 günde 128 geri bildirim alındı." },
  { sinif: "text-caption", ad: "caption · 13px", ornek: "Masa 12 · Akşam vardiyası" },
  {
    sinif: "text-overline uppercase font-semibold",
    ad: "overline · 12px",
    ornek: "Bu hafta",
  },
];

const SATIRLAR = [
  {
    id: "1",
    puan: 5,
    yorum: "Levrek nefisti, garson Emre çok ilgiliydi. Manzara için tekrar geliriz.",
    masa: "Masa 7",
    vardiya: "Akşam",
    durum: "cozuldu",
    tarih: new Date("2026-08-09T21:14:00"),
  },
  {
    id: "2",
    puan: 2,
    yorum: "Siparişimiz 40 dakika sürdü, çorba soğuk geldi.",
    masa: "Masa 12",
    vardiya: "Akşam",
    durum: "yeni",
    tarih: new Date("2026-08-10T20:02:00"),
  },
  {
    id: "3",
    puan: 4,
    yorum: "Kahvaltı zengindi ama masalar biraz sıkışık.",
    masa: "Masa 3",
    vardiya: "Sabah",
    durum: "incelendi",
    tarih: new Date("2026-08-10T10:41:00"),
  },
];

const URUNLER = [
  { ad: "Fırın Sütlaç", oy: 34, ortalama: 4.7 },
  { ad: "Türk Kahvesi", oy: 61, ortalama: 4.5 },
  { ad: "Mevsim Salata", oy: 22, ortalama: 3.8 },
  { ad: "Karides Güveç", oy: 18, ortalama: 2.6 },
  { ad: "Limonata", oy: 3, ortalama: 4.3, azVeri: true },
];

export default async function StilKilavuzuPage() {
  // Kılavuz iç araç: geliştirmede serbest, yayında oturum ister. Müşteri
  // adresinde gezinen birinin karşısına çıkmasını istemiyoruz.
  if (process.env.NODE_ENV === "production") await requireUser();

  return (
    <main className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <Overline>Tasarım sistemi</Overline>
          <h1 className="mt-2 text-display font-semibold text-ink">Stil kılavuzu</h1>
          <p className="mt-2 max-w-2xl text-body text-ink-soft">
            Ürünün iki yüzü var. <strong className="font-semibold">Müşteri ekranları</strong>{" "}
            işletmenin markasını taşır: renk, logo ve kapak müşteriden gelir, bizim
            tasarımımız onu saran çerçevedir.{" "}
            <strong className="font-semibold">Yönetim paneli</strong> ise platformun
            kendi kimliğini taşır — onlarca farklı kafede aynı görünür, çünkü orada
            güven veren şey tanıdıklık.
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-10">
        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="01"
          baslik="Renk"
          aciklama="Nötr slate tabanı + dört durum rengi. Arayüzün vurgusu koyu mürekkep; paletteki tek kromatik renk işletmenin kendi markası."
        >
          <Card>
            <CardHeader
              title="Yüzeyler ve çizgiler"
              description="Zemin saf beyaz değil; kart zeminden ayrışsın diye bir ton kırık."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {YUZEYLER.map((y) => (
                <div key={y.ad}>
                  <div
                    className={`h-16 rounded-chip ring-1 ring-line-strong/60 ${y.sinif}`}
                  />
                  <p className="mt-1.5 font-mono text-caption text-ink">{y.ad}</p>
                  <p className="text-caption text-ink-muted">{y.not}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <Overline>Metin hiyerarşisi</Overline>
              <ul className="mt-3 flex flex-col gap-1.5">
                {MUREKKEPLER.map((m) => (
                  <li key={m.ad} className="flex items-baseline gap-3">
                    <span className={`w-28 shrink-0 font-mono text-caption ${m.sinif}`}>
                      {m.ad}
                    </span>
                    <span className={`text-body ${m.sinif}`}>
                      Bugün 12 geri bildirim geldi.
                    </span>
                    <span className="ml-auto hidden text-caption text-ink-faint sm:inline">
                      {m.not}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Platform vurgusu — ink"
              description="Panelin vurgusu bir renk değil, koyu mürekkep: seçili sekme, seçili hap ve odak halkası bu aileden. Böylece arayüz hiçbir kiracıda renk değiştirmez, tek kromatik renk işletmenin markası olarak kalır."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {ACCENT.map(([ton, sinif]) => (
                <div key={ton} className="w-16">
                  <div className={`h-12 rounded-chip ring-1 ring-line/60 ${sinif}`} />
                  <p className="mt-1 text-center font-mono text-caption text-ink-muted">
                    {ton}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Durum renkleri"
              description="Her durum üç token taşır: dolgu (soft), metin (ink) ve tam ton. Böylece rozet, uyarı kutusu ve grafik aynı dili konuşur."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DURUMLAR.map((d) => (
                <div
                  key={d.ad}
                  className={`flex items-center gap-3 rounded-control p-3 ${d.kutu}`}
                >
                  <span
                    className={`h-8 w-8 shrink-0 rounded-full ${d.nokta}`}
                    aria-hidden="true"
                  />
                  <span className="text-small">
                    <span className="block font-mono font-semibold">{d.ad}</span>
                    {d.not}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Marka enjeksiyonu */}
          <Card>
            <CardHeader
              title="Marka rengi enjeksiyonu"
              description="Müşteri ekranlarında kabuk, işletmenin hex rengini --brand olarak yazar; üstüne yazılacak mürekkep rengi parlaklıktan hesaplanır. Panelde --brand tanımlı değildir, bu yüzden aynı bileşen platform vurgusuna düşer."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MARKALAR.map((m) => (
                <div
                  key={m.ad}
                  data-marka
                  style={markaStili(m.renk)}
                  className="overflow-hidden rounded-card ring-1 ring-line"
                >
                  <div className="h-1.5 bg-brand" />
                  <div className="bg-brand-soft p-3">
                    <p className="text-small font-semibold text-ink">{m.ad}</p>
                    <p className="font-mono text-caption text-ink-muted">{m.renk}</p>
                    <button
                      type="button"
                      className="mt-3 w-full rounded-control bg-brand px-3 py-2 text-small font-medium text-brand-ink"
                    >
                      Deneyimi değerlendir
                    </button>
                    <p className="mt-2 text-caption text-ink-muted">
                      Metin rengi otomatik: açık markada koyu mürekkep.
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Alert tone="bilgi">
              <strong className="font-semibold">Kural:</strong> Panelde{" "}
              <code className="font-mono">bg-brand</code> yalnızca o işletmenin
              verisini çizen yerlerde kullanılır — trend çizgisi, kırılım barları, QR
              kartı, marka ayarları. Arayüzün kendisi (düğme, sekme, rozet) her
              kiracıda birebir aynı kalır.
            </Alert>
          </Card>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="02"
          baslik="Tipografi"
          aciklama="Sekiz kademe. Rakamlar her yerde tabular: alt alta gelen puanlar ve tutarlar kaymasın."
        >
          <Card>
            <ul className="flex flex-col divide-y divide-line">
              {TIPOGRAFI.map((t) => (
                <li
                  key={t.ad}
                  className="flex flex-wrap items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className={`${t.sinif} text-ink`}>{t.ornek}</span>
                  <span className="font-mono text-caption text-ink-faint">{t.ad}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="03"
          baslik="Boşluk, yarıçap, gölge"
          aciklama="4px'lik ızgara. Üç yarıçap, üç gölge — fazlası tutarsızlık üretiyor."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <Overline>Boşluk ritmi</Overline>
              <div className="mt-3 flex flex-col gap-2">
                {[4, 8, 12, 16, 20, 24, 32, 40].map((p) => (
                  <div key={p} className="flex items-center gap-3">
                    <span className="w-8 font-mono text-caption text-ink-muted">{p}</span>
                    <span
                      className="h-2.5 rounded-full bg-accent-200"
                      style={{ width: p * 2 }}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Overline>Yarıçap</Overline>
              <div className="mt-3 flex flex-col gap-3">
                {[
                  ["rounded-card", "16px · kart"],
                  ["rounded-control", "12px · düğme, input"],
                  ["rounded-chip", "8px · rozet, ufak kutu"],
                  ["rounded-full", "hap · etiket, avatar"],
                ].map(([sinif, not]) => (
                  <div key={sinif} className="flex items-center gap-3">
                    <span className={`h-10 w-14 bg-sunken ring-1 ring-line ${sinif}`} />
                    <span className="text-caption text-ink-muted">{not}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Overline>Gölge</Overline>
              <div className="mt-3 flex flex-col gap-4">
                {[
                  ["shadow-card", "kart"],
                  ["shadow-raised", "açılır menü"],
                  ["shadow-pop", "modal, toast"],
                ].map(([sinif, not]) => (
                  <div key={sinif} className="flex items-center gap-3">
                    <span className={`h-10 w-14 rounded-control bg-surface ${sinif}`} />
                    <span className="text-caption text-ink-muted">
                      <span className="font-mono">{sinif}</span> · {not}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="04"
          baslik="Düğmeler"
          aciklama="Bir ekranda tek birincil aksiyon. Yıkıcı işlem her zaman ayrı renkte ve asla varsayılan odak değil."
        >
          <Card>
            <div className="flex flex-col gap-5">
              {(
                [
                  ["primary", "Birincil — panelde kaydet/oluştur"],
                  ["secondary", "İkincil — vazgeç, dışa aktar"],
                  ["destructive", "Yıkıcı — sil, iptal et"],
                  ["ghost", "Hayalet — satır içi ufak aksiyon"],
                  ["brand", "Marka — yalnızca müşteri ekranı"],
                ] as const
              ).map(([variant, not]) => (
                <div key={variant} className="flex flex-wrap items-center gap-3">
                  <span className="w-full font-mono text-caption text-ink-muted sm:w-32">
                    {variant}
                  </span>
                  <Button variant={variant} size="sm">
                    Küçük
                  </Button>
                  <Button variant={variant}>Orta</Button>
                  <Button variant={variant} size="lg">
                    Büyük
                  </Button>
                  <Button variant={variant} loading loadingLabel="Kaydediliyor…">
                    Yükleniyor
                  </Button>
                  <Button variant={variant} disabled>
                    Devre dışı
                  </Button>
                  <span className="hidden text-caption text-ink-faint lg:inline">{not}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-line pt-4 text-caption text-ink-muted">
              Odak: klavyeyle gezerken her düğmede 2px accent halkası çıkar (Tab ile
              deneyin). Fareyle tıklarken görünmez — <code className="font-mono">
                :focus-visible
              </code>
              .
            </p>
          </Card>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="05"
          baslik="Form dili"
          aciklama="Etiket üstte, yardımcı metin altta, hata yardımcı metnin yerini alır. Mobilde 16px girdi: Safari sayfayı zumlamasın."
        >
          <Card>
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="İşletme adı" htmlFor="sk-ad" required>
                <Input id="sk-ad" defaultValue="Ege Cunda Balık" />
              </Field>
              <Field
                label="Uyarı eşiği"
                htmlFor="sk-esik"
                hint="Bu puanın altındaki geri bildirimde e-posta gönderilir."
              >
                <Select id="sk-esik" defaultValue="3">
                  <option value="2">2 yıldız ve altı</option>
                  <option value="3">3 yıldız ve altı</option>
                  <option value="4">4 yıldız ve altı</option>
                </Select>
              </Field>
              <Field
                label="Google yorum bağlantısı"
                htmlFor="sk-google"
                error="Bağlantı https:// ile başlamalı."
              >
                <Input id="sk-google" defaultValue="g.page/r/…" invalid />
              </Field>
              <Field label="Abonelik bitişi" htmlFor="sk-abone" hint="Boş bırakılırsa süresiz.">
                <Input id="sk-abone" type="date" defaultValue="2026-12-31" />
              </Field>
              <Field label="Kiracı kodu" htmlFor="sk-kod" hint="Değiştirilemez.">
                <Input id="sk-kod" defaultValue="ege-cunda" disabled />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Etkileşimli bileşenler"
              description="Toast, modal, yıldız puanlama ve canlı hata durumu."
            />
            <div className="mt-5">
              <EtkilesimliDemo />
            </div>
          </Card>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="06"
          baslik="Veri bileşenleri"
          aciklama="Panelin günlük ekmeği: istatistik kartı, rozet, puan çubuğu, tablo."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Geri bildirim"
              value="128"
              hint="Son 30 gün"
              trend={{ yon: "yukari", metin: "%18", iyi: true }}
            />
            <StatCard
              label="Ortalama puan"
              value="4,3"
              hint="Önceki dönem 4,1"
              trend={{ yon: "yukari", metin: "0,2", iyi: true }}
            />
            <StatCard
              label="Açık şikayet"
              value="3"
              hint="En eskisi 2 gündür bekliyor"
              tone="dikkat"
              trend={{ yon: "yukari", metin: "2", iyi: false }}
            />
            <StatCard
              label="Google'a giden"
              value="%41"
              hint="52 yönlendirmenin 21'i tıkladı"
              trend={{ yon: "sabit", metin: "değişmedi" }}
            />
          </div>

          <Card>
            <CardHeader title="Rozetler" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status="yeni" />
              <StatusBadge status="incelendi" />
              <StatusBadge status="cozuldu" />
              <Badge tone="vurgu">QR menü açık</Badge>
              <Badge tone="notr">Masa 12</Badge>
              <Badge tone="uyari">14 gün kaldı</Badge>
              <Badge tone="hata">Süresi doldu</Badge>
              <Badge tone="bilgi">İYS bildirilmedi</Badge>
              <Badge tone="notr" title="5 oydan az; yorumlarken dikkat edin">
                az veri
              </Badge>
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <Overline>Puan gösterimi</Overline>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <Stars value={5} size="md" />
                <Stars value={4} />
                <Stars value={2} />
                <div className="w-48">
                  <ScoreBar value={4.6} />
                </div>
                <div className="w-48">
                  <ScoreBar value={3.4} />
                </div>
                <div className="w-48">
                  <ScoreBar value={2.6} />
                </div>
              </div>
            </div>
          </Card>

          <TableShell>
            <Table>
              <THead>
                <TR>
                  <TH>Puan</TH>
                  <TH>Yorum</TH>
                  <TH>Masa / vardiya</TH>
                  <TH>Durum</TH>
                  <TH align="right">Tarih</TH>
                </TR>
              </THead>
              <TBody>
                {SATIRLAR.map((s) => (
                  <TR key={s.id} vurgu={s.puan <= 2}>
                    <TD>
                      <Stars value={s.puan} />
                    </TD>
                    <TD className="max-w-sm truncate text-ink">{s.yorum}</TD>
                    <TD>
                      {s.masa} · {s.vardiya}
                    </TD>
                    <TD>
                      <StatusBadge status={s.durum} />
                    </TD>
                    <TD align="right" className="whitespace-nowrap text-ink-muted">
                      {formatDateTime(s.tarih)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableShell>

          <Card>
            <CardHeader
              title="Ürün performansı"
              description="Güvenilir oy sayısının altındaki ürün ayrı işaretli — iki oyla 'en kötü ürün' ilan etmek işletmeyi yanlış yere baktırır."
            />
            <ul className="mt-4 flex flex-col gap-3">
              {URUNLER.map((u) => (
                <li key={u.ad} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 text-body text-ink">
                    {u.ad}
                    {u.azVeri ? (
                      <span className="ml-2">
                        <Badge tone="notr">az veri</Badge>
                      </span>
                    ) : null}
                  </span>
                  <ScoreBar value={u.ortalama} className="flex-1" />
                  <span className="w-20 shrink-0 text-right text-small text-ink-muted tabular">
                    {u.ortalama.toFixed(1)} ({u.oy})
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="07"
          baslik="Gezinme"
          aciklama="Sekme, segment filtre, kategori hapları ve sayfalama. Hepsi bağlantı tabanlı: geri tuşu filtreyi hatırlar."
        >
          <Card padded={false}>
            <nav className="flex gap-1 overflow-x-auto border-b border-line px-3">
              {["Özet", "Geri bildirimler", "Kırılım", "Ürünler", "QR Menü", "Profil"].map(
                (t, i) => (
                  <TabLink key={t} href="#" active={i === 1}>
                    {t}
                  </TabLink>
                ),
              )}
            </nav>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <SegmentGroup label="Dönem">
                <SegmentLink href="#" active>
                  Son 7 gün
                </SegmentLink>
                <SegmentLink href="#" active={false}>
                  30 gün
                </SegmentLink>
                <SegmentLink href="#" active={false}>
                  90 gün
                </SegmentLink>
              </SegmentGroup>
              <SegmentGroup label="Durum">
                <SegmentLink href="#" active={false}>
                  Tümü
                </SegmentLink>
                <SegmentLink href="#" active>
                  Yeni
                </SegmentLink>
                <SegmentLink href="#" active={false}>
                  Çözüldü
                </SegmentLink>
              </SegmentGroup>
            </div>
            <div className="border-t border-line p-4">
              <Pagination
                sayfa={2}
                toplamSayfa={5}
                toplamKayit={128}
                href={() => "#"}
              />
            </div>
          </Card>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="08"
          baslik="Boş, yükleniyor, hata"
          aciklama="Mutlu yol tasarımın yarısı. Boş durum ne yapılacağını söyler, yükleme gelecek içeriğin şeklini gösterir."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              ikon="☆"
              baslik="Henüz geri bildirim yok"
              aksiyon={<Button size="sm">QR kartlarını yazdır</Button>}
            >
              Masalardaki QR kodları okutulduğunda ilk puanlar burada belirir. Kartları
              masalara koymak genelde ilk günden sonuç verir.
            </EmptyState>

            <EmptyState
              ikon="⚠"
              tone="hata"
              baslik="Veriler yüklenemedi"
              aksiyon={
                <Button size="sm" variant="secondary">
                  Tekrar dene
                </Button>
              }
            >
              Sunucuya ulaşılamadı. Bağlantınız yerindeyse birkaç saniye sonra tekrar
              deneyin; sorun sürerse bize yazın.
            </EmptyState>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          <Card padded={false}>
            <SkeletonRows satir={4} />
          </Card>

          <div className="flex flex-col gap-3">
            <SystemBanner
              tone="uyari"
              aksiyon={
                <Button size="sm" variant="secondary">
                  Görüntülemeden çık
                </Button>
              }
            >
              <strong className="font-semibold">Kırıntı Fırın & Kahve</strong> hesabını
              görüntülüyorsunuz. Yaptığınız işlemler bu hesaba yazılır.
            </SystemBanner>

            <Alert
              tone="uyari"
              baslik="Aboneliğinizin bitmesine 9 gün kaldı"
              aksiyon={<Button size="sm">Yenile</Button>}
            >
              Süre dolduğunda masalardaki QR kodları çalışmaz; verileriniz silinmez,
              ödeme sonrası kaldığınız yerden devam edersiniz.
            </Alert>

            <Alert tone="hata" baslik="3 şikayet 24 saattir açık">
              Yeni durumundaki geri bildirimler bekledikçe müşteri kaybı riski artıyor.
            </Alert>

            <Alert tone="basari">Menü değişiklikleri kaydedildi ve yayına alındı.</Alert>

            <Alert tone="bilgi" baslik="KVKK saklama süresi">
              İletişim bilgileri 180 gün sonra otomatik silinir; kayıt anonim olarak
              raporlarda kalmaya devam eder.
            </Alert>
          </div>
        </Bolum>

        {/* ---------------------------------------------------------------- */}
        <Bolum
          no="09"
          baslik="Müşteri kabuğu"
          aciklama="Karşılama, menü ve anket ekranlarının ortak çerçevesi. Marka rengi şeridi, logo, işletme adı, masa etiketi — üç ekranda birebir aynı."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[MARKALAR[0], MARKALAR[2]].map((m) => (
              <div
                key={m.ad}
                data-marka
                style={markaStili(m.renk)}
                className="overflow-hidden rounded-card bg-canvas ring-1 ring-line"
              >
                <div className="h-1.5 bg-brand" />
                <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center">
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-title font-bold text-brand-ink shadow-raised ring-4 ring-white"
                    aria-hidden="true"
                  >
                    {m.ad.charAt(0)}
                  </span>
                  <p className="mt-3 text-heading font-semibold text-ink">{m.ad}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-small text-ink-muted">
                    <span className="rounded-full bg-sunken px-2 py-0.5 text-caption font-medium text-ink-soft">
                      Masa 7
                    </span>
                    30 saniyenizi alır
                  </p>

                  <div className="mt-5 w-full rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
                    <p className="text-body font-medium text-ink">
                      Deneyiminizi nasıl buldunuz?
                    </p>
                    <div className="mt-3 flex justify-center">
                      <Stars value={0} size="md" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-full rounded-control bg-brand px-4 py-3 text-body font-semibold text-brand-ink"
                  >
                    Menüyü gör
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-caption text-ink-muted">
            Sağdaki kart açık sarı bir markayla aynı bileşenin nasıl davrandığını
            gösteriyor: dolgu markanın rengi, üstündeki yazı otomatik olarak koyu
            mürekkebe düşüyor.
          </p>
        </Bolum>

        <footer className="border-t border-line pt-6 text-caption text-ink-muted">
          Bu sayfa canlı: token&apos;lar{" "}
          <code className="font-mono">src/app/globals.css</code>, bileşenler{" "}
          <code className="font-mono">src/components/ui/</code> içinde tanımlı. Burada
          gördüğünüz her şey uygulamanın kullandığı gerçek koddur, ekran görüntüsü
          değil.
        </footer>
      </div>
    </main>
  );
}

function Bolum({
  no,
  baslik,
  aciklama,
  children,
}: {
  no: string;
  baslik: string;
  aciklama: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-caption text-ink-faint">{no}</span>
        <div>
          <h2 className="text-title font-semibold text-ink">{baslik}</h2>
          <p className="mt-1 max-w-2xl text-small text-ink-muted">{aciklama}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
