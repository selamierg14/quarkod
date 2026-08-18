import {
  Camera,
  Languages,
  Leaf,
  ListChecks,
  ShoppingBag,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { Eyebrow } from "./Eyebrow";

const MADDELER = [
  {
    icon: Camera,
    text: "Ürün fotoğrafı ekleyin — fotoğraflı ürünler menüde çok daha fazla tercih edilir.",
  },
  {
    icon: ListChecks,
    text: "Kategorileri ve ürünleri panelden sürükleyip sıralayın, tükenen ürünü tek dokunuşla işaretleyin.",
  },
  {
    icon: Leaf,
    text: "Vegan, glutensiz gibi diyet etiketleri ekleyin; müşteri filtreleyerek kendine uygun ürünleri saniyede bulsun.",
  },
  {
    icon: ShoppingBag,
    text: "Yemeksepeti, Getir ve Trendyol sayfalarınız karşılama ekranında; paket sipariş isteyen müşteri tek dokunuşla yönelir.",
  },
  {
    icon: Wifi,
    text: "Wi-Fi şifresi ve Instagram hesabınız karşılama ekranında; müşteri tek dokunuşla kopyalar, sizi takip eder.",
  },
  {
    icon: Languages,
    text: "Menü ve anket otomatik olarak müşterinin diline çevrilir; turist müşteri kendi dilinde okur.",
  },
];

export function QrMenuShowcase() {
  return (
    <section className="bg-sunken/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow icon={UtensilsCrossed}>Fotoğraflı QR Menü</Eyebrow>
            <h2 className="mt-3 text-display font-semibold text-ink">
              Menünüzü müşterinin göreceği gibi yönetin
            </h2>
            <p className="mt-3 text-body text-ink-soft">
              Ürün fotoğrafı, açıklama ve fiyat — hepsi panelden birkaç dakikada
              güncellenir, müşteri ekranına anında yansır.
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

          <div className="relative flex justify-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-64 w-64 rounded-full bg-brand/15 blur-3xl"
            />
            <div className="relative w-[220px] -rotate-2 overflow-hidden rounded-card bg-surface p-2 shadow-pop ring-1 ring-line transition-transform duration-300 hover:rotate-0">
              <div className="aspect-[173/262] w-full overflow-hidden rounded-control">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/marketing/musteri-menu.png"
                  alt="Müşterinin gördüğü fotoğraflı menü kartı: ürün adı ve fiyatı"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-caption font-medium text-ink-soft shadow-pop ring-1 ring-line">
              <Camera className="h-3.5 w-3.5 text-brand-strong" aria-hidden="true" />
              Gerçek müşteri ekranı
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
