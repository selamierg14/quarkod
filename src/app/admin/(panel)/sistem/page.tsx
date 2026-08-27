import { APP_VERSION } from "@/lib/constants";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DURUM_METNI, ZAMANLI_ISLER, isDurumu, type IsDurumu } from "@/lib/isler";
import {
  Alert,
  Badge,
  Card,
  PageHeader,
  formatDateTime,
  type BadgeTone,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sistem sağlığı" };

const TON: Record<IsDurumu, BadgeTone> = {
  calisti: "basari",
  gecikti: "uyari",
  hic: "hata",
  hatali: "hata",
};

const CRON_SATIRI =
  "0 4 * * * cd /uygulamanin/dizini && npm run isler:gunluk >> /var/log/memnuniyet.log 2>&1";

export default async function SistemPage() {
  await requireSuperadmin();

  // Her iş için yalnızca son çalışma yeterli; tarihçeyi göstermek bu ekranın
  // cevapladığı tek soruyu ("çalışıyor mu?") bulandırıyor.
  const sonlar = await Promise.all(
    ZAMANLI_ISLER.map((is) =>
      prisma.jobRun.findFirst({
        where: { name: is.ad },
        orderBy: { startedAt: "desc" },
      }),
    ),
  );

  const satirlar = ZAMANLI_ISLER.map((is, i) => ({
    ...is,
    son: sonlar[i],
    durum: isDurumu(is, sonlar[i]),
  }));

  const sorunlu = satirlar.filter((s) => s.durum !== "calisti");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sistem sağlığı ve Bilgileri"
        description="Sistem sürümü, ortam durumu ve zamanlanmış arka plan işleri."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-caption text-ink-muted">Uygulama Sürümü</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-ink font-mono">
              v{APP_VERSION}
            </span>
            <Badge tone="notr">SemVer</Badge>
          </div>
        </Card>
        <Card>
          <p className="text-caption text-ink-muted">Çalışma Ortamı</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-ink capitalize">
              {process.env.NODE_ENV ?? "development"}
            </span>
            <Badge tone={process.env.NODE_ENV === "production" ? "basari" : "bilgi"}>
              {process.env.VERCEL ? "Vercel" : "Node.js"}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-caption text-ink-muted">Veritabanı</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-ink">
              PostgreSQL
            </span>
            <Badge tone="basari">Neon Cloud</Badge>
          </div>
        </Card>
      </div>

      {sorunlu.length > 0 ? (
        <Alert tone="hata" baslik={`${sorunlu.length} iş beklendiği gibi çalışmıyor`}>
          Sunucuda cron kurulu değilse aşağıdaki tek satır üçünü birden çalıştırır.
        </Alert>
      ) : (
        <Alert tone="basari" baslik="Tüm işler zamanında çalışıyor">
          Son çalışmalar beklenen aralıkta.
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {satirlar.map((s) => (
          <Card key={s.ad}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-heading font-semibold text-ink">{s.etiket}</h2>
                  <Badge tone={TON[s.durum]}>{DURUM_METNI[s.durum]}</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-small text-ink-muted">{s.aciklama}</p>
              </div>
              <div className="text-right text-caption text-ink-muted">
                <p>
                  {s.son?.finishedAt
                    ? `Son çalışma: ${formatDateTime(s.son.finishedAt)}`
                    : "Henüz çalışmadı"}
                </p>
                <p className="text-ink-faint">
                  Beklenen aralık: {s.beklenenSaat} saat
                </p>
              </div>
            </div>

            {s.son && !s.son.ok && s.son.detail ? (
              <p className="mt-3 rounded-chip bg-danger-soft px-3 py-2 text-caption text-danger-ink">
                Son hata: {s.son.detail}
              </p>
            ) : null}

            <p className="mt-3 font-mono text-caption text-ink-faint">{s.komut}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-heading font-semibold text-ink">Cron kurulumu</h2>
        {process.env.VERCEL ? (
          <>
            <p className="mt-1 text-small text-ink-muted">
              Vercel&apos;de çalışıyor: KVKK temizliği ve haftalık rapor
              zaten <code className="font-mono">vercel.json</code>&apos;daki{" "}
              <code className="font-mono">crons</code> tanımıyla
              zamanlanıyor (sırasıyla her gün 04:00 ve pazartesi 06:00
              UTC). Yedekleme bu listede yok — Neon&apos;un kendi otomatik
              yedeklemesi zaten var, ayrı bir cron gerekmiyor.
            </p>
            <p className="mt-2 text-small text-ink-muted">
              Yukarıda &quot;Hiç çalışmadı&quot; görünüyorsa en olası sebep:
              proje ayarlarında{" "}
              <code className="font-mono">CRON_SECRET</code> tanımlı değil.
              Vercel yalnızca bu değişken varsa cron isteklerine yetki
              başlığı ekliyor; tanımlı değilse uç kimseye açık olmasın diye
              tüm istekleri reddediyor.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-small text-ink-muted">
              Sunucuda <code className="font-mono">crontab -e</code> ile
              aşağıdaki satırı ekleyin. Üç iş de bu tek satırla çalışır;
              haftalık rapor yalnızca kendi gününde gönderilir.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-chip bg-sunken p-3 font-mono text-caption text-ink-soft">
              {CRON_SATIRI}
            </pre>
          </>
        )}
      </Card>
    </div>
  );
}
