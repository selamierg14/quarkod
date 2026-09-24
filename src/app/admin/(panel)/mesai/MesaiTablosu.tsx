"use client";

import { useActionState, useState } from "react";
import { SHIFTS } from "@/lib/cekirdek/constants";
import { DURUM_METNI, sureMetni, type PersonelDurumu } from "@/lib/personel/mesai";
import { elleKayitEkle, kaydiDuzelt, type MesaiFormState } from "./actions";

export type TabloSatiri = {
  userId: string;
  ad: string;
  vardiya: string | null;
  ilkGiris: string | null;
  sonCikis: string | null;
  toplamDakika: number | null;
  durum: PersonelDurumu;
  kayitSayisi: number;
  /** Düzeltilebilir tek kayıt varsa kimliği — satır içi düzeltme için. */
  kayitId: string | null;
};

const DURUM_STILI: Record<PersonelDurumu, string> = {
  tamam: "bg-success-soft text-success-ink",
  icerde: "bg-info-soft text-info-ink",
  "cikis-yapmadi": "bg-warning-soft text-warning-ink",
  "giris-yapmadi": "bg-danger-soft text-danger-ink",
};

/** "2026-09-23T19:30" — datetime-local girdisinin beklediği biçim. */
function yerelGirdi(iso: string | null, varsayilanGun: string): string {
  if (!iso) return `${varsayilanGun}T09:00`;
  const t = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
}

function saatMetni(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Günün personel tablosu + satır içi düzeltme.
 *
 * Düzeltme ayrı bir sayfaya gitmiyor: eksik kaydı gören kişi zaten
 * doğru saati biliyor ("dün 23'te çıkmıştı") ve o an yazabilmeli.
 * Ayrı ekran, düzeltmeyi "sonra yaparım"a çeviriyor ve rapor eksik
 * kalıyor.
 */
export function MesaiTablosu({
  businessId,
  gun,
  satirlar,
}: {
  businessId: string;
  /** yyyy-aa-gg — elle kayıt eklerken varsayılan gün. */
  gun: string;
  satirlar: TabloSatiri[];
}) {
  const [acikSatir, setAcikSatir] = useState<string | null>(null);

  if (satirlar.length === 0) {
    return (
      <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-small text-ink-faint">
        Bu tarihte ne mesai kaydı ne de planlı vardiya var.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {satirlar.map((satir) => (
        <div key={satir.userId} className="rounded-card border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{satir.ad}</span>
                <span className={`rounded-chip px-2 py-0.5 text-caption ${DURUM_STILI[satir.durum]}`}>
                  {DURUM_METNI[satir.durum]}
                </span>
                {satir.vardiya ? (
                  <span className="text-caption text-ink-faint">
                    {SHIFTS[satir.vardiya as keyof typeof SHIFTS] ?? satir.vardiya} vardiyası
                  </span>
                ) : null}
              </div>
              <span className="text-small text-ink-soft tabular">
                {saatMetni(satir.ilkGiris)} – {saatMetni(satir.sonCikis)} ·{" "}
                {sureMetni(satir.toplamDakika)}
                {satir.kayitSayisi > 1 ? ` · ${satir.kayitSayisi} kayıt` : ""}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAcikSatir(acikSatir === satir.userId ? null : satir.userId)}
              className="min-h-11 rounded-control border border-line px-3 text-small text-ink hover:bg-sunken"
            >
              {acikSatir === satir.userId ? "Kapat" : "Düzelt"}
            </button>
          </div>

          {acikSatir === satir.userId ? (
            <DuzeltmeFormu
              businessId={businessId}
              gun={gun}
              satir={satir}
              onBitti={() => setAcikSatir(null)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DuzeltmeFormu({
  businessId,
  gun,
  satir,
  onBitti,
}: {
  businessId: string;
  gun: string;
  satir: TabloSatiri;
  onBitti: () => void;
}) {
  /**
   * Kaydı olan satır GÜNCELLENİYOR, olmayan için YENİ kayıt açılıyor.
   * İkisi ayrı eylem çünkü "giriş yapmadı" satırının düzeltilecek bir
   * kaydı yok — orada yapılan iş, olmayan kaydı yaratmak.
   */
  const guncelleme = satir.kayitId !== null && satir.kayitSayisi === 1;
  const [durum, eylem, bekliyor] = useActionState<MesaiFormState, FormData>(
    guncelleme ? kaydiDuzelt : elleKayitEkle,
    {},
  );

  if (satir.kayitSayisi > 1) {
    return (
      <p className="mt-3 rounded-control bg-sunken px-3 py-2 text-caption text-ink-soft">
        Bu kişinin bugün {satir.kayitSayisi} kaydı var; çok kayıtlı günler
        satır içinden düzeltilmiyor. Tarihi daraltıp tek kayda inin.
      </p>
    );
  }

  return (
    <form action={eylem} className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
      <input type="hidden" name="businessId" value={businessId} />
      {guncelleme ? (
        <input type="hidden" name="kayitId" value={satir.kayitId ?? ""} />
      ) : (
        <input type="hidden" name="userId" value={satir.userId} />
      )}

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Giriş</span>
        <input
          type="datetime-local"
          name="giris"
          defaultValue={yerelGirdi(satir.ilkGiris, gun)}
          required
          className="rounded-control border border-line bg-surface px-2 py-1.5 text-small text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Çıkış (boş = hâlâ içeride)</span>
        <input
          type="datetime-local"
          name="cikis"
          defaultValue={satir.sonCikis ? yerelGirdi(satir.sonCikis, gun) : ""}
          className="rounded-control border border-line bg-surface px-2 py-1.5 text-small text-ink"
        />
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-caption text-ink-muted">Gerekçe</span>
        <input
          name="not"
          maxLength={200}
          placeholder="Çıkış okutmayı unutmuş; 23:00'te çıktı."
          className="w-full rounded-control border border-line bg-surface px-2 py-1.5 text-small text-ink"
        />
      </label>

      <button
        type="submit"
        disabled={bekliyor}
        className="min-h-11 rounded-control bg-accent-600 px-4 text-small font-medium text-white hover:bg-accent-700 disabled:opacity-50"
      >
        {bekliyor ? "…" : guncelleme ? "Kaydı düzelt" : "Kayıt ekle"}
      </button>

      {durum.error ? (
        <p className="w-full text-caption text-danger-ink" role="alert">{durum.error}</p>
      ) : null}
      {durum.saved ? (
        <p className="w-full text-caption text-success-ink" role="status" onAnimationEnd={onBitti}>
          {durum.saved}
        </p>
      ) : null}
    </form>
  );
}
