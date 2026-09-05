"use client";

import { useActionState } from "react";
import { bolgeEkle, bolgeSil, type RezervasyonFormState } from "../actions";

/**
 * Bölge ekleme/silme.
 *
 * Bölge silmek masaları SİLMİYOR, bölgesiz bırakıyor (şemada
 * onDelete: SetNull). Yanlış tıklamanın bedeli bir etiketin kaybı olmalı,
 * kat planının tamamı değil.
 */
export function BolgeYonetimi({
  businessId,
  bolgeler,
}: {
  businessId: string;
  bolgeler: { id: string; ad: string; _count: { masalar: number } }[];
}) {
  const [ekleDurum, ekleEylem, ekleniyor] = useActionState<RezervasyonFormState, FormData>(
    bolgeEkle,
    {},
  );
  const [silDurum, silEylem] = useActionState<RezervasyonFormState, FormData>(bolgeSil, {});

  return (
    <div className="flex flex-col gap-3">
      {ekleDurum.error ?? silDurum.error ? (
        <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {ekleDurum.error ?? silDurum.error}
        </p>
      ) : null}
      {ekleDurum.saved ?? silDurum.saved ? (
        <p className="rounded-control bg-success-soft px-3 py-2 text-small text-success-ink">
          {ekleDurum.saved ?? silDurum.saved}
        </p>
      ) : null}

      {bolgeler.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {bolgeler.map((bolge) => (
            <li
              key={bolge.id}
              className="flex items-center gap-2 rounded-chip border border-line bg-surface px-3 py-1.5 text-small text-ink"
            >
              <span>{bolge.ad}</span>
              <span className="text-ink-faint">({bolge._count.masalar} masa)</span>
              <form action={silEylem}>
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="zoneId" value={bolge.id} />
                <button
                  type="submit"
                  aria-label={`${bolge.ad} bölgesini sil`}
                  className="text-ink-faint hover:text-danger-ink"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-ink-faint">
          Henüz bölge yok. Bölgeler isteğe bağlı — bölgesiz masalar ana salonda sayılır.
        </p>
      )}

      <form action={ekleEylem} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="businessId" value={businessId} />
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Yeni bölge</span>
          <input
            name="ad"
            required
            maxLength={40}
            placeholder="Teras"
            className="rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
          />
        </label>
        <button
          type="submit"
          disabled={ekleniyor}
          className="rounded-control bg-brand px-4 py-2 text-small font-semibold text-brand-ink disabled:opacity-50"
        >
          {ekleniyor ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>
    </div>
  );
}
