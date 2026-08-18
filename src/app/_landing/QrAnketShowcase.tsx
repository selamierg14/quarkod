import { Bell, QrCode, Star } from "lucide-react";
import { Eyebrow } from "./Eyebrow";
import { PhoneFrame } from "./PhoneFrame";

const MADDELER = [
  {
    icon: QrCode,
    text: "Masadaki QR kod okutulduğunda müşteri 30 saniyede genel bir puan bırakır.",
  },
  {
    icon: Star,
    text: "İsterse siparişini de işaretleyip her ürünü ayrı ayrı puanlar — hangi tatlı, hangi içecek tutmuş görürsünüz.",
  },
  {
    icon: Bell,
    text: "Düşük puan geldiğinde e-posta ile anında haberiniz olur; yüksek puan Google yorumuna yönlendirilir.",
  },
];

export function QrAnketShowcase() {
  return (
    <section id="ozellikler" className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="order-2 flex justify-center lg:order-1">
          <div className="relative">
            <PhoneFrame
              src="/marketing/musteri-anket.png"
              alt="Müşterinin telefonunda açılan anket ekranı: beş yıldızla genel puan"
            />
            <div className="absolute -right-8 -bottom-8 hidden w-[172px] overflow-hidden rounded-card bg-surface p-3 shadow-pop ring-1 ring-line sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/musteri-urun-puan.png"
                alt="Ürün bazlı puanlama: Kayseri Mantısı için ayrı yıldız verme"
                className="h-auto w-full rounded-control"
              />
              <p className="mt-2 text-caption font-medium text-ink-soft">Ürün bazlı puanlama</p>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <Eyebrow icon={QrCode}>QR ile Anında Geri Bildirim</Eyebrow>
          <h2 className="mt-3 text-display font-semibold text-ink">
            Müşteri masadan kalkmadan ne düşündüğünü öğrenin
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            Bu, müşterinin gerçekten gördüğü ekran. Genel bir puanla başlar, isterse
            yediği ürünleri işaretleyip her birini ayrı puanlar.
          </p>

          <ul className="mt-6 flex flex-col gap-4">
            {MADDELER.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-small text-ink-soft">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
