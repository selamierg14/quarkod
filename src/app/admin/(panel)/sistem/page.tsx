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
        title="Sistem sağlığı"
        description="Zamanlanmış bakım işleri. Bunlar sunucuda cron'a bağlanmazsa hiç çalışmaz ve kimse fark etmez — bu ekran o sessiz arızayı görünür kılar."
      />

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
        <p className="mt-1 text-small text-ink-muted">
          Sunucuda <code className="font-mono">crontab -e</code> ile aşağıdaki
          satırı ekleyin. Üç iş de bu tek satırla çalışır; haftalık rapor
          yalnızca kendi gününde gönderilir.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-chip bg-sunken p-3 font-mono text-caption text-ink-soft">
          {CRON_SATIRI}
        </pre>
      </Card>
    </div>
  );
}
