"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import {
  duyuruAktifDegistir,
  duyuruDuzenle,
  duyuruEkle,
  duyuruSil,
  type DuyuruFormState,
} from "./actions";
import { alanOzellikleri } from "@/lib/cekirdek/desenler";
import { DUYURU_DURUM_METNI, type DuyuruDurumu } from "@/lib/isletme/duyuru";
import { GonderDugmesi, KorunanForm, SilDugmesi, buttonClass } from "@/components/ui";

const INPUT =
  "w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

/**
 * Başlık, açıklama ve tarih alanları — ekleme ve düzenleme aynı alanları
 * aynı kurallarla gösteriyor.
 *
 * Formlar KorunanForm içinde: hata dönünce kullanıcının yazdıkları
 * silinmiyor (QA: "başlık gerekli" hatasından sonra form tamamen
 * boşalıyordu). Bitiş alanının `min`i başlangıca bağlı — ters aralık
 * sunucuya gitmeden engelleniyor.
 */
function DuyuruAlanlari({
  degerler,
}: {
  degerler: { baslik: string; aciklama: string; baslangic: string; bitis: string };
}) {
  const [baslangic, setBaslangic] = useState(degerler.baslangic);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-caption text-ink-muted">Başlık</span>
        <input
          name="baslik"
          {...alanOzellikleri("kisaBaslik")}
          required
          defaultValue={degerler.baslik}
          placeholder="Bu hafta sonu: DJ Mehmet"
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-caption text-ink-muted">Açıklama (isteğe bağlı)</span>
        <textarea
          name="aciklama"
          {...alanOzellikleri("aciklama", { zorunlu: false })}
          rows={3}
          defaultValue={degerler.aciklama}
          placeholder="Kapıda +18, rezervasyon için DM..."
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Başlangıç (isteğe bağlı)</span>
        <input
          name="baslangic"
          type="date"
          defaultValue={degerler.baslangic}
          onChange={(e) => setBaslangic(e.target.value)}
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Bitiş (isteğe bağlı, o gün dahil)</span>
        <input
          name="bitis"
          type="date"
          defaultValue={degerler.bitis}
          min={baslangic || undefined}
          className={INPUT}
        />
      </label>
    </div>
  );
}

const BOS = { baslik: "", aciklama: "", baslangic: "", bitis: "" };

function Geribildirim({ state }: { state: DuyuruFormState }) {
  if (state.error) {
    return (
      <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink" role="status">
        {state.saved}
      </p>
    );
  }
  return null;
}

export function NewDuyuruForm({
  businessId,
  isletmeSayisi,
  acikBasla,
}: {
  businessId: string;
  /** Hesaptaki toplam görünür işletme sayısı — 1'den fazlaysa "tümünde göster" seçeneği çıkar. */
  isletmeSayisi: number;
  /** Hiç duyuru yokken form açık gelir; varken listenin önüne geçmesin. */
  acikBasla: boolean;
}) {
  const [state, formAction, pending] = useActionState<DuyuruFormState, FormData>(
    duyuruEkle,
    {},
  );
  // QA: ekleme formu sayfanın %70'ini kaplıyor, liste altta kalıyordu.
  // Artık bir düğmenin arkasında; hata varken açık kalıyor.
  const [acik, setAcik] = useState(acikBasla);

  // Her başarılı eklemeden sonra alanlar (görsel önizlemesi dahil) baştan
  // kuruluyor; hatada dokunulmuyor. Effect yerine render sırasında.
  const [kayitSayisi, setKayitSayisi] = useState(0);
  const [sonSonuc, setSonSonuc] = useState(state);
  if (state !== sonSonuc) {
    setSonSonuc(state);
    if (state.saved) setKayitSayisi((n) => n + 1);
  }

  if (!acik && !state.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        {state.saved ? (
          <p className="text-small font-medium text-success-ink" role="status">
            ✓ {state.saved}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setAcik(true)}
          className={buttonClass({ size: "sm" })}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Yeni duyuru
        </button>
      </div>
    );
  }

  return (
    <KorunanForm
      action={formAction}
      sonuc={state}
      className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card ring-1 ring-line"
    >
      <h2 className="text-body font-semibold text-ink">Yeni duyuru</h2>
      <input type="hidden" name="businessId" value={businessId} />

      <div key={kayitSayisi} className="flex flex-col gap-3">
        <DuyuruAlanlari degerler={BOS} />
        <ImageUpload
          name="imageUrl"
          kind="duyuru"
          label="Afiş görseli (isteğe bağlı)"
          hint="PNG, JPEG ya da WebP. Duyurular listesinde geniş kart olarak görünür."
          initial={null}
          brandColor="#111827"
        />
      </div>

      {isletmeSayisi > 1 ? (
        <label className="flex cursor-pointer items-center gap-2 rounded-chip border border-line bg-canvas px-3 py-2 text-small text-ink-soft has-checked:border-accent-500 has-checked:bg-accent-50 has-checked:text-ink">
          <input type="checkbox" name="tumIsletmeler" className="shrink-0" />
          Tüm işletmelerde göster ({isletmeSayisi} şube)
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={buttonClass({ size: "sm" })}>
          {pending ? "Ekleniyor…" : "Duyuru ekle"}
        </button>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className={buttonClass({ variant: "ghost", size: "sm" })}
        >
          Vazgeç
        </button>
      </div>

      <Geribildirim state={state} />
    </KorunanForm>
  );
}

const DURUM_ROZETI: Record<DuyuruDurumu, string> = {
  yayinda: "bg-success-soft text-success-ink",
  planlandi: "bg-sky-50 text-sky-800",
  "suresi-doldu": "bg-warning-soft text-warning-ink",
  pasif: "bg-sunken text-ink-muted",
};

export function DuyuruSatiri({
  id,
  baslik,
  aciklama,
  imageUrl,
  aktif,
  durum,
  baslangic,
  bitis,
  tarihMetni,
}: {
  id: string;
  baslik: string;
  aciklama: string | null;
  imageUrl: string | null;
  aktif: boolean;
  durum: DuyuruDurumu;
  /** yyyy-aa-gg — tarih alanları için. */
  baslangic: string;
  bitis: string;
  /** Ekranda gösterilecek aralık ("12.01.2026 – 14.01.2026"); yoksa null. */
  tarihMetni: string | null;
}) {
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [state, formAction, pending] = useActionState<DuyuruFormState, FormData>(
    duyuruDuzenle,
    {},
  );

  // Kaydedilince düzenleme kapanıyor (QA: form açık kalıyor, başarı mesajı
  // görünmüyordu). Effect yerine render sırasında: yeni bir sonuç
  // geldiğinde bir kez.
  const [sonSonuc, setSonSonuc] = useState(state);
  if (state !== sonSonuc) {
    setSonSonuc(state);
    if (state.saved) setDuzenleAcik(false);
  }

  if (duzenleAcik) {
    return (
      <li className="rounded-control bg-surface p-4 ring-1 ring-accent-300">
        <KorunanForm action={formAction} sonuc={state} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />

          <DuyuruAlanlari degerler={{ baslik, aciklama: aciklama ?? "", baslangic, bitis }} />

          <ImageUpload
            name="imageUrl"
            kind="duyuru"
            label="Afiş görseli (isteğe bağlı)"
            hint="PNG, JPEG ya da WebP. Duyurular listesinde geniş kart olarak görünür."
            initial={imageUrl}
            brandColor="#111827"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={pending} className={buttonClass({ size: "sm" })}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setDuzenleAcik(false)}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Vazgeç
            </button>
          </div>
          <Geribildirim state={state.saved ? {} : state} />
        </KorunanForm>
      </li>
    );
  }

  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-3 rounded-control bg-surface p-4 ring-1 ring-line ${
        durum === "suresi-doldu" || durum === "pasif" ? "opacity-75" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Kelime kırılmayan uzun başlık sayfayı 2577px'e taşırıyordu (QA). */}
          <p className="min-w-0 font-medium break-words text-ink [overflow-wrap:anywhere]">
            {baslik}
          </p>
          <span
            className={`shrink-0 rounded-chip px-2 py-0.5 text-caption font-medium ${DURUM_ROZETI[durum]}`}
          >
            {DUYURU_DURUM_METNI[durum]}
          </span>
        </div>
        {aciklama ? (
          // Satır sonları korunuyor; önceden tek satıra birleşiyordu.
          <p className="mt-0.5 text-small whitespace-pre-line text-ink-muted [overflow-wrap:anywhere]">
            {aciklama}
          </p>
        ) : null}
        {tarihMetni ? <p className="mt-1 text-caption text-ink-faint">{tarihMetni}</p> : null}
        {state.saved ? (
          <p className="mt-1.5 text-caption font-medium text-success-ink" role="status">
            ✓ {state.saved}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* Yayın anahtarı gerçek bir anahtar: önceden rozet gibi duran
            "Yayında" yazısına tıklanabildiği anlaşılmıyordu. */}
        <form action={duyuruAktifDegistir}>
          <input type="hidden" name="id" value={id} />
          <GonderDugmesi
            role="switch"
            aria-checked={aktif}
            aria-label={aktif ? "Yayından kaldır" : "Yayına al"}
            title={aktif ? "Yayından kaldır" : "Yayına al"}
            className="flex items-center gap-2 rounded-chip px-1.5 py-1 text-caption text-ink-soft hover:bg-canvas"
          >
            <span
              aria-hidden="true"
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${
                aktif ? "bg-success" : "bg-line-strong"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] ${
                  aktif ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
            {aktif ? "Açık" : "Kapalı"}
          </GonderDugmesi>
        </form>
        <button
          type="button"
          onClick={() => setDuzenleAcik(true)}
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          Düzenle
        </button>
        <form action={duyuruSil}>
          <input type="hidden" name="id" value={id} />
          <SilDugmesi
            className="rounded-chip px-2 py-1 text-caption font-medium text-danger-ink hover:bg-danger-soft"
            onayMetni="Kalıcı olarak silinsin mi?"
            onayClassName="bg-danger text-white"
          >
            Sil
          </SilDugmesi>
        </form>
      </div>
    </li>
  );
}
