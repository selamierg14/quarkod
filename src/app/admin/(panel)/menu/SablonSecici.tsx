"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { sablonuUygula, type MenuFormState } from "./actions";
import { MENU_SABLONLARI, type SablonRenk } from "@/lib/menu-sablonlari";
import type { BusinessType } from "@/lib/constants";
import { useToast } from "@/components/ui";

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
  mevcutBolumSayisi = 0,
}: {
  businessId: string;
  businessType: BusinessType;
  /** Menü zaten doluysa şablon uygulanamaz; kullanıcıya sebebini söylüyoruz. */
  mevcutBolumSayisi?: number;
}) {
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    sablonuUygula,
    {},
  );
  // Karta tıklamak şablonu uygulamıyor: önce içeriği açılıyor, uygulama
  // ayrı ve açık bir düğmeyle oluyor. Tek tıkla 45 ürün eklenmesi geri
  // alınamaz bir işlemdi ve kimse ne geleceğini görmeden basıyordu.
  const [acikId, setAcikId] = useState<string | null>(null);
  const doluMu = mevcutBolumSayisi > 0;

  /**
   * Şablon uygulanınca hiçbir geri bildirim yoktu: kart ızgarasının altında,
   * kaydırmadan görünmeyen küçük bir yazı vardı. Kullanıcı tıkladı, sayfa
   * aynı kaldı, "oldu mu olmadı mı" bilmeden çıkıp gidiyordu. Şimdi hem
   * ekranın tepesine sabit bir başarı kartı hem menüyü düzenlemeye giden
   * bir düğme var; ayrıca kısa bir bildirim (toast) de çıkıyor.
   */
  const { bildir } = useToast();
  useEffect(() => {
    if (state.saved) bildir(state.saved);
  }, [state.saved, bildir]);

  const siralanmis = [...MENU_SABLONLARI].sort((a, b) => {
    const aUygun = a.onerilenTurler.includes(businessType) ? 0 : 1;
    const bUygun = b.onerilenTurler.includes(businessType) ? 0 : 1;
    return aUygun - bUygun;
  });

  return (
    <div className="flex flex-col gap-4">
      {state.saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-success-soft p-4 ring-1 ring-success/25">
          <p className="flex items-center gap-2 text-small font-medium text-success-ink">
            <span aria-hidden="true">✓</span>
            {state.saved}
          </p>
          <Link
            href="/admin/menu"
            className="shrink-0 rounded-control bg-success px-4 py-2 text-small font-semibold text-white transition hover:opacity-90"
          >
            Menümü düzenle →
          </Link>
        </div>
      ) : null}

      {doluMu ? (
        <div className="flex items-start gap-3 rounded-control bg-warning-soft p-4 ring-1 ring-warning/25">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning text-white"
          >
            !
          </span>
          <p className="text-small text-warning-ink">
            Menünüzde zaten <strong>{mevcutBolumSayisi} bölüm</strong> var.
            Şablon yalnızca boş menüye uygulanabilir — aynı bölümler iki kez
            oluşmasın diye. Şablona geçmek istiyorsanız önce{" "}
            <strong>Menümü düzenle</strong> sekmesindeki &quot;Tüm menüyü
            sil&quot; ile temizleyin.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {siralanmis.map((sablon) => {
          const tema = TEMA[sablon.renk];
          const urunSayisi = sablon.kategoriler.reduce((t, k) => t + k.urunler.length, 0);
          const onerilen = sablon.onerilenTurler.includes(businessType);
          const acik = acikId === sablon.id;

          return (
            <div
              key={sablon.id}
              className={`flex h-full flex-col overflow-hidden rounded-card border bg-surface shadow-card transition ${
                acik
                  ? "border-accent-300 shadow-pop ring-2 ring-accent-200"
                  : `border-line hover:-translate-y-0.5 hover:shadow-raised ${tema.kart}`
              }`}
            >
              <span className={`h-1.5 w-full bg-gradient-to-r ${tema.serit}`} aria-hidden="true" />

              <button
                type="button"
                onClick={() => setAcikId(acik ? null : sablon.id)}
                aria-expanded={acik}
                className="flex flex-1 cursor-pointer flex-col p-4 text-start"
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-chip text-xl ring-1 ${tema.rozet}`}
                  >
                    {sablon.ikon}
                  </span>
                  {onerilen ? (
                    <span className="rounded-full bg-accent-50 px-2 py-0.5 text-caption font-semibold text-accent-700 ring-1 ring-accent-200">
                      Size uygun
                    </span>
                  ) : null}
                </span>

                <span className="mt-3 block font-semibold text-ink">{sablon.ad}</span>
                <span className="mt-1 block flex-1 text-small leading-relaxed text-ink-muted">
                  {sablon.aciklama}
                </span>

                <span className="mt-3 flex items-center gap-2">
                  <span className={`rounded-chip px-2 py-1 text-caption font-semibold ${tema.sayac}`}>
                    {sablon.kategoriler.length} bölüm
                  </span>
                  <span className={`rounded-chip px-2 py-1 text-caption font-semibold ${tema.sayac}`}>
                    {urunSayisi} ürün
                  </span>
                  <span className="ms-auto text-caption font-medium text-accent-700">
                    {acik ? "Gizle ▴" : "İçindekiler ▾"}
                  </span>
                </span>
              </button>

              {acik ? (
                <div className="border-t border-line bg-canvas/60 px-4 py-3">
                  <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                    {sablon.kategoriler.map((k) => (
                      <li key={k.ad}>
                        <p className="text-caption font-semibold text-ink-soft">
                          {k.ad}{" "}
                          <span className="font-normal text-ink-faint">
                            ({k.urunler.length})
                          </span>
                        </p>
                        <p className="text-caption leading-relaxed text-ink-muted">
                          {k.urunler
                            .slice(0, 5)
                            .map((u) => u.ad)
                            .join(", ")}
                          {k.urunler.length > 5 ? ` +${k.urunler.length - 5} ürün` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <form action={formAction} className="mt-3">
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="sablonId" value={sablon.id} />
                    <button
                      type="submit"
                      disabled={pending || doluMu}
                      className="w-full rounded-control bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2.5 text-small font-semibold text-white shadow-card transition hover:brightness-110 disabled:from-slate-300 disabled:to-slate-300"
                    >
                      {pending
                        ? "Kuruluyor…"
                        : doluMu
                          ? "Önce mevcut menüyü silin"
                          : `Bu menüyü kullan (${urunSayisi} ürün)`}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {state.error ? (
        <p className="rounded-control bg-danger-soft px-4 py-3 text-small font-medium text-danger-ink ring-1 ring-danger/20">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
