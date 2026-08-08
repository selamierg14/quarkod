"use client";

import { useActionState, useState } from "react";
import { BUSINESS_TYPE_LIST, DEFAULT_CATEGORIES, type BusinessType } from "@/lib/constants";
import { createBusiness, type FormState } from "./actions";

const INPUT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400";

export function NewBusinessForm() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<BusinessType>("yeme_icme");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createBusiness,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-white"
      >
        + Yeni işletme / lokasyon ekle
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl bg-white p-5 ring-1 ring-slate-200"
    >
      <h2 className="font-semibold tracking-tight">Yeni işletme</h2>
      <p className="text-sm text-slate-500">
        Tür seçildiğinde kategori şablonu hazır gelir, masalar için QR&apos;lar
        otomatik üretilir. Sonradan hepsini düzenleyebilirsiniz.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">İşletme adı</span>
          <input name="name" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Tür</span>
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as BusinessType)}
            className={INPUT}
          >
            {BUSINESS_TYPE_LIST.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Adres (isteğe bağlı)</span>
          <input name="address" className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Google yorum linki</span>
          <input
            name="googleReviewUrl"
            type="url"
            placeholder="https://..."
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Masa sayısı</span>
          <input
            name="tableCount"
            type="number"
            min={0}
            max={300}
            defaultValue={10}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Bildirim eşiği (bu puan ve altı)</span>
          <select name="notifyThreshold" defaultValue="3" className={INPUT}>
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value} ve altı
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Marka rengi</span>
          <input
            name="brandColor"
            type="color"
            defaultValue="#111827"
            className="h-9 w-20 rounded-lg border border-slate-200 bg-white p-1"
          />
        </label>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <span className="text-xs text-slate-500">Gelecek kategoriler:</span>
        <p className="mt-1 text-slate-700">{DEFAULT_CATEGORIES[type].join(" · ")}</p>
      </div>

      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs text-slate-500">
          İşletme sorumlusu (isteğe bağlı)
        </legend>
        <p className="mb-3 text-sm text-slate-500">
          Girerseniz bu işletme için bir hesap açılır ve sorumlu yalnızca burayı
          görür. Boş bırakırsanız sonradan Kullanıcılar sayfasından ekleyebilirsiniz.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Ad soyad</span>
            <input name="managerName" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">E-posta</span>
            <input name="managerEmail" type="email" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Başlangıç şifresi</span>
            <input
              name="managerPassword"
              type="text"
              minLength={8}
              placeholder="en az 8 karakter"
              className={INPUT}
            />
          </label>
        </div>
      </fieldset>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-400"
        >
          {pending ? "Oluşturuluyor..." : "Oluştur"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
