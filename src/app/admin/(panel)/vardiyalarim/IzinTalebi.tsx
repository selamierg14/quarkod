"use client";

import { useActionState, useState } from "react";
import { CalendarOff } from "lucide-react";
import { SectionCard, buttonClass } from "@/components/ui";
import { IZIN_TURLERI } from "@/lib/isletme/izin";
import { gunGirdisi } from "@/lib/cekirdek/gun";
import {
  izinTalepEt,
  type IzinFormState,
} from "../vardiya-planlama/izinler/actions";
import { alanOzellikleri } from "@/lib/cekirdek/desenler";

const INPUT =
  "w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

/**
 * Personelin kendi izin talebi.
 *
 * Vardiya değişim talebiyle aynı akış: talep "bekliyor" doğar, yönetici
 * onaylayana kadar çizelgeye yansımaz. Böylece "izinli olduğu ne belli"
 * sorusunun cevabı hep bir kayıt oluyor — kim istedi, kim onayladı.
 */
export function IzinTalebi({
  gecmisTalepler,
}: {
  gecmisTalepler: {
    id: string;
    baslangic: string;
    bitis: string;
    tur: string;
    status: string;
  }[];
}) {
  const [acik, setAcik] = useState(false);
  const [state, formAction, pending] = useActionState<IzinFormState, FormData>(
    izinTalepEt,
    {},
  );

  // Yerel gün: toISOString() UTC verdiği için akşam saatlerinde
  // "bugün" seçilemez hale geliyordu.
  const bugun = gunGirdisi(new Date());

  return (
    <SectionCard
      ikon={<CalendarOff className="h-4 w-4" aria-hidden="true" />}
      renk="rose"
      title="İzin taleplerim"
      description="Talebiniz yöneticinize gider; onaylanınca çizelgede o günler izinli görünür."
      action={
        !acik ? (
          <button
            type="button"
            onClick={() => setAcik(true)}
            className={buttonClass({ size: "sm" })}
          >
            İzin talep et
          </button>
        ) : null
      }
    >
      {acik ? (
        <form action={formAction} className="mb-4 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Başlangıç</span>
              <input name="baslangic" type="date" required min={bugun} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Bitiş</span>
              <input name="bitis" type="date" required min={bugun} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Tür</span>
              <select name="tur" defaultValue="yillik" className={INPUT}>
                {Object.entries(IZIN_TURLERI).map(([deger, etiket]) => (
                  <option key={deger} value={deger}>
                    {etiket}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Sebep (isteğe bağlı)</span>
              <input
                name="aciklama"
                {...alanOzellikleri("aciklama", { zorunlu: false })}
                placeholder="Düğün, sağlık, okul…"
                className={INPUT}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className={buttonClass({ size: "md" })}
            >
              {pending ? "Gönderiliyor…" : "Talebi gönder"}
            </button>
            <button
              type="button"
              onClick={() => setAcik(false)}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              Vazgeç
            </button>
          </div>

          {state.error ? (
            <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.saved ? (
            <p className="rounded-control bg-success-soft px-3 py-2 text-small text-success-ink">
              ✓ {state.saved}
            </p>
          ) : null}
        </form>
      ) : null}

      {gecmisTalepler.length === 0 ? (
        <p className="text-small text-ink-muted">Henüz bir izin talebiniz yok.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {gecmisTalepler.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-chip bg-canvas px-3 py-2 text-small"
            >
              <span>
                {t.baslangic === t.bitis ? t.baslangic : `${t.baslangic} – ${t.bitis}`}
                <span className="ml-2 text-caption text-ink-muted">{t.tur}</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-caption font-medium ${
                  t.status === "onaylandi"
                    ? "bg-success-soft text-success-ink"
                    : t.status === "bekliyor"
                      ? "bg-warning-soft text-warning-ink"
                      : "bg-sunken text-ink-faint"
                }`}
              >
                {t.status === "onaylandi"
                  ? "Onaylandı"
                  : t.status === "bekliyor"
                    ? "Bekliyor"
                    : "Reddedildi"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
