"use client";

import { useActionState } from "react";
import { ChevronDown, CopyPlus, TriangleAlert } from "lucide-react";
import { gecenHaftayiKopyala, type HaftaKopyaState } from "./actions";
import { uyarilariGrupla, type VardiyaUyarisi } from "@/lib/vardiya-uyari";

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
  // Aynı cümle aynı kişi için dört kez tekrarlanabiliyordu; kişi + tür
  // bazında gruplanıyor (bkz. lib/vardiya-uyari.ts).
  const ozetler = uyarilariGrupla(uyarilar);
  const toplamUyari = ozetler.reduce((toplam, o) => toplam + o.adet, 0);

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

      {ozetler.length > 0 || bosVardiyalar.length > 0 ? (
        <details className="group rounded-card border border-warning/25 bg-warning-soft/50">
          {/* Uyarılar kaydı engellemiyor, yalnızca hatırlatma. Bu yüzden
              varsayılan KAPALI: çizelgeyi kurarken ekranın üçte birini
              kaplayan sarı bir blok, asıl işin (tablonun) önüne geçiyordu.
              Başlıkta sayı var — açmadan da "bir şey var mı" görülüyor. */}
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-small font-medium text-warning-ink">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {ozetler.length > 0 ? (
                <>
                  {ozetler.length} personel için {toplamUyari} hatırlatma
                </>
              ) : null}
              {ozetler.length > 0 && bosVardiyalar.length > 0 ? " · " : null}
              {bosVardiyalar.length > 0 ? (
                <>{bosVardiyalar.length} vardiya boş</>
              ) : null}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="border-t border-warning/20 px-4 py-3">
            <ul className="flex flex-col gap-2">
              {ozetler.map((ozet) => (
                <li key={`${ozet.ad}-${ozet.tur}`} className="text-small text-warning-ink">
                  <span className="font-medium">{ozet.baslik}</span>
                  {/* Tekrarlayan uyarılarda tek tek hangi günler olduğu
                      ancak istendiğinde açılıyor. */}
                  {ozet.adet > 1 ? (
                    <ul className="mt-0.5 flex list-disc flex-col gap-0.5 pl-5 text-caption text-warning-ink/80">
                      {ozet.detaylar.map((detay, i) => (
                        <li key={i}>{detay}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              {bosVardiyalar.length > 0 ? (
                <li className="text-small text-warning-ink">
                  <span className="font-medium">
                    {bosVardiyalar.length} vardiyaya kimse atanmadı
                  </span>
                  <span className="block text-caption text-warning-ink/80">
                    Tabloda &quot;—&quot; ile işaretli.
                  </span>
                </li>
              ) : null}
            </ul>
            <p className="mt-2.5 text-caption text-warning-ink/80">
              Bunlar yalnızca hatırlatma — bilerek böyle planladıysanız bir şey
              yapmanız gerekmiyor.
            </p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
