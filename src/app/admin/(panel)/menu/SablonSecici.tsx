"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { sablonuUygula, type MenuFormState } from "./actions";
import { MENU_SABLONLARI } from "@/lib/isletme/menu-sablonlari";
import type { BusinessType } from "@/lib/cekirdek/constants";
import {
  CakeSlice,
  Coffee,
  EggFried,
  Fish,
  Flame,
  Hamburger,
  Martini,
  Pizza,
  Sandwich,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { buttonClass, useToast } from "@/components/ui";

/**
 * Şablon ikonları — panelin çizgi ikon setinden. Önceden emojiydi (☕ 🍕 🍔):
 * panel her yerde çizgi ikon kullanırken burası farklı bir dil
 * konuşuyordu (UI incelemesi). Tanımadığımız yeni bir şablon tabak alır.
 */
const SABLON_IKONU: Record<string, LucideIcon> = {
  "kahve-dukkani": Coffee,
  "kahvalti-kafe": EggFried,
  "restoran-lokanta": UtensilsCrossed,
  "kebapci-ocakbasi": Flame,
  pizzaci: Pizza,
  "burger-fast-food": Hamburger,
  "donerci-bufe": Sandwich,
  "balik-restorani": Fish,
  "bar-gece-kulubu": Martini,
  "pastane-tatlici": CakeSlice,
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
    <div className="flex flex-col gap-4" role="status">
      {state.saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-success-soft p-4 ring-1 ring-success/25">
          <p className="flex items-center gap-2 text-small font-medium text-success-ink">
            <span aria-hidden="true">✓</span>
            {state.saved}
          </p>
          <Link href="/admin/menu" className={buttonClass({ size: "sm", className: "shrink-0" })}>
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
            Menünüzde zaten <strong>{mevcutBolumSayisi} bölüm</strong> var. Bir
            şablonu <strong>mevcut menüye ekleyebilirsiniz</strong>: aynı adlı
            bölümler birleşir, menünüzde olan ürünler tekrar eklenmez. Menüyü
            tamamen değiştirmek isterseniz önce <strong>Menümü düzenle</strong>{" "}
            sayfasının sonundaki &quot;Tüm menüyü sil&quot; ile temizleyin.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {siralanmis.map((sablon) => {
          const urunSayisi = sablon.kategoriler.reduce((t, k) => t + k.urunler.length, 0);
          const onerilen = sablon.onerilenTurler.includes(businessType);
          const acik = acikId === sablon.id;

          return (
            <div
              key={sablon.id}
              className={`flex h-full flex-col overflow-hidden rounded-card border bg-surface shadow-card transition ${
                acik
                  ? "border-accent-300 shadow-pop ring-2 ring-accent-200"
                  : `border-line hover:-translate-y-0.5 hover:shadow-raised`
              }`}
            >
              <button
                type="button"
                onClick={() => setAcikId(acik ? null : sablon.id)}
                aria-expanded={acik}
                className="flex flex-1 cursor-pointer flex-col p-4 text-start"
              >
                <span className="flex items-start justify-between gap-2">
                  {(() => {
                    const Ikon = SABLON_IKONU[sablon.id] ?? UtensilsCrossed;
                    return (
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-100"
                      >
                        <Ikon className="h-5 w-5" />
                      </span>
                    );
                  })()}
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
                  <span className={`rounded-chip px-2 py-1 text-caption font-semibold bg-sunken text-ink-soft`}>
                    {sablon.kategoriler.length} bölüm
                  </span>
                  <span className={`rounded-chip px-2 py-1 text-caption font-semibold bg-sunken text-ink-soft`}>
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
                    {doluMu ? <input type="hidden" name="mod" value="ekle" /> : null}
                    <button
                      type="submit"
                      disabled={pending}
                      className={buttonClass({ size: "md", block: true })}
                    >
                      {pending
                        ? "Ekleniyor…"
                        : doluMu
                          ? "Mevcut menüme ekle"
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
        <p className="rounded-control bg-danger-soft px-4 py-3 text-small font-medium text-danger-ink ring-1 ring-danger/20" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
