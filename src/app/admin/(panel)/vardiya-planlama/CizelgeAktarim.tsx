"use client";

import { useActionState, useState } from "react";
import { Download, FileSpreadsheet, FileQuestion, Upload } from "lucide-react";
import { SectionCard } from "@/components/ui";
import { cizelgeyiIceAktar, type CizelgeIceAktarState } from "./actions";

/**
 * Çizelgenin Excel'e aktarımı ve geri alınması.
 *
 * Akış bilinçli olarak "önce indir, sonra yükle": boş bir şablona isim
 * yazdırmak yerine mevcut personel ve o haftanın günleri hazır gelen bir
 * dosya veriyoruz — isim yazım hatası içe aktarmanın en sık kırıldığı yer
 * (bkz. vardiya-tablo.ts, tanınmayan isim uyarısı).
 */
export function CizelgeAktarim({
  businessId,
  baslangic,
}: {
  businessId: string;
  /** İçe/dışa aktarılacak haftanın pazartesisi (yyyy-aa-gg). */
  baslangic: string;
}) {
  const [state, formAction, pending] = useActionState<CizelgeIceAktarState, FormData>(
    cizelgeyiIceAktar,
    {},
  );
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(null);

  const indirmeAdresi = `/admin/vardiya-planlama/disa-aktar?${new URLSearchParams({
    isletme: businessId,
    baslangic,
  }).toString()}`;
  const ornekAdresi = `/admin/vardiya-planlama/ornek-dosya?${new URLSearchParams({
    baslangic,
  }).toString()}`;

  return (
    <SectionCard
      ikon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
      renk="emerald"
      title="Excel ile çizelge"
      description="Bu haftanın çizelgesini indirip Excel'de doldurun, sonra aynı dosyayı geri yükleyin."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <a
            href={indirmeAdresi}
            className="inline-flex w-fit items-center gap-2 rounded-control border border-line bg-surface px-4 py-2 text-small font-medium text-ink-soft transition hover:border-line-strong hover:bg-canvas"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Bu haftayı Excel&apos;e aktar
          </a>
          {/* Yukarıdaki dosya gerçek personeli taşıyor — henüz kimse
              atanmamışsa boş satırlardan ibaret kalır ve biçimi hiç
              öğretmez. Bu, sahte iki personelle biçimi gösteren ayrı
              bir örnek: tek vardiya, virgülle çoklu vardiya ve izinli
              günü aynı dosyada gösteriyor. */}
          <a
            href={ornekAdresi}
            className="inline-flex w-fit items-center gap-2 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-2 text-small font-medium text-ink-soft transition hover:bg-sunken"
          >
            <FileQuestion className="h-4 w-4" aria-hidden="true" />
            Örnek dosya indir (biçimi göster)
          </a>
        </div>

        <ul className="flex list-disc flex-col gap-1 rounded-control bg-canvas px-4 py-3 pl-8 text-caption text-ink-soft">
          <li>
            Vardiya adları: <strong>Sabah, Öğle, Akşam, Gece</strong> — bir
            hücrede birden fazlası virgülle yazılabilir (&quot;Sabah, Akşam&quot;).
          </li>
          <li>Boş hücre &quot;o gün çalışmıyor&quot; demektir.</li>
          <li>
            İlk sütundaki isim panele kayıtlı personel adıyla birebir
            eşleşmeli; eşleşmeyen satırlar atlanır (silinmez, yalnızca o
            satır okunmaz).
          </li>
          <li>Dosya biçimi CSV (UTF-8), en fazla 1 MB.</li>
        </ul>

        <div className="border-t border-line pt-4">
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="baslangic" value={baslangic} />

            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-2 text-small text-ink-soft transition hover:bg-sunken">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {dosyaAdi ?? "Dosya seç (.csv)"}
              <input
                type="file"
                name="dosya"
                required
                accept=".csv,text/csv"
                onChange={(e) => setDosyaAdi(e.target.files?.[0]?.name ?? null)}
                className="sr-only"
              />
            </label>

            {/* Varsayılan kapalı: içe aktarma eklemeli çalışır, panelden
                yapılmış atamalar eski bir dosya yüzünden sessizce
                kaybolmasın (bkz. cizelgeyiIceAktar). */}
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-chip border border-line bg-surface px-3 py-2 text-caption text-ink-muted has-checked:border-warning/40 has-checked:bg-warning-soft has-checked:text-warning-ink">
              <input type="checkbox" name="kaldir" className="shrink-0" />
              Dosyada olmayan vardiyaları bu haftadan kaldır
            </label>

            <button
              type="submit"
              disabled={pending}
              className="w-fit rounded-control bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2 text-small font-medium text-white shadow-card transition hover:brightness-110 disabled:bg-slate-400 disabled:bg-none"
            >
              {pending ? "Yükleniyor…" : "Dosyayı yükle"}
            </button>
          </form>
        </div>

        {state.error ? (
          <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-ink">
            {state.error}
          </p>
        ) : null}
        {state.saved ? (
          <p className="rounded-control bg-success-soft px-3 py-2 text-small text-success-ink">
            ✓ {state.saved}
          </p>
        ) : null}

        {state.uyarilar && state.uyarilar.length > 0 ? (
          <div className="rounded-control bg-warning-soft px-3 py-2 ring-1 ring-warning/25">
            <p className="text-caption font-semibold text-warning-ink">
              Dosyadaki bazı satırlar okunamadı:
            </p>
            <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4 text-caption text-warning-ink">
              {state.uyarilar.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
