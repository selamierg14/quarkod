import { Activity } from "lucide-react";
import { APP_VERSION } from "@/lib/cekirdek/constants";
import { requireSuperadmin } from "@/lib/kimlik/auth";
import { DURUM_METNI, isSorunluMu, type IsDurumu } from "@/lib/altyapi/isler";
import { isSatirlari } from "@/lib/rapor/platform-uyarilari";
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
  yonetiliyor: "basari",
  gecikti: "uyari",
  hic: "hata",
  hatali: "hata",
};

const CRON_SATIRI =
  "0 4 * * * cd /uygulamanin/dizini && npm run isler:gunluk >> /var/log/memnuniyet.log 2>&1";

/**
 * Sistem sağlığı.
 *
 * İki kitleye birden konuşuyordu: üstte "çalışıyor mu" cevabı, hemen
 * yanında `npm`, `crontab`, `CRON_SECRET`. UI incelemesi metinlerin
 * geliştirici dilinde olduğunu yakaladı. Artık üst kısım yalnızca durum
 * söylüyor; komutlar ve kurulum notu kapalı "Teknik detay" alanlarında.
 *
 * Neon'un yönettiği yedekleme kırmızı "Hiç çalışmadı" değil, yeşil
 * "Neon tarafından yönetiliyor" (bkz. lib/altyapi/isler.ts —
 * yedeklemeYonetiliyorMu).
 */
export default async function SistemPage() {
  await requireSuperadmin();

  const satirlar = await isSatirlari();
  const sorunlu = satirlar.filter((s) => isSorunluMu(s.durum));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        ikon={<Activity className="h-4 w-4" aria-hidden="true" />}
        renk="slate"
        title="Sistem sağlığı"
        description="Uygulama sürümü, çalışma ortamı ve arka planda zamanlanmış işlerin son durumu."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-caption text-ink-muted">Uygulama sürümü</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-ink tabular">
            {APP_VERSION}
          </p>
        </Card>
        <Card>
          <p className="text-caption text-ink-muted">Çalışma ortamı</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-ink">
              {process.env.NODE_ENV === "production" ? "Canlı" : "Geliştirme"}
            </span>
            <Badge tone={process.env.NODE_ENV === "production" ? "basari" : "bilgi"}>
              {process.env.VERCEL ? "Vercel" : "Sunucu"}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-caption text-ink-muted">Veritabanı</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-ink">PostgreSQL</span>
            <Badge tone="basari">Neon</Badge>
          </div>
        </Card>
      </div>

      {sorunlu.length > 0 ? (
        <Alert tone="hata" baslik={`${sorunlu.length} iş beklendiği gibi çalışmıyor`}>
          Aşağıda kırmızı ya da sarı işaretli işlere bakın; nasıl kurulacağı her
          işin &quot;Teknik detay&quot; bölümünde.
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-body font-semibold text-ink">{s.etiket}</h2>
                  <Badge tone={TON[s.durum]}>{DURUM_METNI[s.durum]}</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-small text-ink-muted">
                  {s.durum === "yonetiliyor"
                    ? "Veritabanı sağlayıcısı (Neon) otomatik anlık yedek alıyor ve geçmiş bir ana geri dönmeye izin veriyor; ayrıca bir iş çalıştırmak gerekmiyor."
                    : s.aciklama}
                </p>
              </div>
              {s.durum === "yonetiliyor" ? null : (
                <div className="text-right text-caption text-ink-muted">
                  <p>
                    {s.sonCalisma
                      ? `Son çalışma: ${formatDateTime(s.sonCalisma)}`
                      : "Henüz çalışmadı"}
                  </p>
                  <p className="text-ink-faint">
                    Beklenen aralık: {s.beklenenSaat >= 48 ? `${Math.round(s.beklenenSaat / 24)} gün` : `${s.beklenenSaat} saat`}
                  </p>
                </div>
              )}
            </div>

            {s.sonHata ? (
              <p className="mt-3 rounded-chip bg-danger-soft px-3 py-2 text-caption text-danger-ink">
                Son hata: {s.sonHata}
              </p>
            ) : null}

            {s.durum === "yonetiliyor" ? null : (
              <details className="mt-3 text-caption">
                <summary className="cursor-pointer text-ink-faint hover:text-ink-muted">
                  Teknik detay
                </summary>
                <p className="mt-1.5 font-mono text-ink-faint">{s.komut}</p>
              </details>
            )}
          </Card>
        ))}
      </div>

      <details className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
        <summary className="cursor-pointer text-body font-semibold text-ink">
          Teknik detay: zamanlama kurulumu
        </summary>
        {process.env.VERCEL ? (
          <>
            <p className="mt-2 text-small text-ink-muted">
              Vercel&apos;de çalışıyor: KVKK temizliği ve haftalık rapor{" "}
              <code className="font-mono">vercel.json</code>&apos;daki{" "}
              <code className="font-mono">crons</code> tanımıyla zamanlanıyor
              (her gün 04:00 ve pazartesi 06:00 UTC).
            </p>
            <p className="mt-2 text-small text-ink-muted">
              Bir iş &quot;Hiç çalışmadı&quot; görünüyorsa en olası sebep: proje
              ayarlarında <code className="font-mono">CRON_SECRET</code> tanımlı
              değil. Vercel yalnızca bu değişken varsa cron isteklerine yetki
              başlığı ekliyor; tanımlı değilse uç kimseye açık olmasın diye tüm
              istekleri reddediyor.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-small text-ink-muted">
              Sunucuda <code className="font-mono">crontab -e</code> ile aşağıdaki
              satırı ekleyin. Üç iş de bu tek satırla çalışır; haftalık rapor
              yalnızca kendi gününde gönderilir.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-chip bg-sunken p-3 font-mono text-caption text-ink-soft">
              {CRON_SATIRI}
            </pre>
          </>
        )}
      </details>
    </div>
  );
}
