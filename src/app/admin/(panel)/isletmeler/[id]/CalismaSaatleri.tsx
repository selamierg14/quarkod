"use client";

import { useState } from "react";
import {
  GUNLER,
  GUN_ADLARI,
  saatleriCoz,
  type Gun,
  type GunSaati,
} from "@/lib/isletme/calisma-saati";

const INPUT =
  "rounded-chip border border-line bg-surface px-2 py-1.5 text-small outline-none " +
  "focus:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "focus-visible:outline-accent-600 disabled:bg-sunken disabled:text-ink-faint";

/**
 * Haftalık çalışma saati editörü.
 *
 * Form sunucuya tek bir gizli alanla gidiyor (`calismaSaatleri`): yedi gün
 * × iki saat = on dört ayrı alanı Server Action'da tek tek toplamak,
 * çözücü/yazıcı çiftini ikinci kez yazmak demekti. Çözüm burada, kaydetme
 * anında değil her değişiklikte metin üretmek — böylece sunucu tarafı
 * `saatleriCoz` ile aynı biçimi okuyor ve tek bir doğrulama yeri kalıyor.
 *
 * "Hafta içine uygula" düğmesi bilinçli: gerçek hayatta yedi gün nadiren
 * farklı, ve on dört alanı elle doldurmak bu formu terk ettiren şey olurdu.
 */
export function CalismaSaatleri({ baslangic }: { baslangic: string | null }) {
  const [saatler, setSaatler] = useState(() => saatleriCoz(baslangic));

  function guncelle(gun: Gun, yeni: GunSaati) {
    setSaatler((o) => ({ ...o, [gun]: yeni }));
  }

  function haftaIcineUygula() {
    const kaynak = saatler.pazartesi;
    if (kaynak.kapali) return;
    setSaatler((o) => ({
      ...o,
      sali: { ...kaynak },
      carsamba: { ...kaynak },
      persembe: { ...kaynak },
      cuma: { ...kaynak },
    }));
  }

  // Sunucuya giden tek değer. Boşsa null gönderiyoruz: "hiç tanımlanmamış"
  // ile "hepsi kapalı" aynı şey değil, ve boş metin ilkini ifade ediyor.
  const seri = GUNLER.filter((g) => !saatler[g].kapali)
    .map((g) => {
      const s = saatler[g] as { acilis: string; kapanis: string };
      return `${g}:${s.acilis}-${s.kapanis}`;
    })
    .join(",");

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="calismaSaatleri" value={seri} />

      <div className="flex flex-col gap-2">
        {GUNLER.map((gun) => {
          const g = saatler[gun];
          return (
            <div
              key={gun}
              className="grid grid-cols-[6.5rem_auto_1fr] items-center gap-2 sm:grid-cols-[7rem_auto_1fr]"
            >
              <span className="text-small text-ink-soft">{GUN_ADLARI[gun]}</span>

              <label className="flex items-center gap-1.5 text-caption text-ink-muted">
                <input
                  type="checkbox"
                  checked={!g.kapali}
                  onChange={(e) =>
                    guncelle(
                      gun,
                      e.target.checked
                        ? { kapali: false, acilis: "09:00", kapanis: "23:00" }
                        : { kapali: true },
                    )
                  }
                  className="h-4 w-4 accent-[var(--color-accent-600)]"
                  aria-label={`${GUN_ADLARI[gun]} açık mı`}
                />
                Açık
              </label>

              {g.kapali ? (
                <span className="text-caption text-ink-faint">Kapalı</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={g.acilis}
                    onChange={(e) => guncelle(gun, { ...g, acilis: e.target.value })}
                    className={INPUT}
                    aria-label={`${GUN_ADLARI[gun]} açılış saati`}
                  />
                  <span aria-hidden="true" className="text-ink-faint">
                    –
                  </span>
                  <input
                    type="time"
                    value={g.kapanis}
                    onChange={(e) => guncelle(gun, { ...g, kapanis: e.target.value })}
                    className={INPUT}
                    aria-label={`${GUN_ADLARI[gun]} kapanış saati`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={haftaIcineUygula}
          disabled={saatler.pazartesi.kapali}
          className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft transition hover:border-line-strong hover:text-ink disabled:opacity-45"
        >
          Pazartesiyi hafta içine uygula
        </button>
        <span className="text-caption text-ink-faint">
          Kapanış açılıştan erkense ertesi güne sarkar (ör. 20:00 – 02:00).
        </span>
      </div>
    </div>
  );
}
