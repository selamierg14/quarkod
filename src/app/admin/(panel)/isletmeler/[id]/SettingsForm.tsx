"use client";

import { useActionState } from "react";
import { BUSINESS_TYPE_LIST, qrCardText } from "@/lib/constants";
import { ImageUpload } from "@/components/ImageUpload";
import { updateBusiness, type FormState } from "../actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

type Business = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  googleReviewUrl: string | null;
  brandColor: string;
  notifyThreshold: number;
  googleRedirect: boolean;
  qrCardText: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  instagramUrl: string | null;
  wifiSsid: string | null;
  wifiPassword: string | null;
  announcement: string | null;
  announcementActive: boolean;
  yemeksepetiUrl: string | null;
  getirUrl: string | null;
  trendyolUrl: string | null;
  migrosUrl: string | null;
};

export function SettingsForm({
  business,
  isOwner,
}: {
  business: Business;
  isOwner: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateBusiness,
    {},
  );
  const defaultCardText = qrCardText(business.type);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={business.id} />

      {/* Anket ekranında görünen görseller. Marka rengiyle birlikte müşterinin
          doğru yere geldiğini anlamasını sağlar. */}
      <div className="grid gap-4 rounded-chip bg-canvas p-4 sm:grid-cols-2">
        <ImageUpload
          name="logoUrl"
          kind="logo"
          label="Logo"
          hint="Kare görünür. PNG/JPEG/WebP, kendiliğinden küçültülür."
          initial={business.logoUrl}
          brandColor={business.brandColor}
        />
        <ImageUpload
          name="coverUrl"
          kind="cover"
          label="Kapak fotoğrafı (isteğe bağlı)"
          hint="Anket ekranının tepesinde geniş görünür. Kafenin bir fotoğrafı olabilir."
          initial={business.coverUrl}
          brandColor={business.brandColor}
        />

        {/* Form uzun; görselleri seçen kişi en alttaki kaydet düğmesini
            görmüyordu. Aynı formu buradan da gönderebilsin. */}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white disabled:bg-slate-400"
          >
            {pending ? "Kaydediliyor..." : "Görselleri kaydet"}
          </button>
          <span className="text-caption text-ink-muted">
            Aşağıdaki ayarlarla birlikte kaydedilir.
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">İşletme adı</span>
          <input name="name" defaultValue={business.name} required className={INPUT} />
        </label>

        {isOwner ? (
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Tür</span>
            <select name="type" defaultValue={business.type} className={INPUT}>
              {BUSINESS_TYPE_LIST.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Adres</span>
          <input name="address" defaultValue={business.address ?? ""} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">Google yorum linki</span>
          <input
            name="googleReviewUrl"
            type="url"
            placeholder="https://search.google.com/local/writereview?placeid=..."
            defaultValue={business.googleReviewUrl ?? ""}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Bildirim eşiği (bu puan ve altında haber ver)
          </span>
          <select
            name="notifyThreshold"
            defaultValue={String(business.notifyThreshold)}
            className={INPUT}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} ve altı
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Marka rengi</span>
          <input
            name="brandColor"
            type="color"
            defaultValue={business.brandColor}
            className="h-9 w-20 rounded-chip border border-line bg-surface p-1"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">
            QR kartındaki çağrı metni — masadaki kartta karekodun üstünde yazar
          </span>
          <input
            name="qrCardText"
            defaultValue={business.qrCardText ?? ""}
            placeholder={defaultCardText}
            maxLength={80}
            className={INPUT}
          />
          <span className="text-caption text-ink-faint">
            Boş bırakırsanız varsayılan kullanılır. Kısa, karşılığı belli ve süre
            veren cümleler daha çok okutulur.
          </span>
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">Instagram linki</span>
          <input
            name="instagramUrl"
            type="url"
            placeholder="https://instagram.com/kafeniz"
            defaultValue={business.instagramUrl ?? ""}
            className={INPUT}
          />
          <span className="text-caption text-ink-faint">
            Doldurulursa QR karşılama ekranında Instagram simgesi görünür.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Wi-Fi ağ adı (SSID)</span>
          <input
            name="wifiSsid"
            defaultValue={business.wifiSsid ?? ""}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Wi-Fi şifresi</span>
          <input
            name="wifiPassword"
            defaultValue={business.wifiPassword ?? ""}
            className={INPUT}
          />
          <span className="text-caption text-ink-faint">
            İkisi de doluysa QR ekranında müşteri kopyalayabileceği bir Wi-Fi
            butonu görünür.
          </span>
        </label>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">
            Online sipariş linkleri
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="yemeksepetiUrl"
              type="url"
              placeholder="Yemeksepeti sayfa linki"
              defaultValue={business.yemeksepetiUrl ?? ""}
              className={INPUT}
            />
            <input
              name="getirUrl"
              type="url"
              placeholder="Getir sayfa linki"
              defaultValue={business.getirUrl ?? ""}
              className={INPUT}
            />
            <input
              name="trendyolUrl"
              type="url"
              placeholder="Trendyol Yemek linki"
              defaultValue={business.trendyolUrl ?? ""}
              className={INPUT}
            />
            <input
              name="migrosUrl"
              type="url"
              placeholder="Migros Yemek linki"
              defaultValue={business.migrosUrl ?? ""}
              className={INPUT}
            />
          </div>
          <span className="text-caption text-ink-faint">
            Doldurduğunuz platformlar QR karşılama ekranında sipariş butonu
            olarak görünür. Boş bıraktıklarınız gösterilmez.
          </span>
        </div>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">
            Duyuru — QR menünün tepesinde görünür
          </span>
          <input
            name="announcement"
            defaultValue={business.announcement ?? ""}
            placeholder="Hafta sonu canlı müzik var!"
            maxLength={120}
            className={INPUT}
          />
          <span className="text-caption text-ink-faint">
            Kampanya bitince metni silmenize gerek yok; aşağıdaki kutuyu
            kapatıp sonra geri açabilirsiniz.
          </span>
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-chip bg-canvas p-3">
        <input
          type="checkbox"
          name="announcementActive"
          defaultChecked={business.announcementActive}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-small">
          <span className="font-medium">Duyuruyu menüde göster</span>
          <span className="mt-0.5 block text-caption text-ink-muted">
            Kapalıyken müşteri şeridi görmez.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-chip bg-canvas p-3">
        <input
          type="checkbox"
          name="googleRedirect"
          defaultChecked={business.googleRedirect}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-small">
          <span className="font-medium">5 yıldızda Google&apos;a yönlendir</span>
          <span className="mt-0.5 block text-caption text-ink-muted">
            Kapatırsanız herkes aynı nötr teşekkür ekranını görür; Google linki
            gösterilmez. Yorum filtreleme (review-gating) politikası nedeniyle
            ileride bu varyanta geçmek isterseniz kod değişikliği gerekmez.
          </span>
        </span>
      </label>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          Kaydedildi.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
