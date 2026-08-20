"use client";

import { tekQrOlustur } from "../actions";

/**
 * Tek ortak QR'ı açan/gösteren küçük kart.
 *
 * "Masaya özel mi, tek ortak mı" kararı kurulumun en belirleyici adımı;
 * bir onay kutusu yerine kendi düğmesi olması gerekiyordu.
 */
export function TekQrKurulum({
  businessId,
  mevcutMu,
}: {
  businessId: string;
  mevcutMu: boolean;
}) {
  if (mevcutMu) {
    return (
      <div className="flex items-center gap-3 rounded-control bg-teal-50 px-4 py-3 ring-1 ring-teal-100">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white"
        >
          ✓
        </span>
        <p className="text-small text-teal-900">
          Ortak QR hazır. Yazdırma sekmesinde <strong>&quot;Giriş&quot;</strong>{" "}
          adıyla görünüyor.
        </p>
      </div>
    );
  }

  return (
    <form action={tekQrOlustur}>
      <input type="hidden" name="businessId" value={businessId} />
      <button
        type="submit"
        className="w-full rounded-control bg-teal-600 px-4 py-2.5 text-small font-semibold text-white shadow-card transition hover:bg-teal-700"
      >
        Tek ortak QR oluştur
      </button>
    </form>
  );
}
