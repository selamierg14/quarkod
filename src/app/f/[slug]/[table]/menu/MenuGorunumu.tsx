"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui";
import {
  ALERJENLER,
  MENU_TAGS,
  OZEL_BILESENLER,
  formatPrice,
  parseAlerjenler,
  parseOzelBilesenler,
  parseTags,
  type MenuTag,
} from "@/lib/menu";
import { taslakAnahtari, taslakGuncelle, taslakOku } from "@/lib/anket-taslak";
import { foldTr } from "@/lib/text";
import { useDil } from "@/components/DilSaglayici";
import type { MetinAnahtari } from "@/lib/ceviriler";

export type MenuUrun = {
  id: string;
  name: string;
  description: string | null;
  priceKurus: number | null;
  imageUrl: string | null;
  tags: string | null;
  /** Zorunlu menü bilgileri; girilmemişse null (bkz. prisma/schema.prisma). */
  icindekiler: string | null;
  kaloriKcal: number | null;
  alerjenler: string | null;
  ozelBilesenler: string | null;
  soldOut: boolean;
};

export type MenuBolum = { id: string; name: string; items: MenuUrun[] };

type Props = {
  slug: string;
  tableNumber: string;
  bolumler: MenuBolum[];
  brandColor: string;
  /** true ise menü "değerlendirmeye ürün seç" modunda açılır. */
  secimModu: boolean;
  /** İşletmenin açık duyurusu; kapalıysa ya da boşsa null gelir. */
  duyuru?: string | null;
  /** Fiyatların en son güncellendiği tarih (gg.aa.yyyy); yoksa null. */
  fiyatTarihi?: string | null;
};

type DetayUrun = MenuUrun & { kategoriAdi: string };

/** "vegan" → "etiket.vegan"; etiket adları da çevriliyor. */
function etiketAnahtari(etiket: MenuTag): MetinAnahtari {
  return `etiket.${etiket}`;
}

export function MenuGorunumu({
  slug,
  tableNumber,
  bolumler,
  brandColor,
  secimModu,
  duyuru = null,
  fiyatTarihi = null,
}: Props) {
  const router = useRouter();
  const { t } = useDil();
  const anahtar = taslakAnahtari(slug, tableNumber);
  // Menüye anketten gelinmiş olabilir: önceki seçim işaretli açılsın ki
  // müşteri aynı ürünleri baştan bulmak zorunda kalmasın.
  const [secilen, setSecilen] = useState<string[]>(() =>
    secimModu ? taslakOku(anahtar).secilen : [],
  );
  // Seçim yalnızca tarayıcıda bilinir; sunucu render'ında işaretsiz çizip
  // hidrasyondan sonra göstermek, uyuşmazlık uyarısı almadan aynı sonucu verir.
  const bagli = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isaretli = bagli ? secilen : [];
  // Menü iki adımlı: önce büyük kapak görselli kategori kartları (İçecekler,
  // Sıcak Yemekler…), birine dokununca yalnızca o kategorinin ürünleri
  // açılıyor. null = kategori ızgarası; dolu değerde o kategorinin
  // içindeyiz. Arama/filtre açıldığında bu adım tamamen atlanıyor —
  // aranan şey hangi kategoride olduğu belli olmayan bir ürün olabilir.
  const [acikBolumId, setAcikBolumId] = useState<string | null>(null);
  const [arama, setArama] = useState("");
  const [etiketFiltresi, setEtiketFiltresi] = useState<MenuTag[]>([]);
  const [detay, setDetay] = useState<DetayUrun | null>(null);

  const anketAdresi = `/f/${slug}/${encodeURIComponent(tableNumber)}/anket`;

  // Menüdeki ürünlerde gerçekten kullanılan etiketler: hiç "vegan" ürün
  // yoksa "Vegan" filtresi göstermenin anlamı yok, boş sonuca götürür.
  const kullanilanEtiketler = useMemo(() => {
    const set = new Set<MenuTag>();
    for (const bolum of bolumler) {
      for (const urun of bolum.items) {
        for (const t of parseTags(urun.tags)) set.add(t);
      }
    }
    return (Object.keys(MENU_TAGS) as MenuTag[]).filter((t) => set.has(t));
  }, [bolumler]);

  const filtreliBolumler = useMemo(() => {
    const terim = foldTr(arama.trim());
    const filtreliMi = terim || etiketFiltresi.length > 0;
    if (!filtreliMi) return null;
    return bolumler
      .map((bolum) => ({
        ...bolum,
        items: bolum.items.filter((u) => {
          const eslesirArama =
            !terim ||
            foldTr(u.name).includes(terim) ||
            (u.description && foldTr(u.description).includes(terim));
          const eslesirEtiket =
            etiketFiltresi.length === 0 ||
            etiketFiltresi.every((t) => parseTags(u.tags).includes(t));
          return eslesirArama && eslesirEtiket;
        }),
      }))
      .filter((bolum) => bolum.items.length > 0);
  }, [arama, etiketFiltresi, bolumler]);

  const aramaSonucu = filtreliBolumler;
  const gosterilecek = filtreliBolumler ?? bolumler;
  const acikBolum = useMemo(
    () => bolumler.find((b) => b.id === acikBolumId) ?? null,
    [bolumler, acikBolumId],
  );

  function etiketDegistir(t: MenuTag) {
    setEtiketFiltresi((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function toggle(id: string) {
    setSecilen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function tamamla() {
    // Anketin geri kalanı (yıldızlar, yorum, iletişim) olduğu gibi kalsın.
    taslakGuncelle(anahtar, { secilen });
    router.push(anketAdresi);
  }

  return (
    <>
      {/* Duyuru şeridi en tepede: menüye giren herkesin gördüğü tek yer
          burası. Seçim modunda gizli — o ekranda müşterinin tek bir işi var
          ve araya kampanya sokmak onu dağıtır. */}
      {duyuru && !secimModu ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-control bg-brand px-4 py-3 text-brand-ink shadow-card">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 11v2a1 1 0 0 0 1 1h2.5L12 18V6L6.5 10H4a1 1 0 0 0-1 1Z"
            />
            <path strokeLinecap="round" d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />
          </svg>
          <p className="text-small leading-snug font-medium">{duyuru}</p>
        </div>
      ) : null}

      {/* "Deneyiminizi değerlendirin" daveti bilerek burada yok: QR
          okutulunca zaten karşılama ekranında aynı davet çıkıyor (bkz.
          KarsilamaSecenekleri). Menüde tekrarlamak hem yer kaplıyordu hem
          de müşterinin asıl işi olan ürün gezinmesini geciktiriyordu. */}
      {secimModu ? (
        <div className="mb-5 rounded-control bg-ink px-4 py-3 text-small text-white">
          <p className="font-medium">{t("menu.secimBaslik")}</p>
          <p className="mt-0.5 text-caption text-white/70">
{t("menu.secimAciklama")}
          </p>
        </div>
      ) : null}

      {/* Arama ve filtreler kaydırırken tepede asılı kalır: 60 ürünlük bir
          menüde müşteri aramak için başa dönmek zorunda kalmasın. Panelin
          kenarlarına taşırıp (-mx-4) arkasını kapatıyoruz, yoksa altından
          geçen kartlar kenarlardan görünüyordu. */}
      {bolumler.length > 0 ? (
        <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-line/70 bg-canvas/90 px-4 py-3 backdrop-blur">
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-ink-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={arama}
              onChange={(event) => setArama(event.target.value)}
              placeholder={t("menu.ara")}
              aria-label={t("menu.aramaEtiket")}
              className="w-full rounded-full border border-line bg-surface py-2.5 pe-4 ps-10 text-[16px] text-ink shadow-card outline-none placeholder:text-ink-faint focus-visible:border-line-strong sm:text-small"
            />
          </div>

          {/* Diyet/alerjen filtresi: birden fazla seçilirse hepsini karşılayan
              ürünler kalır ("vegan" + "glutensiz" = ikisi birden). */}
          {kullanilanEtiketler.length > 0 ? (
            // Sağ kenardaki solma: çipler taştığında yarım kesilen bir çip
            // "bozuk" görünüyordu; bu maske kaydırılabildiğini gösteriyor.
            <div
              role="group"
              aria-label={t("menu.filtreler")}
              className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {kullanilanEtiketler.map((etiket) => {
                const secili = etiketFiltresi.includes(etiket);
                return (
                  <button
                    key={etiket}
                    type="button"
                    aria-pressed={secili}
                    onClick={() => etiketDegistir(etiket)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-caption font-medium transition ${
                      secili
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface text-ink-soft"
                    }`}
                  >
                    {t(etiketAnahtari(etiket))}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Kaç ürün kaldığını söylemek, filtre açıkken "menü mü eksik?"
              tereddüdünü kaldırıyor. */}
          {filtreliBolumler ? (
            <p className="mt-2 text-caption text-ink-faint">
{t("menu.sonucSayisi", { adet: filtreliBolumler.reduce((n, b) => n + b.items.length, 0) })}
              <button
                type="button"
                onClick={() => {
                  setArama("");
                  setEtiketFiltresi([]);
                }}
                className="ms-2 font-medium text-ink-soft underline underline-offset-2"
              >
                {t("menu.temizle")}
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {aramaSonucu ? (
        // Arama/filtre aktifken kategori adımı tamamen atlanıyor: aranan
        // ürünün hangi kategoride olduğu müşteri için belirsiz, sonuçlar
        // hangi bölümden geldiği etiketiyle karışık gösteriliyor.
        gosterilecek.length === 0 ? (
          <p className="rounded-control border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-small text-ink-muted">
{arama ? t("menu.aramaBos", { terim: arama }) : t("menu.filtreBos")}
          </p>
        ) : (
          <div className={`flex flex-col gap-7 ${secimModu ? "pb-28" : ""}`}>
            {gosterilecek.map((bolum) => (
              <section key={bolum.id}>
                <h2 className="mb-2.5 flex items-center gap-2 px-0.5 text-overline font-semibold text-ink-muted uppercase">
                  <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brand" />
                  {bolum.name}
                </h2>
                <ul className="grid grid-cols-2 gap-3">
                  {bolum.items.map((urun) => (
                    <UrunKarti
                      key={urun.id}
                      urun={urun}
                      brandColor={brandColor}
                      secimModu={secimModu}
                      secili={isaretli.includes(urun.id)}
                      onToggle={() => toggle(urun.id)}
                      onDetay={() => setDetay({ ...urun, kategoriAdi: bolum.name })}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : acikBolum === null ? (
        // Adım 1: yalnızca kategori kartları — büyük kapak görseli + başlık.
        // Ürünler bu ekranda yok, biri seçilene kadar müşteri "İçecekler mi,
        // Ana Yemekler mi" diye tarayıp karar veriyor.
        <ul className="grid grid-cols-2 gap-3.5">
          {bolumler.map((bolum) => {
            const kapak = bolum.items.find((u) => u.imageUrl)?.imageUrl ?? null;
            return (
              <li key={bolum.id}>
                <button
                  type="button"
                  onClick={() => setAcikBolumId(bolum.id)}
                  className="group relative flex aspect-square w-full flex-col justify-end overflow-hidden rounded-card text-start shadow-card ring-1 ring-line transition active:scale-[0.98]"
                >
                  {kapak ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={kapak}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-active:scale-105"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{ backgroundColor: brandColor }}
                    />
                  )}
                  {/* Alttan koyulaşan perde: kapak fotoğrafı ne olursa olsun
                      beyaz başlık yazısı okunur kalsın. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent"
                  />
                  <div className="relative p-3.5">
                    <span className="block text-body leading-tight font-semibold text-white drop-shadow-sm">
                      {bolum.name}
                    </span>
                    <span className="mt-0.5 block text-caption text-white/80">
{t("menu.urunAdedi", { adet: bolum.items.length })}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        // Adım 2: seçilen kategorinin ürünleri. Geri butonu bilinçli
        // yukarıda ve büyük — bir kategoriye bakıp diğerine geçmek en sık
        // yapılacak hareket.
        <div className={secimModu ? "pb-28" : ""}>
          <button
            type="button"
            onClick={() => setAcikBolumId(null)}
            className="mb-4 flex items-center gap-1.5 text-small font-medium text-ink-soft"
          >
            <span aria-hidden="true" className="rtl:rotate-180">←</span>
            {t("menu.tumBolumler")}
          </button>

          <h2 className="mb-2.5 flex items-center gap-2 px-0.5 text-overline font-semibold text-ink-muted uppercase">
            <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brand" />
            {acikBolum.name}
          </h2>

          {acikBolum.items.length === 0 ? (
            <p className="rounded-control border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-small text-ink-muted">
              {t("menu.filtreBos")}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {acikBolum.items.map((urun) => (
                <UrunKarti
                  key={urun.id}
                  urun={urun}
                  brandColor={brandColor}
                  secimModu={secimModu}
                  secili={isaretli.includes(urun.id)}
                  onToggle={() => toggle(urun.id)}
                  onDetay={() => setDetay({ ...urun, kategoriAdi: acikBolum.name })}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {secimModu ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <span className="text-small text-ink-soft">
              {isaretli.length > 0
                ? t("menu.secilenSayisi", { adet: isaretli.length })
                : t("menu.secimYok")}
            </span>
            <button
              type="button"
              onClick={tamamla}
              className="ml-auto rounded-control bg-brand px-5 py-3 text-small font-semibold text-brand-ink shadow-card active:scale-[0.99]"
            >
{t(isaretli.length > 0 ? "menu.secimTamamla" : "menu.secimBos")}
            </button>
          </div>
        </div>
      ) : (
        // "Deneyiminizi değerlendirin" CTA'sı burada bilerek yok — karşılama
        // ekranında zaten var, menüde tekrarı gereksizdi.
        <p className="mt-7 text-center text-caption text-ink-faint">
          {t("menu.kdv")}
          {fiyatTarihi ? (
            <>
              <br />
              {t("menu.fiyatGuncelleme", { tarih: fiyatTarihi })}
            </>
          ) : null}
        </p>
      )}

      <UrunDetayi
        urun={detay}
        brandColor={brandColor}
        secimModu={secimModu}
        secili={detay ? isaretli.includes(detay.id) : false}
        onKapat={() => setDetay(null)}
        onToggle={() => {
          if (detay) toggle(detay.id);
          setDetay(null);
        }}
      />
    </>
  );
}

function UrunKarti({
  urun,
  brandColor,
  secimModu,
  secili,
  onToggle,
  onDetay,
}: {
  urun: MenuUrun;
  brandColor: string;
  secimModu: boolean;
  secili: boolean;
  onToggle: () => void;
  onDetay: () => void;
}) {
  const { t } = useDil();
  const etiketler = parseTags(urun.tags);
  // Tükenen ürün bugün yenmedi; puanlanacak ürünler arasına girmemeli.
  const secilebilir = secimModu && !urun.soldOut;

  const govde = (
    <>
      <div className="relative aspect-square w-full overflow-hidden bg-sunken">
        {urun.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urun.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-active:scale-105"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white/90"
            style={{ backgroundColor: brandColor }}
          >
            {urun.name.trim().charAt(0).toLocaleUpperCase("tr-TR")}
          </div>
        )}

        {urun.soldOut ? (
          <span className="absolute top-2 start-2 rounded-full bg-ink-strong/90 px-2 py-0.5 text-[11px] font-medium text-white">
            {t("menu.bugunYok")}
          </span>
        ) : null}

        {secilebilir ? (
          <span
            aria-hidden="true"
            className={`absolute top-2 end-2 flex h-7 w-7 items-center justify-center rounded-full text-small font-bold shadow-card ring-1 ${
              secili
                ? "bg-ink text-white ring-ink"
                : "bg-surface/90 text-transparent ring-line-strong"
            }`}
          >
            ✓
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 text-start">
        {/* İki sütunlu kartta ad ve fiyat aynı satıra sığmıyor; fiyatı alta
            alıyoruz ki uzun ürün adlarında kırpılmasın. */}
        <div className="flex flex-col gap-0.5">
          {/* Tükenen ürün listede kalır ama adı üstü çizili: "vardı, bugün
              yok" bilgisi ürünün hiç olmaması kadar değerli. */}
          <h3
            className={`text-body leading-tight font-medium text-ink ${
              urun.soldOut ? "line-through decoration-ink-faint" : ""
            }`}
          >
            {urun.name}
          </h3>
          {urun.priceKurus !== null ? (
            <span className="shrink-0 text-small font-medium text-ink tabular">
              {formatPrice(urun.priceKurus)}
            </span>
          ) : null}
        </div>

        {urun.description ? (
          <p className="mt-1 line-clamp-2 text-caption leading-snug text-ink-muted">
            {urun.description}
          </p>
        ) : null}

        {etiketler.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {etiketler.map((etiket) => (
              <span
                key={etiket}
                className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-soft"
              >
                {t(etiketAnahtari(etiket))}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );

  const kabuk = `group relative flex flex-col overflow-hidden rounded-card bg-surface shadow-card ring-1 transition ${
    secili ? "ring-2 ring-ink" : "ring-line"
  } ${urun.soldOut ? "opacity-55" : ""}`;

  return (
    <li className={kabuk}>
      {secilebilir ? (
        <button
          type="button"
          aria-pressed={secili}
          aria-label={t("menu.secimEkle", { ad: urun.name })}
          onClick={onToggle}
          className="flex h-full flex-col text-start"
        >
          {govde}
        </button>
      ) : (
        <button
          type="button"
          onClick={onDetay}
          aria-label={t("menu.ayrinti", { ad: urun.name })}
          className="flex h-full flex-col text-start active:opacity-90"
        >
          {govde}
        </button>
      )}

      {/* Seçim modunda kart tıklaması seçime ayrıldığı için ayrıntıya gitmek
          isteyen müşteriye ayrı, küçük bir kapı bırakıyoruz. */}
      {secilebilir ? (
        <button
          type="button"
          onClick={onDetay}
          aria-label={t("menu.ayrinti", { ad: urun.name })}
          className="absolute top-2 start-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink/55 text-white shadow-card backdrop-blur-sm"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 11v5.5M12 8v.01" />
          </svg>
        </button>
      ) : null}
    </li>
  );
}

/** Ürünün fotoğraf öne çıkan tam ayrıntı görünümü. */
function UrunDetayi({
  urun,
  brandColor,
  secimModu,
  secili,
  onKapat,
  onToggle,
}: {
  urun: DetayUrun | null;
  brandColor: string;
  secimModu: boolean;
  secili: boolean;
  onKapat: () => void;
  onToggle: () => void;
}) {
  const { t } = useDil();
  const etiketler = urun ? parseTags(urun.tags) : [];
  const secilebilir = Boolean(urun) && secimModu && !urun?.soldOut;

  return (
    <Dialog
      acik={Boolean(urun)}
      onClose={onKapat}
      baslik={urun?.name ?? ""}
      gorsel={
        urun?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urun.imageUrl} alt="" className="h-52 w-full object-cover sm:h-64" />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-40 w-full items-center justify-center text-4xl font-semibold text-white/90"
            style={{ backgroundColor: brandColor }}
          >
            {urun?.name.trim().charAt(0).toLocaleUpperCase("tr-TR")}
          </div>
        )
      }
      aksiyonlar={
        secilebilir ? (
          <button
            type="button"
            onClick={onToggle}
            className="w-full rounded-control bg-brand px-4 py-2.5 text-small font-semibold text-brand-ink shadow-card active:scale-[0.99]"
          >
{t(secili ? "menu.secimdenCikar" : "menu.secimTamamla")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onKapat}
            className="w-full rounded-control border border-line bg-surface px-4 py-2.5 text-small font-medium text-ink-soft"
          >
            {t("ortak.kapat")}
          </button>
        )
      }
    >
      {urun ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-sunken px-2.5 py-0.5 text-caption font-medium text-ink-soft">
              {urun.kategoriAdi}
            </span>
            {urun.soldOut ? (
              <span className="rounded-full bg-ink-strong px-2.5 py-0.5 text-caption font-medium text-white">
                {t("menu.bugunYok")}
              </span>
            ) : null}
            {etiketler.map((etiket) => (
              <span
                key={etiket}
                className="rounded-full bg-sunken px-2.5 py-0.5 text-caption text-ink-soft"
              >
                {t(etiketAnahtari(etiket))}
              </span>
            ))}
          </div>

          {urun.description ? (
            <p className="text-small leading-relaxed text-ink-soft">{urun.description}</p>
          ) : null}

          {urun.priceKurus !== null ? (
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-caption font-medium text-ink-muted uppercase">
                {t("menu.fiyat")}
              </span>
              <span className="text-title font-semibold text-ink tabular">
                {formatPrice(urun.priceKurus)}
              </span>
            </div>
          ) : null}

          <UrunBilgileri urun={urun} />
        </div>
      ) : null}
    </Dialog>
  );
}

/**
 * Menüde bildirilmesi zorunlu bilgiler — müşteri tarafı.
 *
 * Alerjen satırı, bilgi girilmemiş olsa bile gösteriliyor: sessizce
 * atlamak, alerjisi olan bir müşteriye "bu üründe alerjen yok" demenin
 * dolaylı hâli olurdu. "Belirtilmemiş" en azından soru sordurur.
 *
 * İçindekiler ve kalori ise girilmemişse hiç görünmüyor — onlarda eksik
 * bilgi yanıltıcı değil, yalnızca eksik.
 */
function UrunBilgileri({ urun }: { urun: DetayUrun }) {
  const alerjenler = parseAlerjenler(urun.alerjenler);
  const ozel = parseOzelBilesenler(urun.ozelBilesenler);

  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-3">
      {urun.icindekiler ? (
        <div>
          <p className="text-caption font-medium text-ink-muted uppercase">
            Temel bileşenler
          </p>
          <p className="mt-0.5 text-small leading-relaxed text-ink-soft">
            {urun.icindekiler}
          </p>
        </div>
      ) : null}

      {urun.kaloriKcal !== null ? (
        <div className="flex items-baseline justify-between">
          <span className="text-caption font-medium text-ink-muted uppercase">
            Enerji
          </span>
          <span className="text-small font-medium text-ink tabular">
            {urun.kaloriKcal} kcal
            <span className="ml-1 text-caption font-normal text-ink-faint">
              /porsiyon
            </span>
          </span>
        </div>
      ) : null}

      <div>
        <p className="text-caption font-medium text-ink-muted uppercase">
          Alerjen içerikler
        </p>
        {alerjenler.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {alerjenler.map((a) => (
              <span
                key={a}
                className="rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-medium text-warning-ink"
              >
                {ALERJENLER[a]}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-0.5 text-caption text-ink-faint">
            Belirtilmemiş — alerjiniz varsa lütfen personele danışın.
          </p>
        )}
      </div>

      {ozel.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {ozel.map((o) => (
            <span
              key={o}
              className="rounded-full bg-ink-strong px-2.5 py-0.5 text-caption font-medium text-white"
            >
              {OZEL_BILESENLER[o]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
