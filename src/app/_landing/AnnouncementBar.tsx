import { Sparkles } from "lucide-react";

/**
 * Header'ın üstündeki ince duyuru şeridi.
 *
 * Rakip tanıtım sitelerinin çoğunda bulunan bu şerit, ilk ekranda "risk
 * yok" mesajını verir. İçerik abartısız: yalnızca gerçekten doğru olan
 * satış argümanları — uydurma indirim ya da sayaç yok.
 */
export function AnnouncementBar() {
  return (
    <div className="bg-ink text-white">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-5 py-2 text-center text-caption font-medium">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
        7 gün ücretsiz — kredi kartı istemiyoruz. Kurulum 2 dakika, ilk QR kodunuz
        hazır.
      </p>
    </div>
  );
}
