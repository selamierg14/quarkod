"use client";

import { useState, useTransition } from "react";
import { StarRating } from "./StarRating";
import { KvkkNotice } from "./KvkkNotice";
import { CONTACT_TYPES, consentSummary, type ContactType } from "@/lib/kvkk";
import { markGoogleClick, submitFeedback } from "@/app/f/[slug]/[table]/actions";

type Props = {
  slug: string;
  businessName: string;
  brandColor: string;
  tableNumber: string;
  tableLabel: string;
  categories: { id: string; name: string }[];
};

type Screen =
  | { kind: "form" }
  | { kind: "thanks-google"; url: string; feedbackId: string }
  | { kind: "thanks-internal"; rating: number };

export function SurveyForm({
  slug,
  businessName,
  brandColor,
  tableNumber,
  tableLabel,
  categories,
}: Props) {
  const [overall, setOverall] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [contactType, setContactType] = useState<ContactType>("telefon");
  const [consent, setConsent] = useState(false);
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
      <ThanksShell brandColor={brandColor} businessName={businessName}>
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
      <ThanksShell brandColor={brandColor} businessName={businessName}>
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
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-6 ${
        basladi
          ? "pb-32"
          : // İlk ekranda kart yukarıda kalır, alttaki boşluk da güven veren
            // bir notla kapanır — böylece ekran "yarım kalmış" görünmüyor.
            "min-h-[calc(100dvh-11rem)]"
      }`}
    >
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-center text-[15px] text-slate-600">
          Bugünkü deneyiminizi genel olarak nasıl buldunuz?
        </p>
        <div className="mt-5">
          <StarRating name="overall" value={overall} onChange={setOverall} size="lg" />
        </div>
        {!basladi ? (
          <p className="mt-4 text-center text-xs text-slate-400">
            Bir yıldıza dokunun
          </p>
        ) : null}
      </section>

      {!basladi ? (
        <p className="mt-auto text-center text-xs leading-relaxed text-slate-400">
          Görüşünüz doğrudan {businessName} sorumlusuna iletilir.
          <br />
          Ad soyad sorulmaz, isim vermek zorunda değilsiniz.
        </p>
      ) : null}

      {overall > 0 && categories.length > 0 ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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

      {overall > 0 ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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
}: {
  children: React.ReactNode;
  brandColor: string;
  businessName: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
        style={{ backgroundColor: brandColor }}
        aria-hidden="true"
      >
        ✓
      </div>
      <div className="mt-5">{children}</div>
      <p className="mt-8 text-xs text-slate-400">{businessName}</p>
    </div>
  );
}
