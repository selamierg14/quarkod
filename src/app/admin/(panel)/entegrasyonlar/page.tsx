import { requireTenantOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Entegrasyonlar" };

type Entegrasyon = {
  isim: string;
  saglayici: string;
  aciklama: string;
  renk: string;
  harf: string;
};

const ENTEGRASYONLAR: Entegrasyon[] = [
  {
    isim: "SMS",
    saglayici: "Ekomesaj",
    aciklama: "Şifre sıfırlama ve doğrulama kodlarını SMS ile gönderir.",
    renk: "#0284c7",
    harf: "S",
  },
  {
    isim: "WhatsApp",
    saglayici: "Ekomesaj",
    aciklama: "Bildirim ve pazarlama mesajlarını WhatsApp üzerinden iletir.",
    renk: "#059669",
    harf: "W",
  },
  {
    isim: "İYS",
    saglayici: "İzin.app",
    aciklama: "Ticari elektronik ileti izinlerini otomatik olarak İYS'ye bildirir.",
    renk: "#7c3aed",
    harf: "İ",
  },
  {
    isim: "POS cihazı",
    saglayici: "PlusPay",
    aciklama: "Masadaki ödemeyi POS cihazından doğrudan panele işler.",
    renk: "#dc2626",
    harf: "P",
  },
];

export default async function EntegrasyonlarPage() {
  await requireTenantOwner();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title font-semibold">Entegrasyonlar</h1>
        <p className="mt-1 text-small text-ink-muted">
          Panelinize ek hizmet sağlayıcıları bağlayın. Aşağıdakiler yakında
          açılacak — şimdilik yalnızca önizleme.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ENTEGRASYONLAR.map((e) => (
          <div
            key={e.isim}
            className="flex flex-col gap-3 rounded-control bg-surface p-5 ring-1 ring-line"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip text-heading font-semibold text-white"
                style={{ backgroundColor: e.renk }}
                aria-hidden="true"
              >
                {e.harf}
              </span>
              <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-medium text-warning-ink">
                Yakında
              </span>
            </div>

            <div>
              <h2 className="font-medium text-ink">{e.isim}</h2>
              <p className="text-caption text-ink-faint">{e.saglayici}</p>
            </div>

            <p className="text-small text-ink-muted">{e.aciklama}</p>

            <button
              type="button"
              disabled
              className="mt-auto self-start rounded-chip border border-line px-3 py-1.5 text-small text-ink-faint"
            >
              Bağlan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
