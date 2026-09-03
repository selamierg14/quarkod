/**
 * İskelet (skeleton) yükleme bloğu.
 *
 * Önceden her liste "Yükleniyor…" metniyle boş bir ekran gösteriyordu —
 * kullanıcı bir şeyin BOZUK mu yoksa YÜKLENİYOR mu olduğunu ancak birkaç
 * saniye sonra anlıyordu. İskelet, gelecek içeriğin KABA HATLARINI hemen
 * gösterip "sayfa çalışıyor, veri geliyor" hissini anında veriyor.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

/**
 * Genel amaçlı kart-şeklinde iskelet listesi — Cüzdan, Profil, Bildirimler
 * gibi "satır satır kart" yapısındaki ekranlarda tek tek özel bir iskelet
 * tasarlamak yerine kullanılıyor. Piksel piksel birebir taklit değil,
 * kabaca aynı yükseklikte bloklar — amaç "içerik geliyor" hissi.
 */
export function KartListesiIskeleti({ adet = 3 }: { adet?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: adet }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
