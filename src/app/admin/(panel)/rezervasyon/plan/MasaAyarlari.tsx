"use client";

import { useActionState } from "react";
import { masaKaydet, type RezervasyonFormState } from "../actions";

export type AyarMasasi = {
  id: string;
  tableNumber: string;
  kapasite: number;
  sekil: string;
  zoneId: string | null;
  active: boolean;
};

/**
 * Masa başına kapasite / bölge / şekil ayarı.
 *
 * Her satır kendi formu: tek bir "hepsini kaydet" formu, 40 masalı bir
 * mekanda tek bir kapasiteyi düzeltmek için tüm tabloyu göndermek
 * demekti — ve bir satırdaki hata diğerlerini de düşürürdü.
 */
export function MasaAyarlari({
  businessId,
  masalar,
  bolgeler,
}: {
  businessId: string;
  masalar: AyarMasasi[];
  bolgeler: { id: string; ad: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {masalar.map((masa) => (
        <Satir key={masa.id} businessId={businessId} masa={masa} bolgeler={bolgeler} />
      ))}
    </div>
  );
}

function Satir({
  businessId,
  masa,
  bolgeler,
}: {
  businessId: string;
  masa: AyarMasasi;
  bolgeler: { id: string; ad: string }[];
}) {
  const [durum, eylem, bekliyor] = useActionState<RezervasyonFormState, FormData>(
    masaKaydet,
    {},
  );

  return (
    <form
      action={eylem}
      className="flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-3"
    >
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="tableId" value={masa.id} />

      <span className="min-w-16 pb-2 font-semibold text-ink">
        Masa {masa.tableNumber}
        {!masa.active ? <span className="ml-1 text-caption text-ink-faint">(kapalı)</span> : null}
      </span>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-soft">Kapasite</span>
        <input
          name="kapasite"
          type="number"
          min={1}
          max={50}
          defaultValue={masa.kapasite}
          className="w-20 rounded-control border border-line px-2 py-1.5 text-small text-ink-strong"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-soft">Bölge</span>
        <select
          name="zoneId"
          defaultValue={masa.zoneId ?? ""}
          className="rounded-control border border-line bg-surface px-2 py-1.5 text-small text-ink"
        >
          <option value="">Bölgesiz</option>
          {bolgeler.map((b) => (
            <option key={b.id} value={b.id}>
              {b.ad}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-soft">Şekil</span>
        <select
          name="sekil"
          defaultValue={masa.sekil}
          className="rounded-control border border-line bg-surface px-2 py-1.5 text-small text-ink"
        >
          <option value="kare">Kare</option>
          <option value="yuvarlak">Yuvarlak</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={bekliyor}
        className="rounded-control border border-line px-3 py-1.5 text-small font-semibold text-ink hover:bg-sunken disabled:opacity-50"
      >
        {bekliyor ? "…" : "Kaydet"}
      </button>

      {durum.error ? <span className="text-caption text-danger-ink">{durum.error}</span> : null}
      {durum.saved ? <span className="text-caption text-success-ink">✓</span> : null}
    </form>
  );
}
