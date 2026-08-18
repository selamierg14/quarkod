import { Building2, Check, Rocket, Tag, Zap } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { Eyebrow } from "./Eyebrow";

type Paket = {
  ad: string;
  icon: typeof Zap;
  fiyat: string;
  aciklama: string;
  ozellikler: string[];
  vurgu?: boolean;
};

const PAKETLER: Paket[] = [
  {
    ad: "Giriş",
    icon: Zap,
    fiyat: "349",
    aciklama: "Tek şubeli işletmeler için gerekli her şey.",
    ozellikler: [
      "Tek şube, sınırsız masa QR kodu",
      "Anket ve puanlama",
      "Düşük puanda e-posta bildirimi",
      "Google yorumuna yönlendirme",
      "Haftalık özet rapor",
    ],
  },
  {
    ad: "Orta",
    icon: Rocket,
    fiyat: "699",
    aciklama: "Menüsünü dijitalleştirmek isteyen işletmeler için.",
    ozellikler: [
      "Giriş paketindeki her şey",
      "Fotoğraflı QR menü",
      "Ürün bazlı puanlama",
      "Kupon ve sadakat tanımlama",
      "Duyuru şeridi ve çoklu dil desteği",
    ],
    vurgu: true,
  },
  {
    ad: "İleri",
    icon: Building2,
    fiyat: "1.290",
    aciklama: "Çoklu şubeyi tek merkezden yönetenler için.",
    ozellikler: [
      "Orta paketindeki her şey",
      "Çoklu şube ve bölge yöneticisi rolü",
      "Şube kıyaslama raporu",
      "Toplu QR PDF (matbaa çıktısı)",
      "Denetim kaydı, iki adımlı giriş, öncelikli destek",
    ],
  },
];

export function Pricing() {
  return (
    <section id="paketler" className="bg-sunken/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-xl">
          <Eyebrow icon={Tag}>Paketler</Eyebrow>
          <h2 className="mt-3 text-display font-semibold text-ink">
            İşletmenize göre büyüyen fiyatlandırma
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            Hangi paketi seçerseniz seçin, önce 7 gün ücretsiz deneyin. Kredi kartı
            istemiyoruz.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-start">
          {PAKETLER.map((p) => (
            <Card
              key={p.ad}
              className={`relative flex h-full flex-col ${
                p.vurgu
                  ? "bg-gradient-to-b from-brand-soft/70 to-surface to-40% ring-2 ring-brand shadow-pop lg:-translate-y-3"
                  : ""
              }`}
            >
              {p.vurgu ? (
                <span className="absolute top-5 right-5 rounded-full bg-brand px-2.5 py-0.5 text-caption font-semibold text-brand-ink">
                  En popüler
                </span>
              ) : null}

              <span
                className={`flex h-10 w-10 items-center justify-center rounded-control ${
                  p.vurgu ? "bg-brand text-brand-ink" : "bg-sunken text-ink"
                }`}
              >
                <p.icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <p className="mt-4 text-title font-semibold text-ink">{p.ad}</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-metric font-semibold text-ink">₺{p.fiyat}</span>
                <span className="text-small text-ink-muted">/ ay</span>
              </p>
              <p className="mt-2 text-small text-ink-muted">{p.aciklama}</p>

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {p.ozellikler.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-small text-ink-soft">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    {o}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href="/deneme"
                block
                size="lg"
                variant={p.vurgu ? "brand" : "secondary"}
                className="mt-6"
              >
                7 gün ücretsiz dene
              </ButtonLink>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-caption text-ink-muted">
          Fiyatlara KDV dahildir. Deneme süresince kart bilgisi istemiyoruz; 7 gün
          sonunda dilediğiniz paketi seçip devam edersiniz.
        </p>
      </div>
    </section>
  );
}
