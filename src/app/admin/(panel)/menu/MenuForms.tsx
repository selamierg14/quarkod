"use client";

import { useActionState, useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { MENU_TAGS, formatPrice, parseTags, priceInputValue } from "@/lib/menu";
import {
  addMenuCategory,
  addMenuItem,
  moveMenuCategory,
  moveMenuItem,
  renameMenuCategory,
  toggleMenuCategory,
  toggleMenuItem,
  toggleSoldOut,
  updateMenuItem,
  type MenuFormState,
} from "./actions";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400";
const KUCUK_BUTON =
  "rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-50";

export type UrunGorunumu = {
  id: string;
  name: string;
  description: string | null;
  priceKurus: number | null;
  imageUrl: string | null;
  tags: string | null;
  soldOut: boolean;
  active: boolean;
};

/* ------------------------------------------------------------- kategoriler */

export function NewCategoryForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    addMenuCategory,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="businessId" value={businessId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Yeni bölüm</span>
        <input
          name="name"
          required
          placeholder="Kahveler, Tatlılar, Ana Yemekler…"
          className={`${INPUT} w-56`}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Ekleniyor…" : "Bölüm ekle"}
      </button>
      {state.error ? <p className="pb-2 text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function CategoryHeader({
  id,
  name,
  active,
  urunSayisi,
}: {
  id: string;
  name: string;
  active: boolean;
  urunSayisi: number;
}) {
  const [duzenle, setDuzenle] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
      {duzenle ? (
        <form
          action={renameMenuCategory}
          onSubmit={() => setDuzenle(false)}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="categoryId" value={id} />
          <input name="name" defaultValue={name} autoFocus className={`${INPUT} w-48`} />
          <button type="submit" className={KUCUK_BUTON}>
            Kaydet
          </button>
          <button type="button" onClick={() => setDuzenle(false)} className={KUCUK_BUTON}>
            Vazgeç
          </button>
        </form>
      ) : (
        <span className="flex items-center gap-2">
          <span className={`font-medium ${active ? "" : "text-slate-400 line-through"}`}>
            {name}
          </span>
          <span className="text-xs text-slate-400">{urunSayisi} ürün</span>
          {!active ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              menüde görünmüyor
            </span>
          ) : null}
        </span>
      )}

      <div className="flex items-center gap-1">
        {!duzenle ? (
          <button type="button" onClick={() => setDuzenle(true)} className={KUCUK_BUTON}>
            Adı değiştir
          </button>
        ) : null}
        <form action={moveMenuCategory}>
          <input type="hidden" name="categoryId" value={id} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" aria-label={`${name} bölümünü yukarı taşı`} className={KUCUK_BUTON}>
            ↑
          </button>
        </form>
        <form action={moveMenuCategory}>
          <input type="hidden" name="categoryId" value={id} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" aria-label={`${name} bölümünü aşağı taşı`} className={KUCUK_BUTON}>
            ↓
          </button>
        </form>
        <form action={toggleMenuCategory}>
          <input type="hidden" name="categoryId" value={id} />
          <button type="submit" className={KUCUK_BUTON}>
            {active ? "Gizle" : "Göster"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ ürünler */

function EtiketSecimi({ secili }: { secili: string[] }) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="mb-1 text-xs text-slate-500">Etiketler</legend>
      {Object.entries(MENU_TAGS).map(([deger, etiket]) => (
        <label
          key={deger}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs has-checked:border-slate-900 has-checked:bg-slate-900 has-checked:text-white"
        >
          <input
            type="checkbox"
            name="tags"
            value={deger}
            defaultChecked={secili.includes(deger)}
            className="sr-only"
          />
          {etiket}
        </label>
      ))}
    </fieldset>
  );
}

/** Ürün ekleme ve düzenleme aynı alanları kullanıyor. */
function UrunAlanlari({
  urun,
  brandColor,
}: {
  urun?: UrunGorunumu;
  brandColor: string;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Ürün adı</span>
          <input name="name" required defaultValue={urun?.name} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Fiyat (₺)</span>
          <input
            name="price"
            inputMode="decimal"
            placeholder="149,90"
            defaultValue={priceInputValue(urun?.priceKurus)}
            className={INPUT}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Açıklama (isteğe bağlı)</span>
        <input
          name="description"
          defaultValue={urun?.description ?? ""}
          placeholder="İçindekiler, porsiyon, kısa tanıtım"
          className={INPUT}
        />
      </label>

      <ImageUpload
        name="imageUrl"
        kind="menu"
        label="Ürün fotoğrafı"
        hint="Kare kırpılır, ~800px'e küçültülür. Fotoğraflı ürünler belirgin şekilde daha çok sipariş alır."
        initial={urun?.imageUrl ?? null}
        brandColor={brandColor}
      />

      <EtiketSecimi secili={parseTags(urun?.tags)} />
    </>
  );
}

export function NewItemForm({
  categoryId,
  brandColor,
}: {
  categoryId: string;
  brandColor: string;
}) {
  const [acik, setAcik] = useState(false);
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    addMenuItem,
    {},
  );

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="m-3 self-start rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        + Ürün ekle
      </button>
    );
  }

  return (
    <form action={formAction} className="m-3 flex flex-col gap-3 rounded-lg bg-slate-50 p-4">
      <input type="hidden" name="categoryId" value={categoryId} />
      <UrunAlanlari brandColor={brandColor} />

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.saved ? <p className="text-sm text-emerald-700">{state.saved}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
        >
          {pending ? "Ekleniyor…" : "Ürünü ekle"}
        </button>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
        >
          Kapat
        </button>
      </div>
    </form>
  );
}

export function ItemRow({
  urun,
  brandColor,
}: {
  urun: UrunGorunumu;
  brandColor: string;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    updateMenuItem,
    {},
  );
  const etiketler = parseTags(urun.tags);

  if (duzenle) {
    return (
      <li className="p-3">
        <form action={formAction} className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4">
          <input type="hidden" name="itemId" value={urun.id} />
          <UrunAlanlari urun={urun} brandColor={brandColor} />

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
            >
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setDuzenle(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
            >
              Vazgeç
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      {urun.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urun.imageUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`font-medium ${urun.active ? "" : "text-slate-400 line-through"}`}>
            {urun.name}
          </span>
          {urun.priceKurus !== null ? (
            <span className="text-sm text-slate-500">{formatPrice(urun.priceKurus)}</span>
          ) : null}
          {urun.soldOut ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
              tükendi
            </span>
          ) : null}
          {!urun.active ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              menüde yok
            </span>
          ) : null}
        </span>

        {urun.description ? (
          <p className="mt-0.5 truncate text-xs text-slate-400">{urun.description}</p>
        ) : null}

        {etiketler.length > 0 ? (
          <p className="mt-1 flex flex-wrap gap-1">
            {etiketler.map((t) => (
              <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                {MENU_TAGS[t]}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        {/* Tükendi, mutfaktan gelen bilgiyle anında işaretlenmeli: tek tık. */}
        <form action={toggleSoldOut}>
          <input type="hidden" name="itemId" value={urun.id} />
          <button
            type="submit"
            className={`rounded px-2 py-0.5 text-xs ${
              urun.soldOut
                ? "bg-amber-100 text-amber-800"
                : "border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {urun.soldOut ? "Stoğa al" : "Tükendi"}
          </button>
        </form>
        <button type="button" onClick={() => setDuzenle(true)} className={KUCUK_BUTON}>
          Düzenle
        </button>
        <form action={moveMenuItem}>
          <input type="hidden" name="itemId" value={urun.id} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" aria-label={`${urun.name} yukarı`} className={KUCUK_BUTON}>
            ↑
          </button>
        </form>
        <form action={moveMenuItem}>
          <input type="hidden" name="itemId" value={urun.id} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" aria-label={`${urun.name} aşağı`} className={KUCUK_BUTON}>
            ↓
          </button>
        </form>
        <form action={toggleMenuItem}>
          <input type="hidden" name="itemId" value={urun.id} />
          <button type="submit" className={KUCUK_BUTON}>
            {urun.active ? "Kaldır" : "Geri koy"}
          </button>
        </form>
      </div>
    </li>
  );
}
