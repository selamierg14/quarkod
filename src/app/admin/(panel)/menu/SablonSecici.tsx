"use client";

import { useActionState } from "react";
import { sablonuUygula, type MenuFormState } from "./actions";
import { MENU_SABLONLARI, type SablonRenk } from "@/lib/menu-sablonlari";
import type { BusinessType } from "@/lib/constants";

/**
 * Kart temaları. Tailwind sınıfları derleme anında taranıyor; şablonun
 * renk adından string birleştirerek üretilemez, bu yüzden tam sınıf
 * adlarıyla sabit bir eşleme tutuluyor.
 */
const TEMA: Record<SablonRenk, { kart: string; rozet: string; serit: string; sayac: string }> = {
  amber: {
    kart: "hover:border-amber-300 hover:shadow-amber-100",
    rozet: "bg-amber-100 text-amber-700 ring-amber-200",
    serit: "from-amber-400 to-amber-500",
    sayac: "bg-amber-50 text-amber-700",
  },
  orange: {
    kart: "hover:border-orange-300 hover:shadow-orange-100",
    rozet: "bg-orange-100 text-orange-700 ring-orange-200",
    serit: "from-orange-400 to-orange-500",
    sayac: "bg-orange-50 text-orange-700",
  },
  rose: {
    kart: "hover:border-rose-300 hover:shadow-rose-100",
    rozet: "bg-rose-100 text-rose-700 ring-rose-200",
    serit: "from-rose-400 to-rose-500",
    sayac: "bg-rose-50 text-rose-700",
  },
  red: {
    kart: "hover:border-red-300 hover:shadow-red-100",
    rozet: "bg-red-100 text-red-700 ring-red-200",
    serit: "from-red-400 to-red-500",
    sayac: "bg-red-50 text-red-700",
  },
  emerald: {
    kart: "hover:border-emerald-300 hover:shadow-emerald-100",
    rozet: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    serit: "from-emerald-400 to-emerald-500",
    sayac: "bg-emerald-50 text-emerald-700",
  },
  teal: {
    kart: "hover:border-teal-300 hover:shadow-teal-100",
    rozet: "bg-teal-100 text-teal-700 ring-teal-200",
    serit: "from-teal-400 to-teal-500",
    sayac: "bg-teal-50 text-teal-700",
  },
  sky: {
    kart: "hover:border-sky-300 hover:shadow-sky-100",
    rozet: "bg-sky-100 text-sky-700 ring-sky-200",
    serit: "from-sky-400 to-sky-500",
    sayac: "bg-sky-50 text-sky-700",
  },
  violet: {
    kart: "hover:border-violet-300 hover:shadow-violet-100",
    rozet: "bg-violet-100 text-violet-700 ring-violet-200",
    serit: "from-violet-400 to-violet-500",
    sayac: "bg-violet-50 text-violet-700",
  },
  pink: {
    kart: "hover:border-pink-300 hover:shadow-pink-100",
    rozet: "bg-pink-100 text-pink-700 ring-pink-200",
    serit: "from-pink-400 to-pink-500",
    sayac: "bg-pink-50 text-pink-700",
  },
  indigo: {
    kart: "hover:border-indigo-300 hover:shadow-indigo-100",
    rozet: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    serit: "from-indigo-400 to-indigo-500",
    sayac: "bg-indigo-50 text-indigo-700",
  },
};

/**
 * Boş menüde hazır şablon seçtirir — satış ziyaretinde saniyeler içinde
 * dolu, gerçekçi fiyatlı bir menü göstermek için.
 */
export function SablonSecici({
  businessId,
  businessType,
}: {
  businessId: string;
  businessType: BusinessType;
}) {
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    sablonuUygula,
    {},
  );

  const siralanmis = [...MENU_SABLONLARI].sort((a, b) => {
    const aUygun = a.onerilenTurler.includes(businessType) ? 0 : 1;
    const bUygun = b.onerilenTurler.includes(businessType) ? 0 : 1;
    return aUygun - bUygun;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-control bg-gradient-to-r from-accent-50 to-transparent p-4 ring-1 ring-accent-100">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-accent-600 text-lg text-white shadow-sm"
        >
          ✨
        </span>
        <div>
          <h2 className="font-semibold text-ink">Hazır şablonla başlayın</h2>
          <p className="mt-0.5 text-small text-ink-muted">
            Bir şablon seçin; bölümler, ürünler ve örnek fiyatlar saniyeler
            içinde kurulur. Sonrasında hepsini tek tek düzenleyebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {siralanmis.map((sablon) => {
          const tema = TEMA[sablon.renk];
          const urunSayisi = sablon.kategoriler.reduce((t, k) => t + k.urunler.length, 0);
          const onerilen = sablon.onerilenTurler.includes(businessType);

          return (
            <form key={sablon.id} action={formAction}>
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="sablonId" value={sablon.id} />
              <button
                type="submit"
                disabled={pending}
                className={`group flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-start shadow-card transition hover:-translate-y-0.5 hover:shadow-pop disabled:opacity-60 disabled:hover:translate-y-0 ${tema.kart}`}
              >
                <span className={`h-1.5 w-full bg-gradient-to-r ${tema.serit}`} aria-hidden="true" />

                <span className="flex flex-1 flex-col p-4">
                  <span className="flex items-start justify-between gap-2">
                    <span
                      aria-hidden="true"
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-chip text-xl ring-1 ${tema.rozet}`}
                    >
                      {sablon.ikon}
                    </span>
                    {onerilen ? (
                      <span className="rounded-full bg-accent-50 px-2 py-0.5 text-caption font-medium text-accent-700 ring-1 ring-accent-200">
                        Önerilen
                      </span>
                    ) : null}
                  </span>

                  <span className="mt-3 block font-semibold text-ink">{sablon.ad}</span>
                  <span className="mt-1 block flex-1 text-small leading-relaxed text-ink-muted">
                    {sablon.aciklama}
                  </span>

                  <span className="mt-3 flex items-center gap-2">
                    <span className={`rounded-chip px-2 py-1 text-caption font-medium ${tema.sayac}`}>
                      {sablon.kategoriler.length} bölüm
                    </span>
                    <span className={`rounded-chip px-2 py-1 text-caption font-medium ${tema.sayac}`}>
                      {urunSayisi} ürün
                    </span>
                    <span
                      aria-hidden="true"
                      className="ms-auto text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
                    >
                      →
                    </span>
                  </span>
                </span>
              </button>
            </form>
          );
        })}
      </div>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          {state.saved}
        </p>
      ) : null}
    </div>
  );
}
