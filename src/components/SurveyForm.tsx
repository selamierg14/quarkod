"use client";

import { useState, useTransition } from "react";
import { StarRating } from "./StarRating";
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
  const [overall, setOverall] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  // Müşterinin seçtiği ürünler ve verdiği puanlar. Seçim ile puan ayrı:
  // ürünü seçip puan vermeden bırakan olabiliyor, o kaydı yazmıyoruz.
  const [secilenUrunler, setSecilenUrunler] = useState<string[]>([]);
  const [urunPuanlari, setUrunPuanlari] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [contactType, setContactType] = useState<ContactType>("telefon");
  const [consent, setConsent] = useState(false);
  // Ticari ileti onayı KVKK rızasından ayrı tutulur: ayrı kutu, ayrı metin,
  // ayrı kayıt. Aynı kutuda toplamak iki farklı amacı tek onaya bindirmek
  // olurdu ve verilen izin hukuken savunulamazdı.
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "form" });
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
        <h1 className="text-2xl font-semibold text-slate-900">Çok teşekkürler! 🎉</h1>
        <p className="mt-3 text-slate-600">
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
          className="mt-6 block w-full rounded-xl px-5 py-4 text-center text-base font-semibold text-white shadow-sm active:scale-[0.99]"
          style={{ backgroundColor: brandColor }}
        >
          Google&apos;da yorum bırak
        </a>
        <p className="mt-4 text-center text-sm text-slate-400">
          İsterseniz bu adımı atlayabilirsiniz.
        </p>
      </ThanksShell>
    );
  }

  if (screen.kind === "thanks-internal") {
    return (
      <ThanksShell brandColor={brandColor} businessName={businessName} logoUrl={logoUrl}>
        <h1 className="text-2xl font-semibold text-slate-900">
          Geri bildiriminiz için teşekkürler
        </h1>
        <p className="mt-3 text-slate-600">
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
  const basladi = overall > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-32">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-center text-base font-medium text-slate-800">
          Deneyiminizi nasıl buldunuz?
        </p>
        <div className="mt-5">
          <StarRating name="overall" value={overall} onChange={setOverall} size="lg" />
        </div>
        {!basladi ? (
          <p className="mt-4 text-center text-xs text-slate-400">
            Puan vermek için bir yıldıza dokunun
          </p>
        ) : null}
      </section>

      {!basladi ? (
        <p className="text-center text-xs leading-relaxed text-slate-400">
          Görüşünüz doğrudan {businessName} sorumlusuna iletilir.
          <br />
          Ad soyad sorulmaz, isim vermek zorunda değilsiniz.
        </p>
      ) : null}

      {overall > 0 && categories.length > 0 ? (
        <section className="mm-rise rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Detaylar
          </h2>
          <p className="mt-1 text-sm text-slate-400">İstediğinizi boş bırakabilirsiniz.</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-[15px] text-slate-700">{category.name}</span>
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

      {overall > 0 && menuItems.length > 0 ? (
        <UrunPuanlama
          urunler={menuItems}
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

      {overall > 0 ? (
        <section className="mm-rise rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label
            htmlFor="comment"
            className="text-sm font-semibold tracking-wide text-slate-500 uppercase"
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
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 p-3 text-[16px] text-slate-800 outline-none focus:border-slate-400"
          />

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-[15px] text-slate-700">
              Size dönmemizi ister misiniz?{" "}
              <span className="text-slate-400">(isteğe bağlı)</span>
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
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
                    rounded-lg px-4 py-2 text-sm transition
                    ${
                      contactType === type
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600"
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
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-[16px] text-slate-800 outline-none focus:border-slate-400"
            />

            {/* Kutu her zaman görünür: müşteri iletişim bilgisi yazmadan da
                verilerine ne olduğunu görebilmeli. Zorunluluk yalnızca iletişim
                bilgisi bırakıldığında doğar. */}
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
              />
              <span>
                {consentSummary(businessName)}
                {contactInfo.trim() ? (
                  <span className="ml-1 text-red-500" aria-hidden="true">
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
              <label className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
                />
                <span>
                  {marketingConsentText(businessName, contactType)}
                  <span className="mt-0.5 block text-xs text-slate-400">
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
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {basladi ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl px-5 py-4 text-base font-semibold text-white shadow-sm transition disabled:opacity-60 active:scale-[0.99]"
              style={{ backgroundColor: brandColor }}
            >
              {pending ? "Gönderiliyor…" : "Gönder"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
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
    <div className="mm-rise rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
      {/* Logo varsa onu göster, köşesine küçük bir onay rozeti bindir; yoksa
          sade bir onay dairesi. */}
      <div className="relative mx-auto h-16 w-16">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200"
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
          className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full text-sm text-white ring-2 ring-white"
          style={{ backgroundColor: brandColor }}
          aria-hidden="true"
        >
          ✓
        </span>
      </div>

      <div className="mt-5">{children}</div>
      <p className="mt-8 text-xs text-slate-400">{businessName}</p>
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
  secilen,
  puanlar,
  onToggle,
  onPuan,
}: {
  urunler: { id: string; name: string; kategori: string }[];
  secilen: string[];
  puanlar: Record<string, number>;
  onToggle: (id: string) => void;
  onPuan: (id: string, puan: number) => void;
}) {
  // Kategori sırası menüdeki sırayla aynı kalsın diye Map kullanılıyor.
  const gruplar = new Map<string, typeof urunler>();
  for (const urun of urunler) {
    const mevcut = gruplar.get(urun.kategori);
    if (mevcut) mevcut.push(urun);
    else gruplar.set(urun.kategori, [urun]);
  }

  const secilenUrunler = secilen
    .map((id) => urunler.find((u) => u.id === id))
    .filter((u): u is (typeof urunler)[number] => Boolean(u));

  return (
    <section className="mm-rise rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Ne aldınız?
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Seçtiklerinizi ayrı ayrı puanlayabilirsiniz. İsteğe bağlı.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {[...gruplar.entries()].map(([kategori, liste]) => (
          <div key={kategori}>
            <p className="mb-1.5 text-xs text-slate-400">{kategori}</p>
            <div className="flex flex-wrap gap-1.5">
              {liste.map((urun) => {
                const secili = secilen.includes(urun.id);
                return (
                  <button
                    key={urun.id}
                    type="button"
                    aria-pressed={secili}
                    onClick={() => onToggle(urun.id)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      secili
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

      {secilenUrunler.length > 0 ? (
        <ul className="mt-5 divide-y divide-slate-100 border-t border-slate-100 pt-1">
          {secilenUrunler.map((urun) => (
            <li key={urun.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[15px] text-slate-700">
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
