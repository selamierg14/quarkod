"use client";

import { useActionState } from "react";
import { addCategory, moveCategory, toggleCategory, type FormState } from "../actions";

type Category = { id: string; name: string; active: boolean };

export function CategoryManager({
  businessId,
  categories,
}: {
  businessId: string;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addCategory,
    {},
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-ink-muted">
        Anket ekranında bu başlıklar bu sırayla görünür. Kaldırmak yerine
        &quot;kapat&quot; deyin — eski kayıtlardaki puanlar korunur.
      </p>

      <ul className="divide-y divide-line rounded-chip ring-1 ring-line">
        {categories.map((category, index) => (
          <li
            key={category.id}
            className="flex items-center gap-2 px-3 py-2"
          >
            <span
              className={`flex-1 text-small ${category.active ? "" : "text-ink-faint line-through"}`}
            >
              {category.name}
            </span>

            <form action={moveCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={index === 0}
                aria-label={`${category.name} yukarı taşı`}
                className="rounded px-2 py-1 text-ink-faint hover:bg-sunken disabled:opacity-30"
              >
                ↑
              </button>
            </form>
            <form action={moveCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={index === categories.length - 1}
                aria-label={`${category.name} aşağı taşı`}
                className="rounded px-2 py-1 text-ink-faint hover:bg-sunken disabled:opacity-30"
              >
                ↓
              </button>
            </form>
            <form action={toggleCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <button
                type="submit"
                className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
              >
                {category.active ? "Kapat" : "Aç"}
              </button>
            </form>
          </li>
        ))}
        {categories.length === 0 ? (
          <li className="px-3 py-4 text-small text-ink-faint">
            Henüz kategori yok — anket sadece genel yıldız sorar.
          </li>
        ) : null}
      </ul>

      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="businessId" value={businessId} />
        <input
          name="name"
          required
          placeholder="Yeni kategori (örn. Otopark)"
          className="flex-1 rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-chip bg-ink px-4 py-2 text-small font-medium text-white disabled:bg-slate-400"
        >
          Ekle
        </button>
      </form>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
