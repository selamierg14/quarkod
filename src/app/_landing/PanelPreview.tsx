import { Building2, LayoutDashboard, Megaphone, ShieldCheck, Star, Users } from "lucide-react";
import { Eyebrow } from "./Eyebrow";
import { BrowserFrame } from "./BrowserFrame";

const PANEL_MADDELERI = [
  { icon: Star, text: "Hangi ürün, hangi şube düşük puan alıyor — ürün bazlı raporla görün" },
  { icon: Building2, text: "Çoklu şube desteği ve bölge yöneticisi rolü" },
  { icon: Users, text: "Sahip, yönetici ve salt-okunur rolleriyle ekip yönetimi" },
  { icon: ShieldCheck, text: "Denetim kaydı ve iki adımlı SMS girişi" },
  { icon: Megaphone, text: "Menü üstünde kampanya duyuru şeridi" },
];

export function PanelPreview() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow icon={LayoutDashboard}>Yönetim Paneli</Eyebrow>
          <h2 className="mt-3 text-display font-semibold text-ink">
            Tek panelden bütün işletmeyi yönetin
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            Aşağıdaki ekran görüntüsü gerçek panelden — kurgu değil. Anket
            cevaplarından raporlara, menüden kullanıcı yetkilerine kadar her şey
            aynı yerde.
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            {PANEL_MADDELERI.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-small text-ink-soft">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <BrowserFrame
            src="/marketing/admin-dashboard.png"
            alt="Yönetim panelinin özet ekranı: puan trendi, kategori kırılımı ve son geri bildirimler"
            label="Özet"
          />
          <div className="absolute -bottom-8 -left-6 hidden w-[220px] overflow-hidden rounded-card bg-surface shadow-pop ring-1 ring-line md:block">
            <div className="aspect-[1440/900] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/admin-urunler.png"
                alt="Ürün puanları raporu: en beğenilen ve en düşük puanlı ürünler"
                className="h-full w-full object-cover object-left-top"
              />
            </div>
            <p className="border-t border-line px-3 py-2 text-caption font-medium text-ink-soft">
              Ürün bazlı rapor
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
