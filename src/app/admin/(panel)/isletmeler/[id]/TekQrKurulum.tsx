"use client";

import { tekQrOlustur, toggleTable } from "../actions";

/**
 * Tek ortak QR'ı açan/gösteren küçük kart.
 *
 * "Masaya özel mi, tek ortak mı" kararı kurulumun en belirleyici adımı;
 * bir onay kutusu yerine kendi düğmesi olması gerekiyordu.
 */
export function TekQrKurulum({
  businessId,
  girisMasasi,
}: {
  businessId: string;
  /** Giriş kaydı hiç oluşturulmadıysa null. */
  girisMasasi: { id: string; active: boolean } | null;
}) {
  if (girisMasasi?.active) {
    return (
      <div className="flex flex-col gap-3">
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
        {/* Silmiyor, kapatıyor: aynı toggleTable mekanizması masaya özel
            QR'larla kullandığımız. İşletme fikrini değiştirirse "Tek ortak
            QR oluştur" ile aynı kayıt geri açılıyor, sıfırdan kurulmuyor. */}
        <form action={toggleTable}>
          <input type="hidden" name="tableId" value={girisMasasi.id} />
          <button
            type="submit"
            className="w-full rounded-control border border-line px-4 py-2 text-small font-medium text-ink-soft transition hover:bg-canvas"
          >
            Ortak QR&apos;ı kapat
          </button>
        </form>
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
        {girisMasasi ? "Ortak QR'ı yeniden aç" : "Tek ortak QR oluştur"}
      </button>
    </form>
  );
}
