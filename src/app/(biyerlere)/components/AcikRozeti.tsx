import { Clock } from "lucide-react";

/**
 * "Şu an açık / kapalı" rozeti.
 *
 * ÜÇÜNCÜ DURUM ÖNEMLİ: saati girilmemiş mekanda hiçbir şey çizilmiyor —
 * "kapalı" yazmak yalan söylemek ve kullanıcıyı o mekandan vazgeçirmek
 * olurdu. Bilmediğimizi söylemek yerine susmak, yanlış bilgi vermekten iyi.
 */
export function AcikRozeti({
  durum,
  sonrakiAcilis,
  boyut = "normal",
}: {
  durum: "acik" | "kapali" | "bilinmiyor";
  sonrakiAcilis?: string | null;
  boyut?: "normal" | "kucuk";
}) {
  if (durum === "bilinmiyor") return null;

  const acik = durum === "acik";
  const olcu = boyut === "kucuk" ? "text-[11px] px-1.5 py-0.5" : "text-caption px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${olcu} ${
        acik ? "bg-[#14532D]/60 text-[#6EE7A8]" : "bg-white/5 text-gray-400"
      }`}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      {acik ? "Açık" : sonrakiAcilis ? `Kapalı · ${sonrakiAcilis}` : "Kapalı"}
    </span>
  );
}
