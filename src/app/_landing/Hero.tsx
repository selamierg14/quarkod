import { ArrowRight, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { ButtonLink, Card, Stars } from "@/components/ui";
import { Eyebrow } from "./Eyebrow";

const GUVEN_MADDELERI = [
  "Kredi kartı istemiyoruz",
  "Kurulum 2 dakika sürer",
  "Verileriniz KVKK kapsamında",
];

const ORNEK_PUANLAR = [
  { ad: "Servis hızı", puan: 5 },
  { ad: "Lezzet", puan: 4 },
  { ad: "Temizlik", puan: 5 },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-12rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-brand/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-[-10rem] h-[22rem] w-[22rem] rounded-full bg-info/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
        <div>
          <Eyebrow icon={Sparkles}>QR ile Müşteri Memnuniyet Sistemi</Eyebrow>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Müşteri masadan kalkmadan <span className="text-brand">memnuniyetini öğrenin</span>
          </h1>
          <p className="mt-4 max-w-xl text-body text-ink-soft">
            Masaya koyduğunuz QR kod 30 saniyede puan toplar; düşük puanı size anında
            e-posta ile haber verir, yüksek puanı Google yorumuna yönlendirir. Kurulum
            yok, kredi kartı yok — 7 gün ücretsiz deneyin.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink href="/deneme" size="lg" variant="brand">
              7 gün ücretsiz dene
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="#nasil-calisir" size="lg" variant="secondary">
              Nasıl çalışır?
            </ButtonLink>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-caption text-ink-muted">
            {GUVEN_MADDELERI.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <Card className="mm-rise mx-auto max-w-sm rotate-1 shadow-pop transition-transform duration-300 hover:rotate-0">
            <div className="flex items-center justify-between">
              <p className="text-overline font-semibold text-ink-muted uppercase">
                Kırıntı Fırın &amp; Kahve · Masa 4
              </p>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-title font-semibold text-ink">Bizi nasıl buldunuz?</p>

            <div className="mt-5 flex flex-col gap-3 text-small">
              {ORNEK_PUANLAR.map((s) => (
                <div key={s.ad} className="flex items-center justify-between">
                  <span className="text-ink-soft">{s.ad}</span>
                  <Stars value={s.puan} />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-control bg-success-soft px-4 py-3 text-small text-success-ink">
              Teşekkürler! Puanınız işletmeye anında iletildi.
            </div>
          </Card>

          <div
            aria-hidden="true"
            className="mm-rise absolute -top-5 -right-4 hidden items-center gap-2 rounded-control bg-surface px-3.5 py-2.5 shadow-pop ring-1 ring-line sm:flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-soft text-success-ink">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-caption text-ink-muted">Bu hafta</p>
              <p className="text-small font-semibold text-ink">4.6 ortalama puan</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
