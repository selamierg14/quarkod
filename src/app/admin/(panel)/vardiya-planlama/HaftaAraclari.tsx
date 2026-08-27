"use client";

import { useActionState } from "react";
import { CopyPlus, TriangleAlert } from "lucide-react";
import { gecenHaftayiKopyala, type HaftaKopyaState } from "./actions";
import type { VardiyaUyarisi } from "@/lib/vardiya-uyari";

/**
 * Hafta üstü araç şeridi: geçen haftayı kopyalama ve çizelge uyarıları.
 *
 * İkisi de çizelgenin hemen üstünde duruyor çünkü ikisi de "tabloya
 * bakmadan önce bilmen gerekenler": biri ızgarayı doldurmanın kısayolu,
 * diğeri doldurduktan sonra gözden kaçanı söylüyor.
 */
export function HaftaAraclari({
  businessId,
  baslangic,
  uyarilar,
}: {
  businessId: string;
  baslangic: string;
  uyarilar: VardiyaUyarisi[];
}) {
  const [state, formAction, pending] = useActionState<HaftaKopyaState, FormData>(
    gecenHaftayiKopyala,
    {},
  );

  // Boş vardiya uyarıları hücrede zaten "—" olarak görünüyor; şeritte
  // yalnızca sayısı veriliyor ki 28 satırlık bir liste oluşmasın.
  const bosVardiyalar = uyarilar.filter((u) => u.tur === "bosVardiya");
  const kisiUyarilari = uyarilar.filter((u) => u.tur !== "bosVardiya");

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="baslangic" value={baslangic} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-control border border-line bg-surface px-3.5 py-2 text-small font-medium text-ink-soft shadow-card transition hover:border-line-strong hover:bg-canvas disabled:opacity-60"
        >
          <CopyPlus className="h-4 w-4" aria-hidden="true" />
          {pending ? "Kopyalanıyor…" : "Geçen haftayı kopyala"}
        </button>
        <span className="text-caption text-ink-faint">
          Var olan atamalara dokunmaz; izinli günleri atlar.
        </span>
        {state.error ? (
          <span className="rounded-chip bg-danger-soft px-3 py-1.5 text-caption text-danger-ink">
            {state.error}
          </span>
        ) : null}
        {state.saved ? (
          <span className="rounded-chip bg-success-soft px-3 py-1.5 text-caption text-success-ink">
            ✓ {state.saved}
          </span>
        ) : null}
      </form>

      {kisiUyarilari.length > 0 || bosVardiyalar.length > 0 ? (
        <div className="rounded-control bg-warning-soft px-4 py-3 ring-1 ring-warning/25">
          <p className="flex items-center gap-2 text-caption font-semibold text-warning-ink uppercase">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Çizelge uyarıları
          </p>
          <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-5 text-small text-warning-ink">
            {kisiUyarilari.map((u, i) => (
              <li key={i}>{u.mesaj}</li>
            ))}
            {bosVardiyalar.length > 0 ? (
              <li>
                Bu hafta <strong>{bosVardiyalar.length}</strong> vardiyaya kimse
                atanmadı (tabloda &quot;—&quot; ile işaretli).
              </li>
            ) : null}
          </ul>
          <p className="mt-1.5 text-caption text-warning-ink/80">
            Bunlar yalnızca hatırlatma — bilerek böyle planladıysanız bir şey
            yapmanız gerekmiyor.
          </p>
        </div>
      ) : null}
    </div>
  );
}
