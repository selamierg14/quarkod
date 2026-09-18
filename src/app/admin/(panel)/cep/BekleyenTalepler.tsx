"use client";

import { useActionState } from "react";
import { Phone } from "lucide-react";
import {
  rezervasyonDurumDegistir,
  type RezervasyonFormState,
} from "../rezervasyon/actions";

export type BekleyenTalep = {
  id: string;
  misafirAdi: string;
  telefon: string | null;
  kisiSayisi: number;
  not: string | null;
  baslangic: string;
  masaAdi: string | null;
};

/**
 * Uygulamadan gelen rezervasyon taleplerine TEK DOKUNUŞLA cevap.
 *
 * Rezervasyon ekranındaki açılır liste + "Uygula" ikilisi masaüstünde
 * doğru: orada altı durum arasından seçim yapılıyor. Telefonda ise
 * gerçekte iki cevap var — onayla ya da reddet — ve üç dokunuşluk bir
 * seçim, onay vermeyi erteletiyor. Bekleyen talep ise misafirin
 * belirsizlikte kalması demek.
 *
 * Aynı Server Action kullanılıyor (rezervasyonDurumDegistir): yetki,
 * sahiplik ve denetim kaydı zaten orada ve ikinci bir kopya er geç
 * ayrışırdı.
 */
export function BekleyenTalepler({
  businessId,
  talepler,
}: {
  businessId: string;
  talepler: BekleyenTalep[];
}) {
  if (talepler.length === 0) {
    return <p className="text-small text-ink-faint">Bekleyen talep yok.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {talepler.map((talep) => (
        <li key={talep.id}>
          <Satir businessId={businessId} talep={talep} />
        </li>
      ))}
    </ul>
  );
}

function Satir({ businessId, talep }: { businessId: string; talep: BekleyenTalep }) {
  const [durum, eylem, bekliyor] = useActionState<RezervasyonFormState, FormData>(
    rezervasyonDurumDegistir,
    {},
  );

  const bas = new Date(talep.baslangic);

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-ink">{talep.misafirAdi}</span>
        <span className="text-small text-ink-soft">
          {bas.toLocaleString("tr-TR", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {talep.kisiSayisi} kişi{talep.masaAdi ? ` · ${talep.masaAdi}` : ""}
        </span>
      </div>

      {talep.not ? <p className="text-caption text-ink-faint">Not: {talep.not}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {/* Her düğme kendi formunda: tek formda iki submit düğmesi,
            klavyeyle gönderimde hangisinin çalıştığını belirsiz bırakır. */}
        <form action={eylem}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="rezervasyonId" value={talep.id} />
          <input type="hidden" name="durum" value="onaylandi" />
          <button
            type="submit"
            disabled={bekliyor}
            className="min-h-11 rounded-control bg-accent-600 px-4 text-small font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {bekliyor ? "…" : "Onayla"}
          </button>
        </form>

        <form action={eylem}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="rezervasyonId" value={talep.id} />
          <input type="hidden" name="durum" value="iptal" />
          <button
            type="submit"
            disabled={bekliyor}
            className="min-h-11 rounded-control border border-line px-4 text-small text-ink hover:bg-sunken disabled:opacity-50"
          >
            Reddet
          </button>
        </form>

        {talep.telefon ? (
          <a
            href={`tel:${talep.telefon}`}
            className="flex min-h-11 items-center gap-1.5 rounded-control border border-line px-3 text-small text-ink hover:bg-sunken"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Ara
          </a>
        ) : null}
      </div>

      {durum.error ? (
        <p className="text-caption text-danger-ink" role="alert">
          {durum.error}
        </p>
      ) : null}
      {durum.saved ? (
        <p className="text-caption text-success-ink" role="status">
          {durum.saved}
        </p>
      ) : null}
    </div>
  );
}
