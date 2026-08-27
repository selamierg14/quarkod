"use client";

import { useActionState, useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import {
  duyuruAktifDegistir,
  duyuruDuzenle,
  duyuruEkle,
  duyuruSil,
  type DuyuruFormState,
} from "./actions";

const INPUT =
  "w-full rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

export function NewDuyuruForm({
  businessId,
  isletmeSayisi,
}: {
  businessId: string;
  /** Hesaptaki toplam görünür işletme sayısı — 1'den fazlaysa "tümünde göster" seçeneği çıkar. */
  isletmeSayisi: number;
}) {
  const [state, formAction, pending] = useActionState<DuyuruFormState, FormData>(
    duyuruEkle,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="businessId" value={businessId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Başlık</span>
          <input
            name="baslik"
            required
            placeholder="Bu hafta sonu: DJ Mehmet"
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-caption text-ink-muted">Açıklama (isteğe bağlı)</span>
          <textarea
            name="aciklama"
            rows={2}
            placeholder="Kapıda +18, rezervasyon için DM..."
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Başlangıç (isteğe bağlı)</span>
          <input name="baslangic" type="date" className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Bitiş (isteğe bağlı)</span>
          <input name="bitis" type="date" className={INPUT} />
        </label>
      </div>

      <ImageUpload
        name="imageUrl"
        kind="duyuru"
        label="Afiş görseli (isteğe bağlı)"
        hint="Duyurular listesinde geniş kart olarak görünür."
        initial={null}
        brandColor="#111827"
      />

      {isletmeSayisi > 1 ? (
        <label className="flex cursor-pointer items-center gap-2 rounded-chip border border-line bg-canvas px-3 py-2 text-small text-ink-soft has-checked:border-accent-500 has-checked:bg-accent-50 has-checked:text-ink">
          <input type="checkbox" name="tumIsletmeler" className="shrink-0" />
          Tüm işletmelerde göster ({isletmeSayisi} şube)
        </label>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Ekleniyor..." : "Duyuru ekle"}
      </button>

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
    </form>
  );
}

/** yyyy-aa-gg → <input type="date"> için; tr-TR görüntü biçiminden geri çevrim. */
function girdiTarihi(gorunen: string | null): string {
  if (!gorunen) return "";
  const [gun, ay, yil] = gorunen.split(".");
  if (!gun || !ay || !yil) return "";
  return `${yil}-${ay}-${gun}`;
}

export function DuyuruSatiri({
  id,
  baslik,
  aciklama,
  imageUrl,
  aktif,
  baslangic,
  bitis,
}: {
  id: string;
  baslik: string;
  aciklama: string | null;
  imageUrl: string | null;
  aktif: boolean;
  baslangic: string | null;
  bitis: string | null;
}) {
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [state, formAction, pending] = useActionState<DuyuruFormState, FormData>(
    duyuruDuzenle,
    {},
  );

  if (duzenleAcik) {
    return (
      <li className="rounded-control bg-surface p-4 ring-1 ring-accent-300">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Başlık</span>
              <input
                name="baslik"
                required
                defaultValue={baslik}
                className={INPUT}
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-caption text-ink-muted">Açıklama (isteğe bağlı)</span>
              <textarea
                name="aciklama"
                rows={2}
                defaultValue={aciklama ?? ""}
                className={INPUT}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Başlangıç (isteğe bağlı)</span>
              <input
                name="baslangic"
                type="date"
                defaultValue={girdiTarihi(baslangic)}
                className={INPUT}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">Bitiş (isteğe bağlı)</span>
              <input
                name="bitis"
                type="date"
                defaultValue={girdiTarihi(bitis)}
                className={INPUT}
              />
            </label>
          </div>

          <ImageUpload
            name="imageUrl"
            kind="duyuru"
            label="Afiş görseli (isteğe bağlı)"
            hint="Duyurular listesinde geniş kart olarak görünür."
            initial={imageUrl}
            brandColor="#111827"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setDuzenleAcik(false)}
              className="rounded-control border border-line px-4 py-2 text-small text-ink-soft hover:bg-canvas"
            >
              Vazgeç
            </button>
            {state.error ? (
              <p className="text-caption text-danger">{state.error}</p>
            ) : null}
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-control bg-surface p-4 ring-1 ring-line">
      <div className="min-w-0">
        <p className="font-medium text-ink">{baslik}</p>
        {aciklama ? <p className="mt-0.5 text-small text-ink-muted">{aciklama}</p> : null}
        {baslangic || bitis ? (
          <p className="mt-1 text-caption text-ink-faint">
            {baslangic ?? "şimdi"} – {bitis ?? "süresiz"}
          </p>
        ) : null}
        {state.saved ? (
          <p className="mt-1.5 text-caption font-medium text-success-ink">✓ {state.saved}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setDuzenleAcik(true)}
          className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
        >
          Düzenle
        </button>
        <form action={duyuruAktifDegistir}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className={`rounded-chip px-2.5 py-1 text-caption font-medium ${
              aktif
                ? "bg-success-soft text-success-ink"
                : "border border-line text-ink-faint"
            }`}
          >
            {aktif ? "Yayında" : "Pasif"}
          </button>
        </form>
        <form action={duyuruSil}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="rounded-chip px-2 py-1 text-caption text-ink-faint hover:text-danger"
          >
            Sil
          </button>
        </form>
      </div>
    </li>
  );
}
