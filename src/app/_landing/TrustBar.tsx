import { Clock, Languages, MailWarning, ShieldCheck } from "lucide-react";

/**
 * Hero'nun hemen altındaki güven bandı.
 *
 * Rakiplerin hepsinde bir "sosyal kanıt" bandı var; ama çoğu "5000+ müşteri"
 * gibi doğrulanamayan sayılar kullanıyor. Yeni bir ürün olarak öyle bir
 * iddiada bulunmuyoruz — bunun yerine ürünün gerçekten ölçülebilir
 * nitelikleriyle güven veriyoruz. Hepsi doğrulanabilir, hiçbiri şişirme değil.
 */
const METRIKLER = [
  { icon: Clock, deger: "30 sn", etiket: "Anket süresi" },
  { icon: MailWarning, deger: "Anında", etiket: "Düşük puan e-postası" },
  { icon: Languages, deger: "4 dil", etiket: "Müşteri ekranı (TR/EN/AR/RU)" },
  { icon: ShieldCheck, deger: "KVKK", etiket: "Uyumlu veri işleme" },
];

export function TrustBar() {
  return (
    <section className="border-y border-line bg-surface/60">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-6 px-5 py-8 sm:grid-cols-4">
        {METRIKLER.map(({ icon: Icon, deger, etiket }) => (
          <div key={etiket} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <dt className="text-lg font-semibold text-ink tabular">{deger}</dt>
              <dd className="text-caption text-ink-muted">{etiket}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
