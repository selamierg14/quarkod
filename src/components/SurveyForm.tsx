"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { StarRating } from "./StarRating";
import { ImageUpload } from "./ImageUpload";
import { taslakAnahtari, taslakOku, taslakSil, taslakYaz } from "@/lib/anket-taslak";
import { KvkkNotice } from "./KvkkNotice";
import { CONTACT_TYPES, consentSummary, type ContactType } from "@/lib/kvkk";
import { marketingConsentText } from "@/lib/iys";
import { markGoogleClick, submitFeedback } from "@/app/f/[slug]/[table]/actions";

type Props = {
  slug: string;
  businessName: string;
  brandColor: string;
  logoUrl: string | null;
  tableNumber: string;
  tableLabel: string;
  categories: { id: string; name: string }[];
  /** QR menüdeki ürünler. Menü modülü kapalıysa boş gelir ve adım hiç çıkmaz. */
  menuItems?: { id: string; name: string; kategori: string }[];
};

type Screen =
  | { kind: "form" }
  | { kind: "thanks-google"; url: string; feedbackId: string }
  | { kind: "thanks-internal"; rating: number };

export function SurveyForm({
  slug,
  businessName,
  brandColor,
  logoUrl,
  tableNumber,
  tableLabel,
  categories,
  menuItems = [],
}: Props) {
  // Müşteri fotoğraflı menüye gidip geri dönebiliyor; o gidiş gelişte
  // verdiği yıldızlar, yorumu ve iletişim bilgisi kaybolmasın diye anketin
  // tamamı taslak olarak tarayıcıda tutuluyor.
  const taslakKaydi = taslakAnahtari(slug, tableNumber);
  const [taslak] = useState(() => taslakOku(taslakKaydi));

  const [overall, setOverall] = useState(taslak.overall);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>(
    taslak.kategoriler,
  );
  // Müşterinin seçtiği ürünler ve verdiği puanlar. Seçim ile puan ayrı:
  // ürünü seçip puan vermeden bırakan olabiliyor, o kaydı yazmıyoruz.
  const [secilenUrunler, setSecilenUrunler] = useState<string[]>(taslak.secilen);
  const [urunPuanlari, setUrunPuanlari] = useState<Record<string, number>>(
    taslak.urunPuanlari,
  );
  const [comment, setComment] = useState(taslak.yorum);
  // Fotoğraf taslağa yazılmıyor: 400 KB'lik data URI sessionStorage kotasını
  // doldurup diğer cevapların kaydını da bozabilir.
  const [photo, setPhoto] = useState("");
  const [contactInfo, setContactInfo] = useState(taslak.iletisim);
  const [contactType, setContactType] = useState<ContactType>(
    taslak.iletisimTipi in CONTACT_TYPES
      ? (taslak.iletisimTipi as ContactType)
      : "telefon",
  );
  const [consent, setConsent] = useState(taslak.riza);
  // Ticari ileti onayı KVKK rızasından ayrı tutulur: ayrı kutu, ayrı metin,
  // ayrı kayıt. Aynı kutuda toplamak iki farklı amacı tek onaya bindirmek
  // olurdu ve verilen izin hukuken savunulamazdı.
  const [marketing, setMarketing] = useState(taslak.ticari);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "form" });

  // Her değişiklikte taslağı tazeliyoruz; müşteri hangi adımda menüye
  // giderse gitsin dönüşte aynı yerden devam eder.
  useEffect(() => {
    taslakYaz(taslakKaydi, {
      overall,
      kategoriler: categoryRatings,
      secilen: secilenUrunler,
      urunPuanlari,
      yorum: comment,
      iletisim: contactInfo,
      iletisimTipi: contactType,
      riza: consent,
      ticari: marketing,
    });
  }, [
    taslakKaydi,
    overall,
    categoryRatings,
    secilenUrunler,
    urunPuanlari,
    comment,
    contactInfo,
    contactType,
    consent,
    marketing,
  ]);

  // Taslak yalnızca tarayıcıda var; sunucu render'ı boş formu çizer.
  // Hidrasyondan sonra taslağı göstermek, uyuşmazlık uyarısı almadan aynı
  // sonucu verir. Puan verilene kadar formun gerisi zaten görünmediği için
  // tek bir kapı (overall) yetiyor.
  const bagli = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const gorunenOverall = bagli ? overall : 0;

  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (overall === 0) {
      setError("Lütfen önce genel memnuniyet puanınızı verin.");
      return;
    }
    if (contactInfo.trim() && !consent) {
      setError("İletişim bilgisi bırakmak için aydınlatma metnini onaylayın.");
      return;
    }

    startTransition(async () => {
      const result = await submitFeedback({
        slug,
        tableNumber,
        overallRating: overall,
        categoryRatings,
        comment,
        photo,
        contactInfo,
        contactType: contactInfo.trim() ? contactType : "",
        consentGiven: consent,
        marketingConsent: marketing,
        // Yalnızca puanlanmış ürünler gider; seçilip boş bırakılan ürün
        // "0 puan" değildir, veri yokluğudur.
        itemRatings: secilenUrunler
          .filter((id) => (urunPuanlari[id] ?? 0) > 0)
          .map((id) => ({ menuItemId: id, rating: urunPuanlari[id] })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Anket gönderildi; taslak durmasın, aynı masadaki bir sonraki
      // müşteriye eski cevaplar açılmasın.
      taslakSil(taslakKaydi);

      if (result.redirectToGoogle && result.googleReviewUrl) {
        setScreen({
          kind: "thanks-google",
          url: result.googleReviewUrl,
          feedbackId: result.feedbackId,
        });
      } else {
        setScreen({ kind: "thanks-internal", rating: overall });
      }
    });
  }

  if (screen.kind === "thanks-google") {
    return (
      <ThanksShell brandColor={brandColor} businessName={businessName} logoUrl={logoUrl}>
        <h1 className="text-2xl font-semibold text-ink">Çok teşekkürler! 🎉</h1>
        <p className="mt-3 text-ink-soft">
          Beğendiğinize sevindik. Bu deneyimi Google&apos;da da paylaşırsanız bizim
          için çok değerli olur — 30 saniyenizi almaz.
        </p>
        <a
          href={screen.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            // Dönüşüm ölçümü; başarısız olsa da bağlantı normal şekilde açılır.
            void markGoogleClick(screen.feedbackId);
          }}
          className="mt-6 block w-full rounded-control px-5 py-4 text-center text-base font-semibold text-white shadow-card active:scale-[0.99]"
          style={{ backgroundColor: brandColor }}
        >
          Google&apos;da yorum bırak
        </a>
        <p className="mt-4 text-center text-small text-ink-faint">
          İsterseniz bu adımı atlayabilirsiniz.
        </p>
      </ThanksShell>
    );
  }

  if (screen.kind === "thanks-internal") {
    return (
      <ThanksShell brandColor={brandColor} businessName={businessName} logoUrl={logoUrl}>
        <h1 className="text-2xl font-semibold text-ink">
          Geri bildiriminiz için teşekkürler
        </h1>
        <p className="mt-3 text-ink-soft">
          Yazdıklarınız doğrudan işletme sorumlusuna iletildi. Eksiğimizi
          söylediğiniz için teşekkür ederiz — en kısa sürede ilgileneceğiz.
        </p>
      </ThanksShell>
    );
  }

  // Puan verilmeden önce ekranda tek bir iş var: yıldıza dokunmak. O anda
  // kartı dikey ortalayıp alttaki devre dışı "Gönder" bloğunu hiç göstermiyoruz
  // — yoksa ekranın yarısı ölü boşluk, dikkat de işe yaramayan gri bir düğmede
  // kalıyordu.
  const basladi = gorunenOverall > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-32">
      <section className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
        <p className="text-center text-base font-medium text-ink-strong">
          Deneyiminizi nasıl buldunuz?
        </p>
        <div className="mt-5">
          <StarRating name="overall" value={gorunenOverall} onChange={setOverall} size="lg" />
        </div>
        {!basladi ? (
          <p className="mt-4 text-center text-caption text-ink-faint">
            Puan vermek için bir yıldıza dokunun
          </p>
        ) : null}
      </section>

      {!basladi ? (
        <p className="text-center text-caption leading-relaxed text-ink-faint">
          Görüşünüz doğrudan {businessName} sorumlusuna iletilir.
          <br />
          Ad soyad sorulmaz, isim vermek zorunda değilsiniz.
        </p>
      ) : null}

      {basladi && categories.length > 0 ? (
        <section className="mm-rise rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
          <h2 className="text-small font-semibold tracking-wide text-ink-muted uppercase">
            Detaylar
          </h2>
          <p className="mt-1 text-small text-ink-faint">İstediğinizi boş bırakabilirsiniz.</p>
          <ul className="mt-4 divide-y divide-line">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-body text-ink-soft">{category.name}</span>
                <StarRating
                  name={`kategori-${category.id}`}
                  ariaLabel={`${category.name} puanı`}
                  value={categoryRatings[category.name] ?? 0}
                  onChange={(value) =>
                    setCategoryRatings((prev) => ({ ...prev, [category.name]: value }))
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {basladi && menuItems.length > 0 ? (
        <UrunPuanlama
          urunler={menuItems}
          menuAdresi={`/f/${slug}/${encodeURIComponent(tableNumber)}/menu?sec=1`}
          secilen={secilenUrunler}
          puanlar={urunPuanlari}
          onToggle={(id) =>
            setSecilenUrunler((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }
          onPuan={(id, puan) => setUrunPuanlari((prev) => ({ ...prev, [id]: puan }))}
        />
      ) : null}

      {basladi ? (
        <section className="mm-rise rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
          <label
            htmlFor="comment"
            className="text-small font-semibold tracking-wide text-ink-muted uppercase"
          >
            Eklemek istediğiniz bir şey var mı?
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={
              overall <= 3
                ? "Ne iyi gitmedi? Yazarsanız düzeltebiliriz."
                : "Beğendiğiniz veya eksik bulduğunuz şeyler..."
            }
            className="mt-3 w-full resize-none rounded-control border border-line p-3 text-[16px] text-ink-strong outline-none focus:border-line-strong"
          />

          {/* Kanıt fotoğrafı: "çorba böyle geldi" karesi, şikayeti
              tartışılmaz kılıyor ve işletmenin işini kolaylaştırıyor. */}
          <div className="mt-4">
            <ImageUpload
              name="anket-foto"
              kind="anket"
              label="Fotoğraf eklemek ister misiniz? (isteğe bağlı)"
              hint="Yalnızca işletme sorumlusu görür."
              initial={null}
              brandColor={brandColor}
              onChange={setPhoto}
            />
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-body text-ink-soft">
              Size dönmemizi ister misiniz?{" "}
              <span className="text-ink-faint">(isteğe bağlı)</span>
            </p>
            <p className="mt-0.5 text-small text-ink-muted">
              {overall <= 3
                ? "Bırakırsanız işletme sorumlusu sizinle bizzat ilgilenir."
                : "Sadece bu geri bildiriminiz için ararız."}
            </p>

            <div
              role="radiogroup"
              aria-label="İletişim kanalı"
              className="mt-3 flex gap-2"
            >
              {(Object.keys(CONTACT_TYPES) as ContactType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={contactType === type}
                  onClick={() => setContactType(type)}
                  className={`
                    rounded-chip px-4 py-2 text-small transition
                    ${
                      contactType === type
                        ? "bg-ink text-white"
                        : "bg-sunken text-ink-soft"
                    }
                  `}
                >
                  {CONTACT_TYPES[type]}
                </button>
              ))}
            </div>

            <input
              id="contact"
              type={contactType === "eposta" ? "email" : "tel"}
              inputMode={contactType === "eposta" ? "email" : "tel"}
              autoComplete={contactType === "eposta" ? "email" : "tel"}
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
              placeholder={
                contactType === "eposta" ? "ornek@eposta.com" : "05XX XXX XX XX"
              }
              aria-label={CONTACT_TYPES[contactType]}
              className="mt-2 w-full rounded-control border border-line p-3 text-[16px] text-ink-strong outline-none focus:border-line-strong"
            />

            {/* Kutu her zaman görünür: müşteri iletişim bilgisi yazmadan da
                verilerine ne olduğunu görebilmeli. Zorunluluk yalnızca iletişim
                bilgisi bırakıldığında doğar. */}
            <label className="mt-4 flex items-start gap-3 text-small text-ink-soft">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-line-strong"
              />
              <span>
                {consentSummary(businessName)}
                {contactInfo.trim() ? (
                  <span className="ml-1 text-danger" aria-hidden="true">
                    *
                  </span>
                ) : null}
              </span>
            </label>
            <KvkkNotice businessName={businessName} />

            {/* Ticari ileti izni ayrı bir kutudur ve yalnızca iletişim bilgisi
                girildiğinde sorulur. KVKK rızasıyla aynı kutuya koymak, iki
                farklı amacı tek onaya bindirmek olurdu; o izin İYS'de
                savunulamazdı. */}
            {contactInfo.trim() ? (
              <label className="mt-4 flex items-start gap-3 border-t border-line pt-4 text-small text-ink-soft">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-line-strong"
                />
                <span>
                  {marketingConsentText(businessName, contactType)}
                  <span className="mt-0.5 block text-caption text-ink-faint">
                    İsteğe bağlı. İşaretlemeseniz de geri bildiriminiz kaydedilir.{" "}
                    {/* Mevzuat, onay kutusunun yakınında aydınlatma metnine
                        erişim ister; yukarıdaki açılır metne yönlendiriyoruz. */}
                    <button
                      type="button"
                      onClick={() => {
                        const d = document.querySelector("details");
                        if (d) {
                          (d as HTMLDetailsElement).open = true;
                          d.scrollIntoView({ block: "center", behavior: "smooth" });
                        }
                      }}
                      className="underline underline-offset-2"
                    >
                      Aydınlatma metnini oku
                    </button>
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-control bg-danger-soft px-4 py-3 text-small text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}

      {basladi ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-control px-5 py-4 text-base font-semibold text-white shadow-card transition disabled:opacity-60 active:scale-[0.99]"
              style={{ backgroundColor: brandColor }}
            >
              {pending ? "Gönderiliyor…" : "Gönder"}
            </button>
            <p className="mt-2 text-center text-caption text-ink-faint">
              {tableLabel} · {businessName}
            </p>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ThanksShell({
  children,
  brandColor,
  businessName,
  logoUrl,
}: {
  children: React.ReactNode;
  brandColor: string;
  businessName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="mm-rise rounded-card bg-surface p-7 text-center shadow-card ring-1 ring-line">
      {/* Logo varsa onu göster, köşesine küçük bir onay rozeti bindir; yoksa
          sade bir onay dairesi. */}
      <div className="relative mx-auto h-16 w-16">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-1 ring-line"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: brandColor }}
            aria-hidden="true"
          >
            {businessName.trim().charAt(0).toLocaleUpperCase("tr")}
          </div>
        )}
        <span
          className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full text-small text-white ring-2 ring-white"
          style={{ backgroundColor: brandColor }}
          aria-hidden="true"
        >
          ✓
        </span>
      </div>

      <div className="mt-5">{children}</div>
      <p className="mt-8 text-caption text-ink-faint">{businessName}</p>
    </div>
  );
}

/**
 * "Ne aldınız?" adımı.
 *
 * Önce ürün seçilir, sonra seçilen ürünler puanlanır. Tüm menüyü yıldız
 * satırlarıyla göstermek anketi okunamaz hale getirirdi: 60 ürünlü bir
 * menüde kimse aşağı inmez. Seçim rozetleri tek dokunuşluk, puanlama ise
 * yalnızca seçilenler için açılıyor.
 */
function UrunPuanlama({
  urunler,
  menuAdresi,
  secilen,
  puanlar,
  onToggle,
  onPuan,
}: {
  urunler: { id: string; name: string; kategori: string }[];
  menuAdresi: string;
  secilen: string[];
  puanlar: Record<string, number>;
  onToggle: (id: string) => void;
  onPuan: (id: string, puan: number) => void;
}) {
  const [arama, setArama] = useState("");
  const [hepsi, setHepsi] = useState(false);

  const anahtar = arama.trim().toLocaleLowerCase("tr-TR");
  const eslesen = anahtar
    ? urunler.filter((u) => u.name.toLocaleLowerCase("tr-TR").includes(anahtar))
    : urunler;

  // Arama yapılmadığında uzun menü ekranı boğuyor; yine de hiçbir ürün
  // erişilemez kalmasın diye "tümünü göster" ile hepsi açılabiliyor.
  const KISA_LISTE = 8;
  const kisaltildi = !anahtar && !hepsi && eslesen.length > KISA_LISTE;
  const gosterilen = kisaltildi
    ? eslesen.filter((u, i) => i < KISA_LISTE || secilen.includes(u.id))
    : eslesen;

  // Kategori sırası menüdeki sırayla aynı kalsın diye Map kullanılıyor.
  const gruplar = new Map<string, typeof urunler>();
  for (const urun of gosterilen) {
    const mevcut = gruplar.get(urun.kategori);
    if (mevcut) mevcut.push(urun);
    else gruplar.set(urun.kategori, [urun]);
  }

  const secilenUrunler = secilen
    .map((id) => urunler.find((u) => u.id === id))
    .filter((u): u is (typeof urunler)[number] => Boolean(u));

  return (
    <section className="mm-rise rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
      <h2 className="text-small font-semibold tracking-wide text-ink-muted uppercase">
        Ne aldınız?
      </h2>
      <p className="mt-1 text-small text-ink-faint">
        Seçtiklerinizi ayrı ayrı puanlayabilirsiniz. İsteğe bağlı.
      </p>

      {/* Fotoğraflı menü, isim listesinden çok daha kolay hatırlatıyor:
          ürünü adından bulamayan müşteri menüye gidip görselden işaretler. */}
      <Link
        href={menuAdresi}
        className="mt-4 flex items-center justify-between gap-3 rounded-control bg-canvas px-4 py-3 text-small ring-1 ring-line"
      >
        <span>
          <span className="font-medium text-ink-strong">Menüden seç</span>
          <span className="block text-caption text-ink-muted">
            Fotoğraflı menüden işaretleyip buraya dönün
          </span>
        </span>
        <span aria-hidden="true" className="text-ink-faint">
          →
        </span>
      </Link>

      {urunler.length > KISA_LISTE ? (
        <input
          type="search"
          value={arama}
          onChange={(event) => setArama(event.target.value)}
          placeholder="Ürün ara..."
          aria-label="Ürün ara"
          className="mt-3 w-full rounded-control border border-line p-3 text-[16px] text-ink-strong outline-none focus:border-line-strong"
        />
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {[...gruplar.entries()].map(([kategori, liste]) => (
          <div key={kategori}>
            <p className="mb-1.5 text-caption text-ink-faint">{kategori}</p>
            <div className="flex flex-wrap gap-1.5">
              {liste.map((urun) => {
                const secili = secilen.includes(urun.id);
                return (
                  <button
                    key={urun.id}
                    type="button"
                    aria-pressed={secili}
                    onClick={() => onToggle(urun.id)}
                    className={`rounded-full px-3 py-1.5 text-small transition ${
                      secili
                        ? "bg-ink text-white"
                        : "bg-sunken text-ink-soft hover:bg-line"
                    }`}
                  >
                    {secili ? "✓ " : ""}
                    {urun.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {gosterilen.length === 0 ? (
        <p className="mt-3 text-small text-ink-faint">
          Bu isimde ürün yok. Menüden seçerek de işaretleyebilirsiniz.
        </p>
      ) : null}

      {kisaltildi ? (
        <button
          type="button"
          onClick={() => setHepsi(true)}
          className="mt-3 text-small font-medium text-ink-soft underline underline-offset-2"
        >
          Tüm ürünleri göster ({urunler.length})
        </button>
      ) : null}

      {secilenUrunler.length > 0 ? (
        <ul className="mt-5 divide-y divide-line border-t border-line pt-1">
          {secilenUrunler.map((urun) => (
            <li key={urun.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-body text-ink-soft">
                {urun.name}
              </span>
              <StarRating
                name={`urun-${urun.id}`}
                ariaLabel={`${urun.name} puanı`}
                value={puanlar[urun.id] ?? 0}
                onChange={(value) => onPuan(urun.id, value)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
