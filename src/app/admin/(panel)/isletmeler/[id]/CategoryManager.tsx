"use client";

import { useActionState, useState } from "react";
import { sorunSecenekleri } from "@/lib/isletme/anket-detay";
import {
  addCategory,
  moveCategory,
  toggleCategory,
  updateCategoryProblems,
  type FormState,
} from "../actions";
import { GonderDugmesi, buttonClass } from "@/components/ui";

type Category = {
  id: string;
  name: string;
  active: boolean;
  problemOptions: string | null;
};

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
      {/* Aynı açıklama sayfada iki kez yazıyordu (QA); tek yerde. */}
      <p className="text-small text-ink-muted">
        Anket ekranında bu başlıklar bu sırayla görünür. Kaldırmak yerine{" "}
        <strong>kapatın</strong> — eski kayıtlardaki puanlar korunur. Müşteri bir
        başlığa 1-2 yıldız verirse altındaki seçenekler açılır ve sorunun tam
        yerini işaretleyebilir.
      </p>

      <ul className="divide-y divide-line rounded-chip ring-1 ring-line">
        {categories.map((category, index) => (
          // Kapatılmış kategori aktif olanla aynı görünüyordu; yalnızca düğme
          // yazısı "Aç" oluyordu (QA). Artık soluk ve etiketli.
          <li key={category.id} className={`px-3 py-2 ${category.active ? "" : "bg-sunken/50"}`}>
          <div className="flex items-center gap-2">
            <span
              className={`flex flex-1 items-center gap-2 text-small ${category.active ? "text-ink" : "text-ink-faint"}`}
            >
              {category.name}
              {category.active ? null : (
                <span className="rounded-chip bg-sunken px-1.5 py-0.5 text-caption font-medium text-ink-muted ring-1 ring-line">
                  Kapalı
                </span>
              )}
            </span>

            <form action={moveCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={index === 0}
                aria-label={`${category.name} yukarı taşı`}
                className={buttonClass({ variant: "ghost", size: "sm", className: "w-8 px-0" })}
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
                className={buttonClass({ variant: "ghost", size: "sm", className: "w-8 px-0" })}
              >
                ↓
              </button>
            </form>
            <form action={toggleCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <GonderDugmesi
                className={buttonClass({ variant: "secondary", size: "sm" })}
      >
                {category.active ? "Kapat" : "Aç"}
              </GonderDugmesi>
            </form>
          </div>

            <SorunSecenekleri kategori={category} />
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
          className="flex-1 rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <button
          type="submit"
          disabled={pending}
          className={buttonClass({ size: "md" })}
        >
          Ekle
        </button>
      </form>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Bir kategorinin "hangi alanda sorun yaşadınız?" seçenekleri.
 *
 * Kapalı dururken sadece özet gösteriyoruz: kategori listesi asıl olarak
 * sıralama ve açma-kapama için kullanılıyor, her satırı bir forma çevirmek
 * ekranı okunmaz yapardı.
 */
function SorunSecenekleri({ kategori }: { kategori: Category }) {
  const [acik, setAcik] = useState(false);
  const mevcut = sorunSecenekleri(kategori.name, kategori.problemOptions);
  const varsayilan = !kategori.problemOptions && mevcut.length > 0;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        className="text-caption text-ink-faint hover:text-ink-soft"
      >
        {mevcut.length > 0
          ? `Düşük puan seçenekleri: ${mevcut.join(", ")}`
          : "Düşük puan seçeneği yok — eklemek için tıklayın"}
        {varsayilan ? " (varsayılan)" : ""}
      </button>

      {acik ? (
        <form
          action={updateCategoryProblems}
          onSubmit={() => setAcik(false)}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="categoryId" value={kategori.id} />
          <input
            name="problemOptions"
            defaultValue={kategori.problemOptions ?? mevcut.join(", ")}
            placeholder="Tuvaletler, Masalar, Zemin"
            className="min-w-56 flex-1 rounded-chip border border-line bg-surface px-3 py-1.5 text-caption outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
          />
          <GonderDugmesi
            className={buttonClass({ size: "sm" })}
      >
            Kaydet
          </GonderDugmesi>
          <span className="w-full text-caption text-ink-faint">
            Virgülle ayırın. Boş bırakırsanız varsayılana döner.
          </span>
        </form>
      ) : null}
    </div>
  );
}
