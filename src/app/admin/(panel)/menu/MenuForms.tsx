"use client";

import { ChevronDown, ClipboardList, Send } from "lucide-react";
import { useActionState, useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { GonderDugmesi, SectionCard, SilDugmesi, buttonClass, EylemMenusu, EYLEM_SATIRI } from "@/components/ui";
import {
  ALERJENLER,
  MENU_TAGS,
  OZEL_BILESENLER,
  formatPrice,
  parseAlerjenler,
  parseOzelBilesenler,
  parseTags,
  priceInputValue,
} from "@/lib/isletme/menu";
import {
  addMenuCategory,
  addMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  menuyuKopyala,
  moveMenuCategory,
  moveMenuItem,
  renameMenuCategory,
  toggleMenuCategory,
  toggleMenuItem,
  toggleSoldOut,
  tumMenuyuSil,
  updateMenuItem,
  type MenuFormState,
} from "./actions";

const INPUT =
  "w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";
/** Satırdaki küçük düğmeler — 32px; önceden ~22px'ti (UI incelemesi). */
const KUCUK_BUTON = buttonClass({ variant: "secondary", size: "sm", className: "px-2.5" });

export type UrunGorunumu = {
  id: string;
  name: string;
  description: string | null;
  priceKurus: number | null;
  imageUrl: string | null;
  tags: string | null;
  icindekiler: string | null;
  kaloriKcal: number | null;
  alerjenler: string | null;
  ozelBilesenler: string | null;
  bilgilerDogrulandi: boolean;
  soldOut: boolean;
  active: boolean;
};

/* ------------------------------------------------------------- kategoriler */

export function NewCategoryForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    addMenuCategory,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="businessId" value={businessId} />
      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Yeni bölüm</span>
        <input
          name="name"
          required
          placeholder="Kahveler, Tatlılar, Ana Yemekler…"
          className={`${INPUT} w-56`}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ size: "sm" })}
      >
        {pending ? "Ekleniyor…" : "Bölüm ekle"}
      </button>
      {state.error ? <p className="pb-2 text-small text-danger" role="alert">{state.error}</p> : null}
    </form>
  );
}

export function CategoryHeader({
  id,
  name,
  active,
  urunSayisi,
}: {
  id: string;
  name: string;
  active: boolean;
  urunSayisi: number;
}) {
  const [duzenle, setDuzenle] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
      {duzenle ? (
        <form
          action={renameMenuCategory}
          onSubmit={() => setDuzenle(false)}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="categoryId" value={id} />
          <input name="name" defaultValue={name} autoFocus className={`${INPUT} w-48`} />
          <GonderDugmesi  className={KUCUK_BUTON}
      >
            Kaydet
          </GonderDugmesi>
          <button type="button" onClick={() => setDuzenle(false)} className={KUCUK_BUTON}>
            Vazgeç
          </button>
        </form>
      ) : (
        <span className="flex items-center gap-2">
          <span className={`font-medium ${active ? "" : "text-ink-faint line-through"}`}>
            {name}
          </span>
          <span className="text-caption text-ink-faint">{urunSayisi} ürün</span>
          {!active ? (
            <span className="rounded bg-sunken px-1.5 py-0.5 text-caption text-ink-muted">
              menüde görünmüyor
            </span>
          ) : null}
        </span>
      )}

      <div className="flex items-center gap-1">
        {!duzenle ? (
          <button type="button" onClick={() => setDuzenle(true)} className={KUCUK_BUTON}>
            Adı değiştir
          </button>
        ) : null}
        <form action={moveMenuCategory}>
          <input type="hidden" name="categoryId" value={id} />
          <input type="hidden" name="direction" value="up" />
          <GonderDugmesi  aria-label={`${name} bölümünü yukarı taşı`} className={KUCUK_BUTON}
      >
            ↑
          </GonderDugmesi>
        </form>
        <form action={moveMenuCategory}>
          <input type="hidden" name="categoryId" value={id} />
          <input type="hidden" name="direction" value="down" />
          <GonderDugmesi  aria-label={`${name} bölümünü aşağı taşı`} className={KUCUK_BUTON}
      >
            ↓
          </GonderDugmesi>
        </form>
        <form action={toggleMenuCategory}>
          <input type="hidden" name="categoryId" value={id} />
          <GonderDugmesi  className={KUCUK_BUTON}
      >
            {active ? "Gizle" : "Göster"}
          </GonderDugmesi>
        </form>
        <form action={deleteMenuCategory}>
          <input type="hidden" name="categoryId" value={id} />
          <SilDugmesi
            title="Bölümü ve içindeki tüm ürünleri kalıcı olarak siler"
            className={`${KUCUK_BUTON} text-danger`}
      
            onayMetni="Bölüm ve ürünleri silinsin mi?"
            onayClassName="bg-danger-soft text-danger-ink font-medium">
            Sil
          </SilDugmesi>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ ürünler */

function EtiketSecimi({ secili }: { secili: string[] }) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="mb-1 text-caption text-ink-muted">Etiketler</legend>
      {Object.entries(MENU_TAGS).map(([deger, etiket]) => (
        <label
          key={deger}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-caption has-checked:border-slate-900 has-checked:bg-ink has-checked:text-white"
        >
          <input
            type="checkbox"
            name="tags"
            value={deger}
            defaultChecked={secili.includes(deger)}
            className="sr-only"
          />
          {etiket}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Menüde bildirilmesi zorunlu bilgiler.
 *
 * Ayrı bir katlanır bölümde: dört alan birden ürün formunun üstüne
 * konulsaydı, en sık dokunulan alanlar (ad, fiyat, tükendi) aşağı itilirdi.
 * Ama başlıkta eksik sayısı yazıyor ve eksik varsa bölüm AÇIK geliyor —
 * "katlanmış" ile "unutulmuş" aynı şey olmasın.
 */
function ZorunluBilgiler({ urun }: { urun?: UrunGorunumu }) {
  const alerjenler = parseAlerjenler(urun?.alerjenler);
  const ozel = parseOzelBilesenler(urun?.ozelBilesenler);
  const eksik = [!urun?.icindekiler, urun?.kaloriKcal == null].filter(Boolean).length;
  // Şablondan gelmiş ama işletme henüz bakmamış: alanlar dolu, onay yok.
  const sablondanGeldi = Boolean(urun) && !urun?.bilgilerDogrulandi && eksik === 0;

  return (
    <details
      open={!urun || eksik > 0 || sablondanGeldi}
      className="group rounded-control border border-line"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-small font-medium text-ink-soft">
        <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">Zorunlu menü bilgileri</span>
        {eksik > 0 ? (
          <span className="rounded-chip bg-warning-soft px-2 py-0.5 text-caption text-warning-ink">
            {eksik} eksik
          </span>
        ) : sablondanGeldi ? (
          <span className="rounded-chip bg-warning-soft px-2 py-0.5 text-caption text-warning-ink">
            doğrulanmadı
          </span>
        ) : null}
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="flex flex-col gap-3 border-t border-line p-3">
        {sablondanGeldi ? (
          // Şablon değerleri "tipik", işletmenin tarifi değil. Bunu
          // söylemeden bırakmak, doğrulanmamış bir alerjen beyanını
          // doğrulanmış gibi göstermek olurdu.
          <p className="rounded-control bg-warning-soft px-3 py-2 text-caption text-warning-ink">
            Bu bilgiler <strong>şablondan geldi ve tipik değerlerdir</strong> — sizin
            tarifinizle birebir örtüşmeyebilir. Özellikle alerjenleri kontrol
            edip kaydedin; kaydettiğinizde doğrulanmış sayılacak.
          </p>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Temel bileşenler <span className="text-ink-faint">(hammaddeler)</span>
          </span>
          <textarea
            name="icindekiler"
            rows={2}
            maxLength={500}
            defaultValue={urun?.icindekiler ?? ""}
            placeholder="ör. Dana kıyma, buğday unu ekmek, kaşar peyniri, domates, marul"
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Enerji <span className="text-ink-faint">(porsiyon başına kcal)</span>
          </span>
          <input
            name="kaloriKcal"
            inputMode="numeric"
            defaultValue={urun?.kaloriKcal ?? ""}
            placeholder="ör. 320"
            className={`${INPUT} w-32`}
          />
        </label>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-caption text-ink-muted">
            Alerjen içerikler
          </legend>
          {Object.entries(ALERJENLER).map(([deger, etiket]) => (
            <label
              key={deger}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-caption has-checked:border-warning has-checked:bg-warning-soft has-checked:text-warning-ink"
            >
              <input
                type="checkbox"
                name="alerjenler"
                value={deger}
                defaultChecked={alerjenler.includes(deger as never)}
                className="sr-only"
              />
              {etiket}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-caption text-ink-muted">Özel bileşenler</legend>
          {Object.entries(OZEL_BILESENLER).map(([deger, etiket]) => (
            <label
              key={deger}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-caption has-checked:border-ink has-checked:bg-ink has-checked:text-white"
            >
              <input
                type="checkbox"
                name="ozelBilesenler"
                value={deger}
                defaultChecked={ozel.includes(deger as never)}
                className="sr-only"
              />
              {etiket}
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  );
}

/** Ürün ekleme ve düzenleme aynı alanları kullanıyor. */
function UrunAlanlari({
  urun,
  brandColor,
}: {
  urun?: UrunGorunumu;
  brandColor: string;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Ürün adı</span>
          <input name="name" required defaultValue={urun?.name} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Fiyat (₺)</span>
          <input
            name="price"
            inputMode="decimal"
            placeholder="149,90"
            defaultValue={priceInputValue(urun?.priceKurus)}
            className={INPUT}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-ink-muted">Açıklama (isteğe bağlı)</span>
        <input
          name="description"
          defaultValue={urun?.description ?? ""}
          placeholder="İçindekiler, porsiyon, kısa tanıtım"
          className={INPUT}
        />
      </label>

      <ImageUpload
        name="imageUrl"
        kind="menu"
        label="Ürün fotoğrafı"
        hint="Kare kırpılır, ~800px'e küçültülür. Fotoğraflı ürünler belirgin şekilde daha çok sipariş alır."
        initial={urun?.imageUrl ?? null}
        brandColor={brandColor}
      />

      <EtiketSecimi secili={parseTags(urun?.tags)} />

      <ZorunluBilgiler urun={urun} />
    </>
  );
}

export function NewItemForm({
  categoryId,
  brandColor,
}: {
  categoryId: string;
  brandColor: string;
}) {
  const [acik, setAcik] = useState(false);
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    addMenuItem,
    {},
  );

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="m-3 self-start rounded-chip border border-dashed border-line-strong px-3 py-2 text-small text-ink-soft hover:bg-canvas"
      >
        + Ürün ekle
      </button>
    );
  }

  return (
    <form action={formAction} className="m-3 flex flex-col gap-3 rounded-chip bg-canvas p-4">
      <input type="hidden" name="categoryId" value={categoryId} />
      <UrunAlanlari brandColor={brandColor} />

      {state.error ? <p className="text-small text-danger" role="alert">{state.error}</p> : null}
      {state.saved ? <p className="text-small text-success-ink" role="status">{state.saved}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass({ size: "md" })}
        >
          {pending ? "Ekleniyor…" : "Ürünü ekle"}
        </button>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          Kapat
        </button>
      </div>
    </form>
  );
}

export function ItemRow({
  urun,
  brandColor,
}: {
  urun: UrunGorunumu;
  brandColor: string;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    updateMenuItem,
    {},
  );
  const etiketler = parseTags(urun.tags);

  if (duzenle) {
    return (
      <li className="p-3">
        <form action={formAction} className="flex flex-col gap-3 rounded-chip bg-canvas p-4">
          <input type="hidden" name="itemId" value={urun.id} />
          <UrunAlanlari urun={urun} brandColor={brandColor} />

          {/* Ekleme formunda "saved" zaten gösteriliyordu, düzenleme
              formunda unutulmuştu — "kaydet dedim, oldu mu olmadı mı
              anlamıyorum" şikayetinin kaynağı tam olarak buydu. */}
          {state.error ? <p className="text-small text-danger" role="alert">{state.error}</p> : null}
          {state.saved ? <p className="text-small text-success-ink" role="status">{state.saved}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className={buttonClass({ size: "md" })}
            >
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setDuzenle(false)}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              Vazgeç
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    // Mobilde dikey: görsel+isim üstte, buton grubu (Tükendi/Düzenle/↑/↓/
    // Gizle/Sil — altı düğme) altında kendi satırında. Tek satırlık yatay
    // dizilimde dar bir telefonda buton grubu shrink-0 olduğu için asla
    // küçülmüyordu ve ürün adının üstüne biniyordu. sm'den itibaren eski
    // yatay düzen (görsel + isim + butonlar tek satırda) geri geliyor.
    <li className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {urun.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urun.imageUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-chip object-cover ring-1 ring-line"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-chip bg-sunken" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`font-medium ${urun.active ? "" : "text-ink-faint line-through"}`}>
            {urun.name}
          </span>
          {urun.soldOut ? (
            <span className="rounded bg-warning-soft px-1.5 py-0.5 text-caption text-warning-ink">
              tükendi
            </span>
          ) : null}
          {!urun.active ? (
            <span className="rounded bg-sunken px-1.5 py-0.5 text-caption text-ink-muted">
              menüde yok
            </span>
          ) : null}
        </span>

        {urun.description ? (
          <p className="mt-0.5 truncate text-caption text-ink-faint">{urun.description}</p>
        ) : null}

        {etiketler.length > 0 ? (
          <p className="mt-1 flex flex-wrap gap-1">
            {etiketler.map((t) => (
              <span key={t} className="rounded bg-sunken px-1.5 py-0.5 text-[11px] text-ink-soft">
                {MENU_TAGS[t]}
              </span>
            ))}
          </p>
        ) : null}
        </div>
      </div>

      {/* Fiyat kendi sütununda, sağa hizalı ve tabular: alt alta satırlarda
          rakamlar aynı hizada okunuyor. Önceden adın hemen yanındaydı. */}
      <span className="shrink-0 text-small font-medium text-ink tabular sm:w-20 sm:text-right">
        {urun.priceKurus !== null ? formatPrice(urun.priceKurus) : "—"}
      </span>

      <div className="flex items-center gap-1.5 sm:shrink-0">
        {/* Tükendi, mutfaktan gelen bilgiyle anında işaretlenmeli: tek tık. */}
        <form action={toggleSoldOut}>
          <input type="hidden" name="itemId" value={urun.id} />
          <GonderDugmesi
            className={
              urun.soldOut
                ? buttonClass({ variant: "secondary", size: "sm", className: "px-2.5 bg-warning-soft! text-warning-ink! ring-warning/30!" })
                : KUCUK_BUTON
            }
          >
            {urun.soldOut ? "Stoğa al" : "Tükendi"}
          </GonderDugmesi>
        </form>
        <button type="button" onClick={() => setDuzenle(true)} className={KUCUK_BUTON}>
          Düzenle
        </button>
        <EylemMenusu etiket={`${urun.name} — diğer işlemler`}>
          <form action={moveMenuItem}>
            <input type="hidden" name="itemId" value={urun.id} />
            <input type="hidden" name="direction" value="up" />
            <GonderDugmesi role="menuitem" className={EYLEM_SATIRI}>
              ↑ Yukarı taşı
            </GonderDugmesi>
          </form>
          <form action={moveMenuItem}>
            <input type="hidden" name="itemId" value={urun.id} />
            <input type="hidden" name="direction" value="down" />
            <GonderDugmesi role="menuitem" className={EYLEM_SATIRI}>
              ↓ Aşağı taşı
            </GonderDugmesi>
          </form>
          <form action={toggleMenuItem}>
            <input type="hidden" name="itemId" value={urun.id} />
            <GonderDugmesi role="menuitem" className={EYLEM_SATIRI}>
              {urun.active ? "Menüde gizle" : "Menüye geri koy"}
            </GonderDugmesi>
          </form>
          <div className="my-1 border-t border-line" aria-hidden="true" />
          <form action={deleteMenuItem}>
            <input type="hidden" name="itemId" value={urun.id} />
            <SilDugmesi
              role="menuitem"
              title="Ürünü kalıcı olarak siler"
              className={`${EYLEM_SATIRI} text-danger-ink hover:bg-danger-soft hover:text-danger-ink`}
              onayMetni="Kalıcı olarak silinsin mi?"
              onayClassName="bg-danger! text-white!"
            >
              Sil
            </SilDugmesi>
          </form>
        </EylemMenusu>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------ tüm menü */

/**
 * Menünün tamamını silme — iki adımlı onay.
 *
 * Tek tıkla silinen bir menü, bir gecede girilmiş yüzlerce ürünü götürür.
 * Bu yüzden düğme önce yalnızca uyarıyı açıyor; asıl silme ikinci
 * tıklamada, ne kaybedileceği rakamla yazıldıktan sonra oluyor.
 */
export function TumMenuyuSil({
  businessId,
  isletmeAdi,
  bolumSayisi,
  urunSayisi,
}: {
  businessId: string;
  /** Onay için yazdırılan ad. */
  isletmeAdi: string;
  bolumSayisi: number;
  urunSayisi: number;
}) {
  const [acik, setAcik] = useState(false);
  const [yazilan, setYazilan] = useState("");
  const adUyuyor =
    yazilan.trim().toLocaleLowerCase("tr") === isletmeAdi.trim().toLocaleLowerCase("tr");
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    tumMenuyuSil,
    {},
  );

  if (!acik) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-danger-line bg-danger-soft/50 px-4 py-3">
        <p className="text-small text-ink-muted">
          <span className="font-medium text-danger-ink">Tehlikeli bölge.</span>{" "}
          Menüyü sıfırdan kurmak ya da başka bir şablon uygulamak için önce
          tümünü silin.
        </p>
        <button
          type="button"
          onClick={() => setAcik(true)}
          className="shrink-0 rounded-control border border-danger/40 bg-surface px-3 py-1.5 text-small font-medium text-danger-ink transition hover:bg-danger-soft"
        >
          Tüm menüyü sil
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-control border border-danger/40 bg-danger-soft px-4 py-4"
    >
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="onay" value="evet" />

      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white"
        >
          !
        </span>
        <div>
          <p className="font-semibold text-danger-ink">Emin misiniz?</p>
          <p className="mt-0.5 text-small text-danger-ink/80">
            <strong>{bolumSayisi} bölüm</strong> ve içindeki{" "}
            <strong>{urunSayisi} ürün</strong> kalıcı olarak silinecek. Bu işlem
            geri alınamaz. Geçmiş ürün puanları kayıtlarda kalır.
          </p>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-small text-danger-ink">
          Onaylamak için işletmenin adını yazın: <strong>{isletmeAdi}</strong>
        </span>
        <input
          name="onayAdi"
          value={yazilan}
          onChange={(e) => setYazilan(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="h-9 max-w-sm rounded-control border border-danger/40 bg-surface px-3 text-small text-ink outline-none focus:border-danger"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || !adUyuyor}
          className={buttonClass({ variant: "destructive", size: "sm" })}
        >
          {pending ? "Siliniyor…" : "Evet, tüm menüyü sil"}
        </button>
        <button
          type="button"
          onClick={() => setAcik(false)}
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          Vazgeç
        </button>
      </div>

      {state.error ? (
        <p className="text-small font-medium text-danger-ink" role="alert">{state.error}</p>
      ) : null}
    </form>
  );
}

/* --------------------------------------------------------- çoklu şube */

export type KopyaHedefi = { id: string; name: string; bolumSayisi: number };

/**
 * Menüyü aynı hesaptaki başka işletmelere kopyalar.
 *
 * Yalnızca menüsü boş olan işletmeler seçilebilir — dolu bir menünün
 * üstüne kopyalamak sunucu tarafında zaten reddediliyor (bkz.
 * menuyuKopyala), burada da seçimi baştan engelleyip "neden olmadı"
 * sorusunu önlüyoruz.
 */
export function MenuyuKopyala({
  businessId,
  hedefler,
}: {
  businessId: string;
  hedefler: KopyaHedefi[];
}) {
  const [state, formAction, pending] = useActionState<MenuFormState, FormData>(
    menuyuKopyala,
    {},
  );
  const kopyalanabilir = hedefler.filter((h) => h.bolumSayisi === 0);

  if (hedefler.length === 0) return null;

  return (
    <SectionCard
      ikon={<Send className="h-4 w-4" aria-hidden="true" />}
      renk="sky"
      title="Menüyü başka şubeye kopyala"
      description="Aynı hesaptaki, menüsü henüz boş olan şubelere bu menünün tamamını tek seferde kurar."
    >
      {kopyalanabilir.length === 0 ? (
        <p className="text-small text-ink-muted">
          Hesaptaki diğer şubelerin hepsinde zaten bir menü var. Kopyalamak
          için önce hedef şubede &quot;Tüm menüyü sil&quot; ile menüyü
          boşaltmanız gerekir.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="businessId" value={businessId} />
          <fieldset className="flex flex-col gap-2">
            {hedefler.map((h) => (
              <label
                key={h.id}
                className={`flex items-center gap-2 rounded-chip border px-3 py-2 text-small ${
                  h.bolumSayisi > 0
                    ? "cursor-not-allowed border-line bg-sunken text-ink-faint"
                    : "cursor-pointer border-line bg-surface text-ink hover:bg-canvas has-checked:border-accent-500 has-checked:bg-accent-50"
                }`}
              >
                <input
                  type="checkbox"
                  name="hedefIds"
                  value={h.id}
                  disabled={h.bolumSayisi > 0}
                  className="shrink-0"
                />
                <span className="flex-1">{h.name}</span>
                {h.bolumSayisi > 0 ? (
                  <span className="text-caption text-ink-faint">zaten dolu</span>
                ) : (
                  <span className="text-caption text-ink-faint">menü boş</span>
                )}
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            className={buttonClass({ size: "md", className: "self-start" })}
          >
            {pending ? "Kopyalanıyor…" : "Seçilenlere kopyala"}
          </button>
        </form>
      )}

      {state.error ? (
        <p className="mt-3 rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="mt-3 rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink" role="status">
          {state.saved}
        </p>
      ) : null}
    </SectionCard>
  );
}
