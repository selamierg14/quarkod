import { ListChecks } from "lucide-react";
import { Eyebrow } from "./Eyebrow";

const ADIMLAR = [
  {
    no: "1",
    title: "Kayıt olun",
    desc: "İşletme bilgilerinizi girin, hesabınız saniyeler içinde açılır.",
  },
  {
    no: "2",
    title: "QR'ı basın",
    desc: "İlk masanızın QR kodu hazır olur; PDF olarak indirip masalara yapıştırın.",
  },
  {
    no: "3",
    title: "Müşteri puanlasın",
    desc: "Müşteri telefonuyla QR'ı okutur, 30 saniyede anketi doldurur.",
  },
  {
    no: "4",
    title: "Siz yönetin",
    desc: "Panelden anlık bildirimleri, raporları ve menüyü yönetin.",
  },
];

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="bg-sunken/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Eyebrow icon={ListChecks}>Nasıl çalışır</Eyebrow>
        <h2 className="mt-3 text-display font-semibold text-ink">4 adımda kurulum, 2 dakika</h2>

        <div className="relative mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-[2.6rem] hidden h-px bg-line lg:block"
          />
          {ADIMLAR.map((s) => (
            <div
              key={s.no}
              className="relative rounded-card bg-surface p-5 shadow-card ring-1 ring-line transition-all duration-200 hover:-translate-y-1 hover:shadow-raised"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-small font-semibold text-brand-ink">
                {s.no}
              </span>
              <h3 className="mt-4 text-title font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-small text-ink-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
