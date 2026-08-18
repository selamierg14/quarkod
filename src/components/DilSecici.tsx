"use client";

import { DILLER, DIL_LISTESI } from "@/lib/diller";
import { useDil } from "./DilSaglayici";

/**
 * Hero'nun sağ üstündeki dil şeridi.
 *
 * Açılır menü yerine düz kod listesi: turist ekranı iki saniye tarıyor,
 * "TR EN AR RU" tek bakışta anlaşılıyor ve fazladan bir dokunuş
 * gerektirmiyor. Dört dil bu genişliğe sığdığı sürece bu doğru biçim.
 */
export function DilSecici() {
  const { dil, setDil, t } = useDil();

  return (
    <div
      role="group"
      aria-label={t("dil.sec")}
      // dir="ltr": sıra Arapçada da aynı kalsın, kullanıcı aradığı kodu
      // her dilde aynı yerde bulsun.
      dir="ltr"
      className="absolute top-3 right-3 z-20 flex gap-0.5 rounded-full bg-black/25 p-0.5 ring-1 ring-white/20 backdrop-blur-sm"
    >
      {DIL_LISTESI.map((kod) => {
        const secili = kod === dil;
        return (
          <button
            key={kod}
            type="button"
            lang={kod}
            aria-pressed={secili}
            aria-label={DILLER[kod].ad}
            onClick={() => setDil(kod)}
            className={`rounded-full px-2 py-1 text-[11px] leading-none font-semibold transition ${
              secili ? "bg-white text-ink" : "text-white/75 hover:text-white"
            }`}
          >
            {DILLER[kod].kisa}
          </button>
        );
      })}
    </div>
  );
}
