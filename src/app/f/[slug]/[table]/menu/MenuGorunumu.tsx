"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog } from "@/components/ui";
import { MENU_TAGS, formatPrice, parseTags, type MenuTag } from "@/lib/menu";
import { taslakAnahtari, taslakGuncelle, taslakOku } from "@/lib/anket-taslak";
import { foldTr } from "@/lib/text";

export type MenuUrun = {
  id: string;
  name: string;
  description: string | null;
  priceKurus: number | null;
  imageUrl: string | null;
  tags: string | null;
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
};

type DetayUrun = MenuUrun & { kategoriAdi: string };

export function MenuGorunumu({
  slug,
  tableNumber,
  bolumler,
  brandColor,
  secimModu,
  duyuru = null,
}: Props) {
  const router = useRouter();
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
  // Kategori hapları tasarımda pasif bağlantı değil, seçili durumu olan
  // düğmeler: müşteri hangi bölümde olduğunu haptan görüyor.
  const [aktifBolum, setAktifBolum] = useState<string>(bolumler[0]?.id ?? "");
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

      {secimModu ? (
        <div className="mb-5 rounded-control bg-ink px-4 py-3 text-small text-white">
          <p className="font-medium">Ne aldınız?</p>
          <p className="mt-0.5 text-caption text-white/70">
            Yediklerinize dokunup işaretleyin, sonra aşağıdan değerlendirmeye
            ekleyin.
          </p>
        </div>
      ) : (
        <Link
          href={anketAdresi}
          className="mb-5 flex items-center justify-between gap-3 rounded-control border border-line bg-surface px-4 py-3 text-small shadow-card transition hover:border-line-strong"
        >
          <span>
            <span className="font-medium text-ink">Deneyiminizi değerlendirin</span>
            <span className="block text-caption text-ink-muted">
              Yediklerinizi tek tek puanlayabilirsiniz
            </span>
          </span>
          <span aria-hidden="true" className="text-ink-faint">
            →
          </span>
        </Link>
      )}

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
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-faint"
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
              placeholder="Menüde ara…"
              aria-label="Menüde ara"
              className="w-full rounded-full border border-line bg-surface py-2.5 pr-4 pl-10 text-[16px] text-ink shadow-card outline-none placeholder:text-ink-faint focus-visible:border-line-strong sm:text-small"
            />
          </div>

          {/* Diyet/alerjen filtresi: birden fazla seçilirse hepsini karşılayan
              ürünler kalır ("vegan" + "glutensiz" = ikisi birden). */}
          {kullanilanEtiketler.length > 0 ? (
            <div
              role="group"
              aria-label="Diyet ve alerjen filtreleri"
              className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {kullanilanEtiketler.map((t) => {
                const secili = etiketFiltresi.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={secili}
                    onClick={() => etiketDegistir(t)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-caption font-medium transition ${
                      secili
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface text-ink-soft"
                    }`}
                  >
                    {MENU_TAGS[t]}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Kaç ürün kaldığını söylemek, filtre açıkken "menü mü eksik?"
              tereddüdünü kaldırıyor. */}
          {filtreliBolumler ? (
            <p className="mt-2 text-caption text-ink-faint">
              {filtreliBolumler.reduce((t, b) => t + b.items.length, 0)} ürün
              bulundu
              <button
                type="button"
                onClick={() => {
                  setArama("");
                  setEtiketFiltresi([]);
                }}
                className="ml-2 font-medium text-ink-soft underline underline-offset-2"
              >
                Temizle
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Bölümler arası hızlı geçiş: küçük fotoğraflı hap, uzun menüde
          kaydırmayı kısaltıyor ve nerede olduğumuzu görsel olarak gösteriyor. */}
      {!aramaSonucu && bolumler.length > 1 ? (
        <nav
          aria-label="Menü bölümleri"
          className="-mx-1 mb-5 flex gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {bolumler.map((k) => {
            const aktif = bagli && k.id === aktifBolum;
            const kapak = k.items.find((u) => u.imageUrl)?.imageUrl ?? null;
            return (
              <button
                key={k.id}
                type="button"
                aria-current={aktif ? "true" : undefined}
                onClick={() => {
                  setAktifBolum(k.id);
                  document
                    .getElementById(`bolum-${k.id}`)
                    ?.scrollIntoView({ block: "start", behavior: "smooth" });
                }}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-card ring-2 transition ${
                    aktif ? "ring-brand" : "ring-transparent"
                  }`}
                >
                  {kapak ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={kapak} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center bg-brand text-heading font-semibold text-brand-ink"
                      aria-hidden="true"
                    >
                      {k.name.trim().charAt(0).toLocaleUpperCase("tr-TR")}
                    </span>
                  )}
                </span>
                <span
                  className={`line-clamp-1 text-center text-[11px] leading-tight font-medium ${
                    aktif ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {k.name}
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}

      {gosterilecek.length === 0 ? (
        <p className="rounded-control border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-small text-ink-muted">
          {arama
            ? <>&quot;{arama}&quot; için bir sonuç bulunamadı.</>
            : "Seçili filtrelere uyan ürün yok."}
        </p>
      ) : (
        <div className={`flex flex-col gap-7 ${secimModu ? "pb-28" : ""}`}>
          {gosterilecek.map((bolum) => (
            <section key={bolum.id} id={`bolum-${bolum.id}`} className="scroll-mt-4">
              <h2 className="mb-2.5 flex items-center gap-2 px-0.5 text-overline font-semibold text-ink-muted uppercase">
                <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brand" />
                {bolum.name}
              </h2>

              {/* Fotoğraf üstte, iki sütun: menüde önce yemeğin kendisi görünsün,
                  yazı sonra gelsin. Tek sütunlu liste fotoğrafı küçük bir
                  küçük resme indiriyordu. */}
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
      )}

      {secimModu ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <span className="text-small text-ink-soft">
              {isaretli.length > 0 ? `${isaretli.length} ürün seçildi` : "Henüz seçim yok"}
            </span>
            <button
              type="button"
              onClick={tamamla}
              className="ml-auto rounded-control bg-brand px-5 py-3 text-small font-semibold text-brand-ink shadow-card active:scale-[0.99]"
            >
              {isaretli.length > 0 ? "Değerlendirmeye ekle" : "Değerlendirmeye dön"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <Link
            href={anketAdresi}
            className="mt-7 flex w-full items-center justify-center rounded-control bg-brand px-4 py-3.5 font-semibold text-brand-ink shadow-card active:scale-[0.99]"
          >
            Deneyiminizi değerlendirin
          </Link>
          <p className="mt-3 text-center text-caption text-ink-faint">
            Fiyatlara KDV dahildir. Menü içeriği işletme tarafından güncellenir.
          </p>
        </>
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
          <span className="absolute top-2 left-2 rounded-full bg-ink-strong/90 px-2 py-0.5 text-[11px] font-medium text-white">
            Bugün yok
          </span>
        ) : null}

        {secilebilir ? (
          <span
            aria-hidden="true"
            className={`absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-small font-bold shadow-card ring-1 ${
              secili
                ? "bg-ink text-white ring-ink"
                : "bg-surface/90 text-transparent ring-line-strong"
            }`}
          >
            ✓
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 text-left">
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
            {etiketler.map((t: MenuTag) => (
              <span
                key={t}
                className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-soft"
              >
                {MENU_TAGS[t]}
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
          aria-label={`${urun.name} — değerlendirmeye ekle`}
          onClick={onToggle}
          className="flex h-full flex-col text-left"
        >
          {govde}
        </button>
      ) : (
        <button
          type="button"
          onClick={onDetay}
          aria-label={`${urun.name} — ayrıntıları gör`}
          className="flex h-full flex-col text-left active:opacity-90"
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
          aria-label={`${urun.name} — ayrıntıları gör`}
          className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink/55 text-white shadow-card backdrop-blur-sm"
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
            {secili ? "Seçimden çıkar" : "Değerlendirmeye ekle"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onKapat}
            className="w-full rounded-control border border-line bg-surface px-4 py-2.5 text-small font-medium text-ink-soft"
          >
            Kapat
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
                Bugün yok
              </span>
            ) : null}
            {etiketler.map((t) => (
              <span
                key={t}
                className="rounded-full bg-sunken px-2.5 py-0.5 text-caption text-ink-soft"
              >
                {MENU_TAGS[t]}
              </span>
            ))}
          </div>

          {urun.description ? (
            <p className="text-small leading-relaxed text-ink-soft">{urun.description}</p>
          ) : null}

          {urun.priceKurus !== null ? (
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-caption font-medium text-ink-muted uppercase">Fiyat</span>
              <span className="text-title font-semibold text-ink tabular">
                {formatPrice(urun.priceKurus)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
