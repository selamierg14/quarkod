import { ChevronDown, HelpCircle } from "lucide-react";
import { Eyebrow } from "./Eyebrow";

const SORULAR = [
  {
    s: "Kredi kartı bilgisi vermem gerekiyor mu?",
    c: "Hayır. Deneme başlarken kart bilgisi istemiyoruz; 7 gün sonunda dilediğiniz paketi seçerek kesintisiz devam edebilirsiniz.",
  },
  {
    s: "Deneme süresi bitince ne oluyor?",
    c: "Hesabınız pasif hale gelir, verileriniz saklı kalır. İstediğiniz paketi seçip devam edebilirsiniz.",
  },
  {
    s: "Kaç şube ekleyebilirim?",
    c: "Giriş ve Orta paketler tek şube içindir. İleri paket, bölge yöneticisi rolüyle sınırsız şubeyi tek panelden yönetmenizi sağlar.",
  },
  {
    s: "QR menü zorunlu mu?",
    c: "Hayır, QR menü ayrı bir modül; işletmenize göre açıp kapatabilirsiniz. Anket ve puanlama sistemi tek başına da çalışır.",
  },
  {
    s: "Verilerim KVKK'ya uygun mu saklanıyor?",
    c: "Evet. Pazarlama izinleri İYS'ye uygun tutulur, panel üzerindeki her işlem denetim kaydına düşer.",
  },
];

export function Faq() {
  return (
    <section id="sss" className="mx-auto max-w-3xl px-5 py-20">
      <Eyebrow icon={HelpCircle}>Sık sorulan sorular</Eyebrow>
      <h2 className="mt-3 text-display font-semibold text-ink">Merak edilenler</h2>

      <div className="mt-8 flex flex-col divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
        {SORULAR.map((q) => (
          <details key={q.s} className="group p-5 open:bg-brand-soft/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
              {q.s}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180 group-open:text-brand"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 text-small text-ink-muted">{q.c}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
