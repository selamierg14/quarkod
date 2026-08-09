"use client";

import { useActionState } from "react";
import { BUSINESS_TYPE_LIST, qrCardText } from "@/lib/constants";
import { ImageUpload } from "@/components/ImageUpload";
import { updateBusiness, type FormState } from "../actions";

const INPUT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400";

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
      <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">İşletme adı</span>
          <input name="name" defaultValue={business.name} required className={INPUT} />
        </label>

        {isOwner ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Tür</span>
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
          <span className="text-xs text-slate-500">Adres</span>
          <input name="address" defaultValue={business.address ?? ""} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-slate-500">Google yorum linki</span>
          <input
            name="googleReviewUrl"
            type="url"
            placeholder="https://search.google.com/local/writereview?placeid=..."
            defaultValue={business.googleReviewUrl ?? ""}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">
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
          <span className="text-xs text-slate-500">Marka rengi</span>
          <input
            name="brandColor"
            type="color"
            defaultValue={business.brandColor}
            className="h-9 w-20 rounded-lg border border-slate-200 bg-white p-1"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-slate-500">
            QR kartındaki çağrı metni — masadaki kartta karekodun üstünde yazar
          </span>
          <input
            name="qrCardText"
            defaultValue={business.qrCardText ?? ""}
            placeholder={defaultCardText}
            maxLength={80}
            className={INPUT}
          />
          <span className="text-xs text-slate-400">
            Boş bırakırsanız varsayılan kullanılır. Kısa, karşılığı belli ve süre
            veren cümleler daha çok okutulur.
          </span>
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
        <input
          type="checkbox"
          name="googleRedirect"
          defaultChecked={business.googleRedirect}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-sm">
          <span className="font-medium">5 yıldızda Google&apos;a yönlendir</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Kapatırsanız herkes aynı nötr teşekkür ekranını görür; Google linki
            gösterilmez. Yorum filtreleme (review-gating) politikası nedeniyle
            ileride bu varyanta geçmek isterseniz kod değişikliği gerekmez.
          </span>
        </span>
      </label>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Kaydedildi.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
