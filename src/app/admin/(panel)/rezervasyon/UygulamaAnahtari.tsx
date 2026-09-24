"use client";

import { useActionState } from "react";
import { Smartphone } from "lucide-react";
import { uygulamaRezervasyonuAyarla, type RezervasyonFormState } from "./actions";

/**
 * "Biyerlere uygulamasından rezervasyon al" anahtarı.
 *
 * Ayrı bir düğme yerine tek tıkla çalışan bir form: ayar ekranına gidip
 * kaydetmeyi gerektiren bir anahtar, servis sırasında (ör. salon dolunca
 * "bugünlük kapat") kullanılmaz.
 */
export function UygulamaAnahtari({
  businessId,
  acik,
  bekleyenSayisi,
}: {
  businessId: string;
  acik: boolean;
  bekleyenSayisi: number;
}) {
  const [durum, eylem, gonderiliyor] = useActionState<RezervasyonFormState, FormData>(
    uygulamaRezervasyonuAyarla,
    {},
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Smartphone className="mt-0.5 h-4 w-4 text-ink-faint" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-semibold text-ink">
              {acik ? "Uygulamadan rezervasyon açık" : "Uygulamadan rezervasyon kapalı"}
            </span>
            <span className="text-small text-ink-soft">
              {acik
                ? "Talepler onayınızı bekleyerek listeye düşer; masayı sistem seçer, dilediğiniz masaya taşıyabilirsiniz."
                : "Açtığınızda Biyerlere kullanıcıları buradan masa ayırtabilir. Önce masa kapasitelerini ve çalışma saatlerini girin."}
            </span>
          </div>
        </div>

        <form action={eylem}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="acik" value={acik ? "0" : "1"} />
          <button
            type="submit"
            disabled={gonderiliyor}
            className="rounded-control border border-line px-4 py-2 text-small font-semibold text-ink hover:bg-sunken disabled:opacity-50"
          >
            {gonderiliyor ? "…" : acik ? "Kapat" : "Aç"}
          </button>
        </form>
      </div>

      {acik && bekleyenSayisi > 0 ? (
        <p className="rounded-control bg-warning-soft px-3 py-2 text-small text-warning-ink">
          {bekleyenSayisi} talep onayınızı bekliyor. Listede durumu
          &nbsp;&quot;Onaylandı&quot; yapmadığınız sürece misafir belirsizlikte kalır.
        </p>
      ) : null}

      {durum.error ? (
        <p className="text-small text-danger-ink" role="alert">
          {durum.error}
        </p>
      ) : null}
      {durum.saved ? (
        <p className="text-small text-success-ink" role="status">
          {durum.saved}
        </p>
      ) : null}
    </div>
  );
}
