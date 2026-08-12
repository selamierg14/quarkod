"use client";

import { useActionState, useState } from "react";
import { BUSINESS_TYPE_LIST, DEFAULT_CATEGORIES, type BusinessType } from "@/lib/constants";
import { createBusiness, type FormState } from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

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
        className="self-start rounded-control border border-dashed border-line-strong px-4 py-3 text-small text-ink-soft hover:bg-surface"
      >
        + Yeni işletme / lokasyon ekle
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-control bg-surface p-5 ring-1 ring-line"
    >
      <h2 className="font-semibold tracking-tight">Yeni işletme</h2>
      <p className="text-small text-ink-muted">
        Tür seçildiğinde kategori şablonu hazır gelir, masalar için QR&apos;lar
        otomatik üretilir. Sonradan hepsini düzenleyebilirsiniz.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">İşletme adı</span>
          <input name="name" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Tür</span>
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
          <span className="text-caption text-ink-muted">Adres (isteğe bağlı)</span>
          <input name="address" className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Google yorum linki</span>
          <input
            name="googleReviewUrl"
            type="url"
            placeholder="https://..."
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Masa sayısı</span>
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
          <span className="text-caption text-ink-muted">Bildirim eşiği (bu puan ve altı)</span>
          <select name="notifyThreshold" defaultValue="3" className={INPUT}>
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value} ve altı
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Marka rengi</span>
          <input
            name="brandColor"
            type="color"
            defaultValue="#111827"
            className="h-9 w-20 rounded-chip border border-line bg-surface p-1"
          />
        </label>
      </div>

      <div className="rounded-chip bg-canvas p-3 text-small">
        <span className="text-caption text-ink-muted">Gelecek kategoriler:</span>
        <p className="mt-1 text-ink-soft">{DEFAULT_CATEGORIES[type].join(" · ")}</p>
      </div>

      <fieldset className="rounded-chip border border-line p-3">
        <legend className="px-1 text-caption text-ink-muted">
          İşletme sorumlusu (isteğe bağlı)
        </legend>
        <p className="mb-3 text-small text-ink-muted">
          Girerseniz bu işletme için bir hesap açılır ve sorumlu yalnızca burayı
          görür. Boş bırakırsanız sonradan Kullanıcılar sayfasından ekleyebilirsiniz.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Ad soyad</span>
            <input name="managerName" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">E-posta</span>
            <input name="managerEmail" type="email" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Kullanıcı adı</span>
            <input name="managerUsername" autoCapitalize="none" spellCheck={false} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Cep telefonu</span>
            <input name="managerPhone" type="tel" placeholder="05XX XXX XX XX" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Başlangıç şifresi</span>
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
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white disabled:bg-slate-400"
        >
          {pending ? "Oluşturuluyor..." : "Oluştur"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-control border border-line px-4 py-2.5 text-small text-ink-soft"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
