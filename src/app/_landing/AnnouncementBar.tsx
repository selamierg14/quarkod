import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Header'ın üstündeki ince duyuru şeridi.
 *
 * Eskiden düz metindi: ilk ekranın en üstünde duran, tıklanamayan bir
 * cümle. Aynı yeri kaplayıp bir işe yaramıyordu — artık kendisi bir çağrı
 * düğmesi ve sayfanın en üst noktasından denemeye götürüyor. İçerik
 * abartısız: yalnızca gerçekten doğru olan satış argümanları.
 */
export function AnnouncementBar() {
  return (
    <div className="bg-ink text-white">
      <Link
        href="/deneme"
        className="group mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-5 py-2.5 text-center text-caption font-medium transition-colors hover:bg-white/5"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
        <span>7 gün ücretsiz — kredi kartı istemiyoruz.</span>
        <span className="text-white/70">Kurulum 2 dakika, ilk QR kodunuz hazır.</span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand">
          Hemen başla
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>
    </div>
  );
}
