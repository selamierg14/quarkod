"use client";

import { useActionState } from "react";
import { sablonuUygula, type MenuFormState } from "./actions";
import { MENU_SABLONLARI } from "@/lib/menu-sablonlari";
import type { BusinessType } from "@/lib/constants";

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
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium text-ink">Hazır şablonla başlayın</h2>
        <p className="mt-0.5 text-small text-ink-muted">
          Bir şablon seçin, kategoriler ve örnek ürünler saniyeler içinde
          kurulur. Fiyatlar örnek — sonradan tek tek düzenleyebilirsiniz.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {siralanmis.map((sablon) => (
          <form key={sablon.id} action={formAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="sablonId" value={sablon.id} />
            <button
              type="submit"
              disabled={pending}
              className="flex h-full w-full flex-col rounded-control bg-surface p-4 text-start ring-1 ring-line transition hover:ring-line-strong disabled:opacity-60"
            >
              <span className="font-medium text-ink">{sablon.ad}</span>
              <span className="mt-1 text-small text-ink-muted">{sablon.aciklama}</span>
              <span className="mt-3 text-caption text-ink-faint">
                {sablon.kategoriler.length} bölüm ·{" "}
                {sablon.kategoriler.reduce((t, k) => t + k.urunler.length, 0)} ürün
              </span>
            </button>
          </form>
        ))}
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
