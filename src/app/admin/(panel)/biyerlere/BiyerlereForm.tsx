"use client";

import { useActionState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui";
import { FIYAT_SEGMENTLERI, MEKAN_OZELLIKLERI, ozellikleriCoz } from "@/lib/mekan";
import { updateBiyerlereSettings, type BiyerlereFormState } from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";
const ETIKET = "text-small font-medium text-ink-soft";
const YARDIM = "text-caption text-ink-faint";

type Business = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  priceSegment: string | null;
  mekanOzellikleri: string | null;
  phone: string | null;
  biyerlerePlusOrtagi: boolean;
};

export function BiyerlereForm({ business }: { business: Business }) {
  const [state, formAction, pending] = useActionState<BiyerlereFormState, FormData>(
    updateBiyerlereSettings,
    {},
  );
  const { bildir } = useToast();
  const sonDurum = useRef(state);
  useEffect(() => {
    if (sonDurum.current === state) return;
    sonDurum.current = state;
    if (state.error) bildir(state.error, "hata");
    else if (state.saved) bildir("Biyerlere ayarları kaydedildi.");
  }, [state, bildir]);

  const seciliOzellikler = ozellikleriCoz(business.mekanOzellikleri);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={business.id} />

      <div className="rounded-control bg-canvas px-3 py-2.5">
        <p className={YARDIM}>
          Bu bilgiler <strong>Biyerlere</strong> uygulamasında görünür: koordinat haritadaki
          pini, özellikler ise &quot;priz var mı, bahçesi var mı&quot; filtrelerini besler. Boş
          bırakırsanız işletme keşfet ekranında hiç listelenmez.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={ETIKET}>Enlem (latitude)</span>
          <input
            name="latitude"
            inputMode="decimal"
            defaultValue={business.latitude ?? ""}
            placeholder="ör. 40.8715146"
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={ETIKET}>Boylam (longitude)</span>
          <input
            name="longitude"
            inputMode="decimal"
            defaultValue={business.longitude ?? ""}
            placeholder="ör. 29.2329381"
            className={INPUT}
          />
        </label>
      </div>
      <span className={YARDIM}>
        Bu sayıları elle bulmanız gerekmiyor: İşletme Ayarları&apos;ndaki{" "}
        <strong>Google yorum linki</strong> bir Google Haritalar adresiyse koordinat
        kaydederken oradan otomatik alınır. Elle girdiğiniz değer her zaman önceliklidir.
      </span>

      <label className="flex flex-col gap-1 border-t border-line pt-3">
        <span className={ETIKET}>Bütçe segmenti</span>
        <select
          name="priceSegment"
          defaultValue={business.priceSegment ?? ""}
          className={`${INPUT} w-52`}
        >
          <option value="">Belirtilmedi</option>
          {Object.entries(FIYAT_SEGMENTLERI).map(([deger, etiket]) => (
            <option key={deger} value={deger}>
              {etiket}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 border-t border-line pt-3">
        <legend className={ETIKET}>Mekan özellikleri</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MEKAN_OZELLIKLERI).map(([deger, etiket]) => (
            <label
              key={deger}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-caption has-checked:border-accent-600 has-checked:bg-accent-50 has-checked:text-accent-700"
            >
              <input
                type="checkbox"
                name="mekanOzellikleri"
                value={deger}
                defaultChecked={seciliOzellikler.includes(deger as never)}
                className="sr-only"
              />
              {etiket}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 border-t border-line pt-3">
        <span className={ETIKET}>Telefon (WhatsApp)</span>
        <input
          name="phone"
          type="tel"
          placeholder="+905XXXXXXXXX"
          defaultValue={business.phone ?? ""}
          className={INPUT}
        />
        <span className={YARDIM}>
          Doldurulursa mekan profilinizde &quot;Ara&quot; ve &quot;WhatsApp&apos;ta yaz&quot;
          düğmeleri görünür — ikisi de aynı numarayı kullanır.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5 border-t border-line pt-3">
        <input
          type="checkbox"
          name="biyerlerePlusOrtagi"
          defaultChecked={business.biyerlerePlusOrtagi}
          className="mt-0.5 shrink-0"
        />
        <span>
          <span className={ETIKET}>Biyerlere Plus ortağıyım</span>
          <span className={`block ${YARDIM}`}>
            Açarsanız Plus üyeleri günde bir kez işletmenizden ücretsiz kahve talep edebilir
            (kupon olarak düşer). Plus aboneliği ayrı yönetiliyor, bu yalnızca SİZİN katılıp
            katılmadığınız.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-accent-600 px-4 py-2.5 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
