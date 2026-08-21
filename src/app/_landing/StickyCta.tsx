import Link from "next/link";
import { Phone, Sparkles } from "lucide-react";
import { iletisimTelefonu, telefonHref } from "@/lib/site";

/**
 * Mobilde ekranın altına sabitlenen çağrı çubuğu.
 *
 * Tanıtım sayfası uzun; telefondan okuyan biri "denemek istiyorum" dediği
 * anda yukarı kaydırıp menüdeki düğmeyi aramak zorunda kalıyordu. Çubuk
 * yalnızca mobilde çıkıyor — masaüstünde header zaten hep görünür.
 *
 * Telefon numarası tanımlı değilse arama düğmesi hiç basılmıyor: çalışmayan
 * bir numara göstermek, hiç göstermemekten kötü.
 */
export function StickyCta() {
  const tel = iletisimTelefonu();

  return (
    <div className="print-hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {tel ? (
          <a
            href={telefonHref(tel)}
            className="flex flex-1 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 py-3 text-small font-semibold text-ink-soft transition active:scale-[0.99]"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Bizi arayın
          </a>
        ) : null}
        <Link
          href="/deneme"
          className="flex flex-1 items-center justify-center gap-2 rounded-control bg-brand px-4 py-3 text-small font-semibold text-brand-ink shadow-card transition active:scale-[0.99]"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          7 gün ücretsiz dene
        </Link>
      </div>
    </div>
  );
}
