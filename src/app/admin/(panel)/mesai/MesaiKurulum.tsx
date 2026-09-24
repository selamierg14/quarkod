"use client";

import { useActionState } from "react";
import { Wifi, QrCode } from "lucide-react";
import {
  bulunduguAgiEkle,
  ipleriKaydet,
  qrOlustur,
  type MesaiFormState,
} from "./actions";

/**
 * Kurulum kutusu: QR + izinli ağlar.
 *
 * "Bu ağdan kaydet" düğmesi işin can alıcı noktası: kafe sahibine
 * "genel IP'niz nedir" diye sormak, çoğu durumda cevapsız kalan bir
 * soru. Yönetici mekanın Wi-Fi'ındayken tıklıyor, sistem kendi
 * görüşünü kaydediyor. Dinamik IP değiştiğinde de tek dokunuş.
 */
export function MesaiKurulum({
  businessId,
  qrAdresi,
  ipler,
  ipTespitCalisiyor,
}: {
  businessId: string;
  qrAdresi: string | null;
  ipler: string[];
  /** Sunucu gerçek istemci IP'sini görebiliyor mu (bkz. istemci-ip.ts). */
  ipTespitCalisiyor: boolean;
}) {
  const [qrDurum, qrEylem, qrBekliyor] = useActionState<MesaiFormState, FormData>(
    qrOlustur,
    {},
  );
  const [agDurum, agEylem, agBekliyor] = useActionState<MesaiFormState, FormData>(
    bulunduguAgiEkle,
    {},
  );
  const [ipDurum, ipEylem, ipBekliyor] = useActionState<MesaiFormState, FormData>(
    ipleriKaydet,
    {},
  );

  return (
    <div className="flex flex-col gap-4">
      {!ipTespitCalisiyor ? (
        <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-ink">
          Sunucu isteğin gerçek kaynağını göremiyor, bu yüzden mesai takibi
          çalışmaz. Vercel dışında barındırıyorsanız{" "}
          <code>GUVENILIR_IP_BASLIGI</code> tanımlanmalı.
        </p>
      ) : null}

      {/* --- QR --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-canvas px-3 py-2.5">
        <div className="flex items-start gap-2">
          <QrCode className="mt-0.5 h-4 w-4 text-ink-faint" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-small font-medium text-ink">Mesai karekodu</p>
            {qrAdresi ? (
              <p className="mt-0.5 truncate text-caption text-ink-faint">{qrAdresi}</p>
            ) : (
              <p className="mt-0.5 text-caption text-ink-faint">
                Henüz üretilmedi — personel okutamaz.
              </p>
            )}
          </div>
        </div>

        <form action={qrEylem}>
          <input type="hidden" name="businessId" value={businessId} />
          <button
            type="submit"
            disabled={qrBekliyor}
            className="rounded-control border border-line px-3 py-2 text-small font-medium text-ink hover:bg-sunken disabled:opacity-50"
          >
            {qrBekliyor ? "…" : qrAdresi ? "Yenile" : "Karekod üret"}
          </button>
        </form>
      </div>
      {qrDurum.error ? (
        <p className="text-caption text-danger-ink" role="alert">{qrDurum.error}</p>
      ) : null}
      {qrDurum.saved ? (
        <p className="text-caption text-success-ink" role="status">{qrDurum.saved}</p>
      ) : null}

      {/* --- İzinli ağlar --- */}
      <div className="flex flex-col gap-2 rounded-control bg-canvas px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-small font-medium text-ink">
            <Wifi className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            İzinli ağlar ({ipler.length})
          </span>
          <form action={agEylem}>
            <input type="hidden" name="businessId" value={businessId} />
            <button
              type="submit"
              disabled={agBekliyor}
              className="rounded-control bg-accent-600 px-3 py-2 text-small font-medium text-white hover:bg-accent-700 disabled:opacity-50"
            >
              {agBekliyor ? "…" : "Bu ağdan kaydet"}
            </button>
          </form>
        </div>

        <p className="text-caption text-ink-faint">
          Bu düğmeye <strong>mekanın Wi-Fi&apos;ına bağlıyken</strong> basın.
          Personel yalnızca burada yazan ağlardan giriş/çıkış yapabilir; mobil
          veriyle bağlananlar kayıt açamaz.
        </p>

        <form action={ipEylem} className="flex flex-col gap-2">
          <input type="hidden" name="businessId" value={businessId} />
          <input
            name="ipler"
            defaultValue={ipler.join(", ")}
            placeholder="85.105.10.42, 85.105.11."
            className="rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
          />
          <p className="text-caption text-ink-faint">
            Nokta ile biten değer bloğun tamamını kabul eder
            (<code>85.105.11.</code> → 85.105.11.x). IP&apos;si sık değişen
            hatlarda bunu kullanın.
          </p>
          <button
            type="submit"
            disabled={ipBekliyor}
            className="self-start rounded-control border border-line px-3 py-1.5 text-small text-ink hover:bg-sunken disabled:opacity-50"
          >
            {ipBekliyor ? "…" : "Listeyi kaydet"}
          </button>
        </form>

        {agDurum.error ? (
          <p className="text-caption text-danger-ink" role="alert">{agDurum.error}</p>
        ) : null}
        {agDurum.saved ? (
          <p className="text-caption text-success-ink" role="status">{agDurum.saved}</p>
        ) : null}
        {ipDurum.error ? (
          <p className="text-caption text-danger-ink" role="alert">{ipDurum.error}</p>
        ) : null}
        {ipDurum.saved ? (
          <p className="text-caption text-success-ink" role="status">{ipDurum.saved}</p>
        ) : null}
      </div>
    </div>
  );
}
